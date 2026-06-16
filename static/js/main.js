// ============================================================
// 404.glitchworld — main.js
// ============================================================

const loadingScreen = document.getElementById('loading-screen');
const portalScreen  = document.getElementById('portal-screen');
const appScreen     = document.getElementById('app-screen');
const staticOverlay = document.getElementById('static-overlay');

// ---------- boot sequence ----------
window.addEventListener('load', () => {
  setTimeout(() => {
    loadingScreen.classList.remove('active');
    portalScreen.classList.add('active');
  }, 2200);
});

// ---------- portal selection ----------
document.querySelectorAll('.portal-card').forEach(card => {
  card.addEventListener('click', () => openFeature(card.dataset.feature));
});

function openFeature(name){
  portalScreen.classList.remove('active');
  appScreen.classList.add('active');
  document.querySelectorAll('.feature-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById('view-' + name);
  view.classList.add('active');

  if(name === 'newspaper') startNewspaper();
  if(name === 'wiki')      startWiki();
  if(name === 'auction')   startAuction();
  if(name === 'archive')   startArchive();
}

// ---------- ESC REALITY — back to portal ----------
document.getElementById('escape-nav').addEventListener('click', () => {
  staticOverlay.classList.remove('firing');
  void staticOverlay.offsetWidth; // restart animation
  staticOverlay.classList.add('firing');
  setTimeout(() => {
    appScreen.classList.remove('active');
    document.querySelectorAll('.feature-view').forEach(v => v.classList.remove('active'));
    resetFeatureStates();
    portalScreen.classList.add('active');
  }, 420);
});

function resetFeatureStates(){
  document.getElementById('paper-stack-intro').classList.remove('done');
  document.getElementById('paper-stack-intro').style.display = '';
  document.getElementById('newspaper-wrap').classList.remove('show','slam');
  document.getElementById('wiki-morph-intro').classList.remove('done');
  document.getElementById('wiki-morph-intro').style.display = '';
  document.getElementById('wiki-page').classList.remove('show');
  document.getElementById('auction-intro').classList.remove('done');
  document.getElementById('auction-intro').style.display = '';
  document.getElementById('auction-page').classList.remove('show');
  document.getElementById('terminal-intro').classList.remove('done','tearing');
  document.getElementById('terminal-intro').style.display = '';
  document.getElementById('archive-page').classList.remove('show');
}

// ============================================================
// NEWSPAPER
// ============================================================
let currentPaperData = null;
let nextPaperData = null;
let curling = false, curlStart = 0, curlRaf = null;

async function startNewspaper(){
  const intro = document.getElementById('paper-stack-intro');
  const wrap  = document.getElementById('newspaper-wrap');

  currentPaperData = await fetchPaper();
  renderPaper(currentPaperData, 'newspaper-content');

  setTimeout(() => {
    intro.classList.add('done');
    wrap.classList.add('show','slam');
  }, 2300);

  setupCurlGesture();
  prefetchNextPaper();
}

async function fetchPaper(){
  try{
    const r = await fetch('/api/newspaper');
    return await r.json();
  }catch(e){
    return { timeline:'SIGNAL LOST', date:'??', city:'Unknown',
      headlines:[{title:'Transmission failed', body:'The timeline could not be reached.'}],
      weather:{city:'Static', temp:'--', condition:'interference'},
      ad:{headline:'Try again', tagline:'reality may have shifted'} };
  }
}

function renderPaper(data, targetId){
  const el = document.getElementById(targetId);
  const heads = (data.headlines || []).map((h,i) =>
    `<div class="np-headline ${i>0?'small':''}">${escapeHTML(h.title)}</div>
     <div class="np-body">${escapeHTML(h.body)}</div>`).join('<hr class="np-divider">');

  el.innerHTML = `
    <div class="np-masthead">
      <div class="np-name">${escapeHTML(data.timeline || 'The Parallel Gazette')}</div>
      <div class="np-meta"><span>${escapeHTML(data.date||'')}</span><span>${escapeHTML(data.city||'')}</span></div>
    </div>
    ${heads}
    <div class="np-ad">
      <div class="np-ad-title">${escapeHTML(data.ad?.headline||'')}</div>
      <div>${escapeHTML(data.ad?.tagline||'')}</div>
    </div>
    <div class="np-weather">☁ ${escapeHTML(data.weather?.city||'')} — ${escapeHTML(String(data.weather?.temp||''))} — ${escapeHTML(data.weather?.condition||'')}</div>
  `;
}

async function prefetchNextPaper(){
  nextPaperData = await fetchPaper();
  renderPaper(nextPaperData, 'newspaper-content-next');
}

function setupCurlGesture(){
  const page = document.getElementById('newspaper-page');
  const curl = document.getElementById('curl-layer');
  const HOLD_DELAY = 500;   // ms before curl starts
  const FULL_CURL   = 2500; // ms total hold to fully turn
  let pressTimer = null;
  let holdStartTime = 0;
  let active = false;

  function pointerDown(e){
    active = true;
    pressTimer = setTimeout(() => {
      if(!active) return;
      holdStartTime = performance.now();
      curlRaf = requestAnimationFrame(growCurl);
    }, HOLD_DELAY);
  }

  function growCurl(){
    if(!active) return;
    const elapsed = performance.now() - holdStartTime;
    const progress = Math.min(elapsed / (FULL_CURL - HOLD_DELAY), 1);
    applyCurl(progress);
    if(progress >= 1){
      finishTurn();
      return;
    }
    curlRaf = requestAnimationFrame(growCurl);
  }

  function applyCurl(p){
    const maxW = page.offsetWidth * 1.05;
    const maxH = page.offsetHeight * 1.05;
    curl.style.width  = (maxW * p) + 'px';
    curl.style.height = (maxH * p) + 'px';
    curl.style.opacity = Math.min(p * 1.4, 1);
    page.style.transform = `rotateY(${-p*6}deg)`;
  }

  function pointerUp(){
    active = false;
    clearTimeout(pressTimer);
    cancelAnimationFrame(curlRaf);
    const w = parseFloat(curl.style.width) || 0;
    const fullW = page.offsetWidth * 1.05;
    if(w / fullW < 0.98){
      snapBack();
    }
  }

  function snapBack(){
    curl.style.transition = 'width 0.35s ease, height 0.35s ease, opacity 0.35s ease';
    page.style.transition = 'transform 0.35s ease';
    curl.style.width = '0px';
    curl.style.height = '0px';
    curl.style.opacity = '0';
    page.style.transform = 'rotateY(0deg)';
    setTimeout(() => {
      curl.style.transition = '';
      page.style.transition = '';
    }, 360);
  }

  function finishTurn(){
    page.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    page.style.transform = 'rotateY(-90deg)';
    page.style.opacity = '0.2';
    setTimeout(() => {
      // swap content: next becomes current
      currentPaperData = nextPaperData;
      document.getElementById('newspaper-content').innerHTML =
        document.getElementById('newspaper-content-next').innerHTML;
      page.style.transition = '';
      page.style.transform = 'rotateY(0deg)';
      page.style.opacity = '1';
      curl.style.width = '0px';
      curl.style.height = '0px';
      curl.style.opacity = '0';
      prefetchNextPaper();
    }, 310);
  }

  page.addEventListener('pointerdown', pointerDown);
  page.addEventListener('pointerup', pointerUp);
  page.addEventListener('pointerleave', pointerUp);
  page.addEventListener('pointercancel', pointerUp);
}

// ============================================================
// FAKEPEDIA
// ============================================================
async function startWiki(){
  const intro = document.getElementById('wiki-morph-intro');
  const titleEl = document.getElementById('morph-title');
  const page = document.getElementById('wiki-page');

  const fakeTitles = ['Veltorian Empire','Quantum Noodles','Mount Elzarath','Loading_Article'];
  let i = 0;
  const cycle = setInterval(() => {
    titleEl.classList.remove('show');
    setTimeout(() => {
      i = (i+1) % fakeTitles.length;
      titleEl.textContent = fakeTitles[i];
      titleEl.classList.add('show');
    }, 200);
  }, 480);
  titleEl.classList.add('show');

  const data = await fetchWiki();

  setTimeout(() => {
    clearInterval(cycle);
    intro.classList.add('done');
    renderWiki(data);
    page.classList.add('show');
  }, 2200);
}

async function fetchWiki(){
  try{
    const r = await fetch('/api/wiki');
    return await r.json();
  }catch(e){
    return { title:'Signal Interruption', type:'Unknown phenomenon',
      intro:'This article could not be reconstructed from the archive.',
      sections:[], quick_facts:[], categories:[] };
  }
}

function renderWiki(data){
  const page = document.getElementById('wiki-page');
  const sections = (data.sections||[]).map(s =>
    `<div class="wk-section"><h3>${escapeHTML(s.heading)}</h3><p>${maybeGlitch(s.content)}</p></div>`).join('');
  const facts = (data.quick_facts||[]).map(f =>
    `<div><strong>${escapeHTML(f.label)}</strong><br>${escapeHTML(f.value)}</div>`).join('');
  const cats = (data.categories||[]).map(c => `<span class="wk-cat-tag">${escapeHTML(c)}</span>`).join('');

  page.innerHTML = `
    <div class="wk-facts">${facts}<div class="wk-broken-img">[image failed to load]</div></div>
    <div class="wk-title">${maybeGlitch(data.title)}</div>
    <div class="wk-type">${escapeHTML(data.type||'')}</div>
    <div class="wk-intro">${maybeGlitch(data.intro)}</div>
    ${sections}
    <div class="wk-cats">${cats}</div>
  `;
}

function maybeGlitch(text){
  if(!text) return '';
  const words = escapeHTML(text).split(' ');
  if(words.length > 4){
    const idx = Math.floor(words.length/2);
    words[idx] = `<span class="wk-glitch">${words[idx]}</span>`;
  }
  return words.join(' ');
}

// ============================================================
// BIDYOURWORD
// ============================================================
function getGlitchz(){
  return parseInt(localStorage.getItem('glitchz') || '500', 10);
}
function setGlitchz(v){
  localStorage.setItem('glitchz', v);
  const el = document.getElementById('glitchz-amount');
  if(el) el.textContent = v;
}

async function startAuction(){
  const intro = document.getElementById('auction-intro');
  const scramble = document.getElementById('bid-scramble');
  const page = document.getElementById('auction-page');

  const chars = 'XQ$#7K9Z!?GLITCHZ';
  let scrambleInterval = setInterval(() => {
    scramble.textContent = Array.from({length:14}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  }, 80);

  setTimeout(() => {
    clearInterval(scrambleInterval);
    scramble.textContent = '';
  }, 1300);

  setGlitchz(getGlitchz());

  const thoughts = await fetchThoughts();

  setTimeout(() => {
    intro.classList.add('done');
    page.classList.add('show');
    appScreen.classList.add('app-shake');
    setTimeout(() => appScreen.classList.remove('app-shake'), 400);
    renderThoughts(thoughts);
  }, 1900);
}

async function fetchThoughts(){
  try{
    const r = await fetch('/api/thoughts');
    return await r.json();
  }catch(e){ return []; }
}

function renderThoughts(thoughts){
  const list = document.getElementById('thought-list');
  list.innerHTML = thoughts.map(t => `
    <div class="thought-card">
      <div class="thought-text">${escapeHTML(t.thought)}</div>
      <div class="thought-meta">
        <span>top bid: ⟁ ${t.top_bid} · ${t.bidder_count} bidder${t.bidder_count===1?'':'s'}</span>
        <button class="bid-btn" data-id="${t.id}" data-min="${t.top_bid}">bid</button>
      </div>
    </div>`).join('') || '<p class="fetching">no thoughts on auction yet</p>';

  list.querySelectorAll('.bid-btn').forEach(btn => {
    btn.addEventListener('click', () => placeBid(btn));
  });
}

async function placeBid(btn){
  const min = parseInt(btn.dataset.min, 10);
  const balance = getGlitchz();
  const amountStr = prompt(`Enter bid (must exceed ${min} Glitchz, you have ${balance}):`);
  if(amountStr === null) return;
  const amount = parseInt(amountStr, 10);
  if(isNaN(amount) || amount <= min){ alert('Bid too low.'); return; }
  if(amount > balance){ alert('Not enough Glitchz.'); return; }

  const r = await fetch('/api/thoughts/bid', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ id: btn.dataset.id, amount })
  });
  const res = await r.json();
  if(res.error){ alert(res.error); return; }

  setGlitchz(balance - amount);
  const thoughts = await fetchThoughts();
  renderThoughts(thoughts);
}

