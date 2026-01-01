// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const { buildNatalChart } = require('./astrology');
const { harmonicMatchScore } = require('./harmonicMatch'); // NEW

const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// OpenAI client
// --------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --------------------
// Helpers
// --------------------
function loadPrompt(botName) {
  const safeName = (botName || 'dating')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  const promptPath = path.join(__dirname, 'prompts', `${safeName}.txt`);

  if (!fs.existsSync(promptPath)) {
    return fs.readFileSync(path.join(__dirname, 'prompts', 'dating.txt'), 'utf8');
  }

  return fs.readFileSync(promptPath, 'utf8');
}

// --------------------
// Health check
// --------------------
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AI backend running' });
});

// --------------------
// Chat endpoint
// --------------------
app.post('/chat', async (req, res) => {
  try {
    const { message, bot } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const systemPrompt = loadPrompt(bot);

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    res.json({ reply: completion.choices?.[0]?.message?.content || '' });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat error' });
  }
});

// --------------------
// AI Profile Improver
// --------------------
app.post('/ai/profile-improve', async (req, res) => {
  try {
    const { profile_text } = req.body;
    if (!profile_text) return res.status(400).json({ error: 'profile_text is required' });

    const systemPrompt = `
You are an AI Profile Assistant for a dating app.

Rewrite the user's profile to be warm, honest, specific, and grounded.
Do NOT invent facts. Do NOT exaggerate.

Return JSON only:
{
  "suggested_profile": "...",
  "why_this_works": ["..."],
  "optional_variations": ["..."]
}
`.trim();

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: profile_text }
      ],
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || '';

    if (raw.startsWith('{')) return res.json(JSON.parse(raw));

    res.json({
      suggested_profile: raw,
      why_this_works: [],
      optional_variations: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile improve failed' });
  }
});

// --------------------
// Astrology Match (Sun-sign MVP)
// --------------------
function getSunSign(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d)) return null;

  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Aries';
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Taurus';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Gemini';
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Cancer';
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Leo';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Virgo';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Libra';
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Scorpio';
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Sagittarius';
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Capricorn';
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Aquarius';
  if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) return 'Pisces';
  return null;
}

function elementOf(sign) {
  const map = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water'
  };
  return map[sign];
}

app.post('/match/astrology', (req, res) => {
  const { dobA, dobB } = req.body;
  if (!dobA || !dobB) return res.status(400).json({ error: 'dobA and dobB required' });

  const signA = getSunSign(dobA);
  const signB = getSunSign(dobB);
  if (!signA || !signB) return res.status(400).json({ error: 'Invalid date format' });

  res.json({
    ok: true,
    signA,
    signB,
    elementA: elementOf(signA),
    elementB: elementOf(signB),
    score: 75,
    reason: 'Sun-sign compatibility (MVP)'
  });
});

// --------------------
// Natal chart endpoint
// --------------------
app.post('/astrology/chart', async (req, res) => {
  try {
    const { date, time, place, lat, lon, houseSystem } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: 'date and time required (YYYY-MM-DD, HH:mm)' });
    }

    const chart = await buildNatalChart({ date, time, place, lat, lon, houseSystem });
    if (!chart.ok) return res.status(400).json(chart);

    res.json(chart);
  } catch (err) {
    console.error('Chart error:', err);
    res.status(500).json({ error: 'chart_failed', message: err.message });
  }
});

// --------------------
// Harmonic Match endpoint (Advanced - v1)
// --------------------
// Expects:
// {
//   "personA": { "date":"YYYY-MM-DD","time":"HH:mm","lat":-33.8,"lon":151.2, "place":"optional" },
//   "personB": { "date":"YYYY-MM-DD","time":"HH:mm","lat":-33.8,"lon":151.2, "place":"optional" },
//   "harmonics": [7,11,17],          // optional
//   "orbDeg": 3                      // optional
// }
app.post('/match/harmonic', async (req, res) => {
  try {
    const { personA, personB, harmonics = [7, 11, 17], orbDeg = 3 } = req.body;

    if (!personA || !personB) {
      return res.status(400).json({ error: 'personA and personB required' });
    }
    if (!personA.date || !personA.time || (!personA.place && (personA.lat == null || personA.lon == null))) {
      return res.status(400).json({ error: 'personA requires date,time and (place OR lat/lon)' });
    }
    if (!personB.date || !personB.time || (!personB.place && (personB.lat == null || personB.lon == null))) {
      return res.status(400).json({ error: 'personB requires date,time and (place OR lat/lon)' });
    }

    const chartA = await buildNatalChart(personA);
    const chartB = await buildNatalChart(personB);

    if (!chartA.ok) return res.status(400).json({ error: 'chartA_failed', details: chartA });
    if (!chartB.ok) return res.status(400).json({ error: 'chartB_failed', details: chartB });

    const result = harmonicMatchScore({ chartA, chartB, harmonics, orbDeg });

    res.json({
      ok: true,
      harmonics,
      orbDeg,
      score10: result.score10,
      breakdown: result.breakdown,
      notes: result.notes
    });
  } catch (err) {
    console.error('Harmonic match error:', err);
    res.status(500).json({ error: 'harmonic_match_failed', message: err.message });
  }
});

// --------------------
// Server start
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
