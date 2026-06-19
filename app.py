from flask import Flask, render_template, request, jsonify
import os, json, sqlite3
from groq import Groq
from datetime import datetime

app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ── Database ──────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect('glitchworld.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS thoughts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thought TEXT NOT NULL,
        top_bid INTEGER DEFAULT 10,
        bidder_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    if c.execute('SELECT COUNT(*) FROM thoughts').fetchone()[0] == 0:
        seeds = [
            ("What if silence had a color?", 45),
            ("Time moves slower when you're waiting for yourself", 120),
            ("Every deleted text was a door someone closed", 88),
            ("The internet remembers what we forget on purpose", 200),
            ("We are all just pending notifications", 67),
            ("Maybe the void stares back because it's lonely too", 33),
        ]
        c.executemany('INSERT INTO thoughts (thought, top_bid) VALUES (?, ?)', seeds)
    conn.commit()
    conn.close()

init_db()

# ── Groq helper ───────────────────────────────────────────
def ask_groq(system, prompt):
    r = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": prompt}],
        max_tokens=900,
        temperature=0.95
    )
    return r.choices[0].message.content.strip()

def safe_json(text):
    text = text.strip()
    if '```' in text:
        for part in text.split('```'):
            p = part.lstrip('json').strip()
            if p.startswith('{'):
                text = p
                break
    return json.loads(text)

# ── Routes ────────────────────────────────────────────────
@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/newspaper')
def newspaper():
    try:
        result = ask_groq(
            "You generate alternate reality newspaper content. Return ONLY valid JSON, no markdown.",
            '''{
  "timeline": "one line alt-reality description",
  "date": "fake timeline date",
  "city": "fake city or alternate city name",
  "headlines": [
    {"title": "big headline 1", "body": "2 sentences of alternate news"},
    {"title": "big headline 2", "body": "2 sentences of alternate news"},
    {"title": "small odd headline", "body": "1 sentence"}
  ],
  "weather": {"city": "non-existent city", "temp": "temp", "condition": "weird condition"},
  "ad": {"headline": "fake product", "tagline": "slogan from alternate world"}
}'''
        )
        return jsonify(safe_json(result))
    except Exception as e:
        app.logger.error(f"AI route failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/wiki')
def wiki():
    try:
        result = ask_groq(
            "You are FakePedia. Generate Wikipedia articles for things that don't exist. Return ONLY valid JSON.",
            '''{
  "title": "name of totally fictional thing",
  "type": "what kind of thing",
  "intro": "2-3 Wikipedia-style intro sentences",
  "sections": [
    {"heading": "Origin", "content": "2-3 sentences"},
    {"heading": "Characteristics", "content": "2-3 sentences"},
    {"heading": "Historical Impact", "content": "2-3 sentences"}
  ],
  "quick_facts": [
    {"label": "Founded", "value": "fake year"},
    {"label": "Location", "value": "fake place"},
    {"label": "Status", "value": "some status"}
  ],
  "categories": ["Fake Category 1", "Fake Category 2", "Fake Category 3"]
}'''
        )
        return jsonify(safe_json(result))
    except Exception as e:
        app.logger.error(f"AI route failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/archive')
def archive():
    try:
        result = ask_groq(
            "You are HighArchives. Generate records of fake events that changed history. Return ONLY valid JSON.",
            '''{
  "event_id": "ARC-XXXX",
  "title": "name of the fake historical event",
  "date": "specific historical date",
  "location": "specific location",
  "classification": "DECLASSIFIED or ALTERED or ERASED FROM RECORD",
  "impact": "MINOR or SIGNIFICANT or CIVILIZATION-ALTERING",
  "description": "3-4 sentences of what supposedly happened",
  "consequences": ["consequence 1", "consequence 2", "consequence 3"],
  "verification": "VERIFIED BY NONE or DISPUTED BY 3 GOVERNMENTS or ACCEPTED IN TIMELINE-7"
}'''
        )
        return jsonify(safe_json(result))
    except Exception as e:
        app.logger.error(f"AI route failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/thoughts')
def get_thoughts():
    conn = sqlite3.connect('glitchworld.db')
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM thoughts ORDER BY top_bid DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/thoughts/create', methods=['POST'])
def create_thought():
    thought = request.json.get('thought', '').strip()
    if not thought or len(thought) > 200:
        return jsonify({"error": "Invalid thought"}), 400
    conn = sqlite3.connect('glitchworld.db')
    conn.execute('INSERT INTO thoughts (thought) VALUES (?)', (thought,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/thoughts/bid', methods=['POST'])
def bid_thought():
    data = request.json
    tid, amount = data.get('id'), int(data.get('amount', 0))
    conn = sqlite3.connect('glitchworld.db')
    conn.row_factory = sqlite3.Row
    row = conn.execute('SELECT top_bid FROM thoughts WHERE id=?', (tid,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    if amount <= row['top_bid']:
        return jsonify({"error": f"Must exceed {row['top_bid']} Glitchz"}), 400
    conn.execute('UPDATE thoughts SET top_bid=?, bidder_count=bidder_count+1 WHERE id=?', (amount, tid))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
    