document.getElementById('new-thought-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('new-thought-input');
  const val = input.value.trim();
  if(!val) return;
  await fetch('/api/thoughts/create', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ thought: val })
  });
  input.value = '';
  const thoughts = await fetchThoughts();
  renderThoughts(thoughts);
});

// ============================================================
// HIGHARCHIVES
// ============================================================
async function startArchive(){
  const intro = document.getElementById('terminal-intro');
  const termText = document.getElementById('terminal-text');
  const page = document.getElementById('archive-page');

  const bootLines = [
    '> ACCESSING FORBIDDEN ARCHIVE...',
    '> DECRYPTING FILES...',
    '> WARNING: THESE EVENTS NEVER HAPPENED',
    '> ERROR_404_REALITY_NOT_FOUND',
  ];

  const dataPromise = fetchArchive();

  let out = '';
  for(const line of bootLines){
    out = await typeLine(termText, out, line);
    await wait(160);
  }
  for(let i=0;i<3;i++){
    termText.textContent = out + '\n> ██████████ 99%...';
    await wait(300);
  }

  const data = await dataPromise;

  intro.classList.add('tearing');
  await wait(500);
  intro.classList.add('done');
  renderArchive(data);
  page.classList.add('show');
}

function typeLine(el, existing, line){
  return new Promise(resolve => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      el.textContent = existing + '\n' + line.slice(0,i);
      if(i >= line.length){
        clearInterval(iv);
        resolve(existing + '\n' + line);
      }
    }, 18);
  });
}
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchArchive(){
  try{
    const r = await fetch('/api/archive');
    return await r.json();
  }catch(e){
    return { event_id:'ARC-ERR0', title:'Record corrupted', date:'unknown',
      location:'unknown', classification:'ERASED FROM RECORD', impact:'UNKNOWN',
      description:'This archive entry could not be retrieved.', consequences:[],
      verification:'VERIFIED BY NONE' };
  }
}

function renderArchive(data){
  const page = document.getElementById('archive-page');
  const consequences = (data.consequences||[]).map(c => `<li>${escapeHTML(c)}</li>`).join('');
  page.innerHTML = `
    <div class="arc-id">${escapeHTML(data.event_id||'')}</div>
    <div class="arc-title">${escapeHTML(data.title||'')}</div>
    <div class="arc-row"><span class="arc-tag">${escapeHTML(data.classification||'')}</span><span class="arc-tag">${escapeHTML(data.impact||'')}</span></div>
    <div class="arc-row"><span>${escapeHTML(data.date||'')}</span><span>${escapeHTML(data.location||'')}</span></div>
    <div class="arc-desc">${escapeHTML(data.description||'')}</div>
    <ul class="arc-consequences">${consequences}</ul>
    <div class="arc-verify">${escapeHTML(data.verification||'')}</div>
  `;
}

// ---------- shared util ----------
function escapeHTML(str){
  if(str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
