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
// Prompt loader
// --------------------
function loadPrompt(botName) {
  // ✅ Default to diablo, not dating
  const safeName = (botName || 'diablo')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  const promptPath = path.join(__dirname, 'prompts', `${safeName}.txt`);

  if (!fs.existsSync(promptPath)) {
    // fallback to diablo if missing
    const fallback = path.join(__dirname, 'prompts', 'diablo.txt');
    if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf8');
    return fs.readFileSync(path.join(__dirname, 'prompts', 'dating.txt'), 'utf8');
  }

  return fs.readFileSync(promptPath, 'utf8');
}

// --------------------
// Diablo “rails” (lightweight server-side control)
// --------------------
// MVP in-memory sessions. For production / multiple instances, use Redis.
const sessions = new Map();

function isDiabloBot(botName = '') {
  const b = String(botName || '').toLowerCase();
  return b === 'diablo' || b.includes('diablo');
}

function getSessionKey(req) {
  // Best: pass a stable session_id from frontend (recommended)
  // Fallback: header, then IP+UA (imperfect but works for MVP)
  return (
    req.body.session_id ||
    req.headers['x-session-id'] ||
    `${req.ip}|${req.headers['user-agent'] || 'ua'}`
  );
}

function getState(key) {
  if (!sessions.has(key)) {
    sessions.set(key, {
      issue: null,
      suburb: null,
      urgency: null,
      name: null,
      phone: null
    });
  }
  return sessions.get(key);
}

function extractPhone(text = '') {
  // AU mobile: 04XXXXXXXX or +614XXXXXXXX (spaces ok)
  const compact = String(text).replace(/\s+/g, '');
  const m = compact.match(/(?:\+?61|0)4\d{8}/);
  return m ? m[0] : null;
}

function extractUrgency(text = '') {
  const t = String(text).toLowerCase();
  if (/\b(asap|urgent|immediately|right now|now)\b/.test(t)) return 'ASAP';
  if (/\b(today|tonight)\b/.test(t)) return 'Today';
  if (/\b(tomorrow)\b/.test(t)) return 'Tomorrow';
  if (/\b(this week|next few days)\b/.test(t)) return 'This week';
  return null;
}

function extractName(text = '') {
  // Very light heuristics: "Lloyd", "— Lloyd", "name: Lloyd"
  const raw = String(text).trim();
  const m1 = raw.match(/\bname\s*[:\-]\s*([A-Za-z]{2,})\b/i);
  if (m1) return m1[1];

  const m2 = raw.match(/[—\-]\s*([A-Za-z]{2,})\b/); // "0427... - Lloyd"
  if (m2) return m2[1];

  // If the message is a single word and looks like a name
  if (/^[A-Za-z]{2,}$/.test(raw)) return raw;

  return null;
}

function extractSuburb(text = '') {
  // Keep it simple: capture "in X", "suburb X", "at X"
  const t = String(text).trim();
  const m =
    t.match(/\b(?:suburb|in|at)\s+([A-Za-z][A-Za-z\s'-]{2,})\b/i) ||
    t.match(/\b([A-Za-z][A-Za-z\s'-]{2,})\s+(?:nsw|sydney)\b/i);

  if (!m) return null;

  // Clean trailing punctuation
  return m[1].replace(/[.,!?]$/g, '').trim();
}

function isEmergency(text = '') {
  const t = String(text).toLowerCase();

  // Include the big “don’t miss” danger signals
  const keywords = [
    'smoke',
    'sparks',
    'spark',
    'burning smell',
    'burning',
    'fire',
    'flames',
    'electric shock',
    'shocked',
    'tingle',
    'tingling',
    'hot switchboard',
    'switchboard hot',
    'hot to touch',
    'buzzing',
    'crackling',
    'arcing',
    'arc',
    'melt',
    'melting',
    'scorch',
    'scorched',
    'water near',
    'water leak',
    'flood',
    'wet power',
    'wet switchboard'
  ];

  return keywords.some((k) => t.includes(k));
}

function shouldSetIssueFromMessage(message = '') {
  const m = String(message).trim();
  if (m.length < 4) return false;

  // Avoid setting issue to vague “yes”, “ok”, etc.
  const low = m.toLowerCase();
  const junk = new Set(['yes', 'yep', 'ok', 'okay', 'sure', 'please', 'thanks', 'thank you']);
  if (junk.has(low)) return false;

  return true;
}

function updateSlotsFromMessage(state, message) {
  const phone = extractPhone(message);
  if (phone) state.phone = state.phone || phone;

  const urg = extractUrgency(message);
  if (urg) state.urgency = state.urgency || urg;

  const nm = extractName(message);
  if (nm) state.name = state.name || nm;

  const sub = extractSuburb(message);
  if (sub) state.suburb = state.suburb || sub;

  if (!state.issue && shouldSetIssueFromMessage(message)) {
    state.issue = message.trim();
  }
}

function nextQuestion(state) {
  // One question at a time, receptionist-style
  if (!state.issue) return 'What’s the electrical issue you need help with?';
  if (!state.suburb) return 'What suburb is the job in?';
  if (!state.urgency) return 'How urgent is it — ASAP, today, or this week?';
  if (!state.name) return 'What’s your name?';
  if (!state.phone) return 'What’s the best mobile number for our electrician to call you on?';
  return null;
}

function closingMessage() {
  return 'Awesome, thanks for your details! I’ve got everything I need. Our admin will give you a quick call soon to lock in a time. You can also reach us anytime on 0430 718 800 or 0476 386 813 ⚡';
}

function emergencyReply() {
  return (
    '⚠️ Thanks for telling me — this could be dangerous.\n\n' +
    'Please don’t touch the equipment again.\n\n' +
    'If there’s smoke, fire, or a burning smell, call 000 immediately.\n' +
    'If it’s safe, turn off the main power and keep everyone clear.\n\n' +
    'What suburb are you in so I can organise urgent help today?'
  );
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
    // ✅ Accept optional extras (session_id/page_context)
    const { message, bot, session_id, page_context } = req.body;

    if (!message) return res.status(400).json({ error: 'message is required' });

    const systemPrompt = loadPrompt(bot);
    const isDiablo = isDiabloBot(bot);

    // If not Diablo, keep original simple behaviour
    if (!isDiablo) {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      });

      return res.json({ reply: completion.choices?.[0]?.message?.content || '' });
    }

    // Diablo rails
    const sessionKey = getSessionKey(req);
    const state = getState(sessionKey);

    updateSlotsFromMessage(state, message);

    // Emergency short-circuit (call 000 + dispatch suburb)
    if (isEmergency(message)) {
      if (!state.issue && shouldSetIssueFromMessage(message)) state.issue = message.trim();
      return res.json({ reply: emergencyReply() });
    }

    // If we have everything, close
    const nq = nextQuestion(state);
    if (!nq) {
      return res.json({ reply: closingMessage() });
    }

    // Tiny runtime guide to prevent looping / assumptions while keeping prompt small
    const runtimeGuide = [
      'You are Diablo Electrical’s RECEPTIONIST (not a technician).',
      'Be calm, brief, and professional. Emojis sparingly.',
      'Ask ONE question only.',
      'Do not repeat questions or ask for info already provided.',
      `Your next question must be exactly: "${nq}"`,
      'If the user asked something, answer in 1 sentence max, then ask the next question.'
    ].join('\n');

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: runtimeGuide },
        { role: 'user', content: message }
      ],
      temperature: 0.4
    });

    const reply = completion.choices?.[0]?.message?.content || '';
    res.json({ reply });
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
