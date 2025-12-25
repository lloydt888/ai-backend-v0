// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Load system prompt from file
function loadPrompt(botName) {
  const safeName = (botName || 'dating')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  const promptPath = path.join(__dirname, 'prompts', `${safeName}.txt`);

  if (!fs.existsSync(promptPath)) {
    return fs.readFileSync(
      path.join(__dirname, 'prompts', 'dating.txt'),
      'utf8'
    );
  }

  return fs.readFileSync(promptPath, 'utf8');
}

// OpenAI client (API key stays in .env on server)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AI backend running' });
});

// Chat endpoint (calls OpenAI)
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const bot = req.body.bot;
    const systemPrompt = loadPrompt(bot);

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Body must include {"message":"text"}' });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });

    const reply = completion.choices?.[0]?.message?.content || '';
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error calling OpenAI' });
  }
});

// AI Profile Assistant
app.post('/ai/profile-improve', async (req, res) => {
  try {
    const { profile_text, tone = 'warm_grounded' } = req.body || {};
    // Astrology Match (birthdate-only MVP)
app.post('/match/astrology', (req, res) => {
  try {
    const { dob1, dob2 } = req.body || {};
    if (!dob1 || !dob2) {
      return res.status(400).json({ error: 'dob1 and dob2 are required (YYYY-MM-DD)' });
    }

    const sign1 = getZodiacSign(dob1);
    const sign2 = getZodiacSign(dob2);

    if (!sign1 || !sign2) {
      return res.status(400).json({ error: 'Invalid dob format. Use YYYY-MM-DD' });
    }

    // Simple compatibility: element-based (good enough for MVP)
    const result = compatibilityByElement(sign1, sign2);

    return res.json({
      dob1,
      dob2,
      sign1,
      sign2,
      ...result
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- helpers (paste below the route, anywhere in server.js) ---

function getZodiacSign(dobStr) {
  // dobStr: YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobStr);
  if (!m) return null;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);

  // Western Tropical Sun signs
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
  return null;
}

function elementOf(sign) {
  const fire = ['Aries','Leo','Sagittarius'];
  const earth = ['Taurus','Virgo','Capricorn'];
  const air = ['Gemini','Libra','Aquarius'];
  const water = ['Cancer','Scorpio','Pisces'];
  if (fire.includes(sign)) return 'Fire';
  if (earth.includes(sign)) return 'Earth';
  if (air.includes(sign)) return 'Air';
  if (water.includes(sign)) return 'Water';
  return 'Unknown';
}

function compatibilityByElement(sign1, sign2) {
  const e1 = elementOf(sign1);
  const e2 = elementOf(sign2);

  // Very simple MVP rules:
  // Fire+Air = strong, Earth+Water = strong, same element = good,
  // Fire+Water and Air+Earth = more friction, everything else = medium
  let score = 70;
  let label = 'Good';
  let reason = 'Decent natural compatibility.';

  const pair = `${e1}-${e2}`;
  const pair2 = `${e2}-${e1}`;

  if (e1 === e2) {
    score = 78; label = 'Very Good';
    reason = `Same element (${e1}) tends to “get” each other easily.`;
  } else if (pair === 'Fire-Air' || pair2 === 'Fire-Air') {
    score = 85; label = 'Excellent';
    reason = 'Fire inspires, Air fuels—high chemistry and momentum.';
  } else if (pair === 'Earth-Water' || pair2 === 'Earth-Water') {
    score = 85; label = 'Excellent';
    reason = 'Earth stabilises, Water softens—strong long-term harmony.';
  } else if (pair === 'Fire-Water' || pair2 === 'Fire-Water') {
    score = 58; label = 'Challenging';
    reason = 'Big feelings + big intensity—can be magnetic but volatile.';
  } else if (pair === 'Air-Earth' || pair2 === 'Air-Earth') {
    score = 60; label = 'Challenging';
    reason = 'Different speeds: Air wants change, Earth wants certainty.';
  }

  return { element1: e1, element2: e2, score, label, reason };
}


    if (!profile_text || typeof profile_text !== 'string') {
      return res.status(400).json({ error: 'profile_text is required' });
    }

    if (profile_text.length > 2000) {
      return res.status(400).json({ error: 'profile_text too long' });
    }

    const systemPrompt = `
You are an AI Profile Assistant for a dating app.

GOAL:
Rewrite the user's dating profile text to be warmer, clearer, more specific, and more authentic — without exaggeration, fabrication, or manipulation.

RULES:
- Do NOT invent facts, achievements, hobbies, traits, or lifestyles.
- Do NOT add anything that wasn’t implied by the user.
- No pickup lines. No coercion. No negging. No pressure language.
- Keep it human, grounded, emotionally intelligent.
- Avoid clichés unless the user wrote them and you improve them.
- Keep it concise.

OUTPUT FORMAT (JSON ONLY):
{
  "suggested_profile": "...",
  "why_this_works": ["...", "..."],
  "optional_variations": ["...", "..."]
}

STYLE:
Warm, calm, genuine. Light confidence. Not cheesy.
`.trim();

    const userMessage = `User profile text:\n${profile_text}\n\nTone: ${tone}\nReturn JSON only.`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || '';

    if (raw.startsWith('{') && raw.endsWith('}')) {
      return res.json(JSON.parse(raw));
    }

    return res.json({
      suggested_profile: raw,
      why_this_works: ['Improved clarity and warmth without exaggeration.'],
      optional_variations: []
    });

  } catch (err) {
    console.error('profile-improve error:', err);
    return res.status(500).json({ error: 'AI request failed' });
  }
});
// -------------------------------
// Astrology Match (Sun-sign v1)
// POST /match/astrology
// Body: { dobA: "YYYY-MM-DD", dobB: "YYYY-MM-DD" }
// -------------------------------
function getSunSign(dateStr) {
  // dateStr: YYYY-MM-DD
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;

  const m = d.getUTCMonth() + 1; // 1-12
  const day = d.getUTCDate();   // 1-31

  // Western tropical sun signs
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "Aries";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "Taurus";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "Gemini";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "Cancer";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "Leo";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "Virgo";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "Libra";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "Scorpio";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "Sagittarius";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "Capricorn";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "Aquarius";
  if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) return "Pisces";
  return null;
}

function elementOf(sign) {
  const map = {
    Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
    Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
    Gemini: "Air", Libra: "Air", Aquarius: "Air",
    Cancer: "Water", Scorpio: "Water", Pisces: "Water",
  };
  return map[sign] || null;
}

function compatibilityScore(signA, signB) {
  // Simple v1 logic:
  // same element = 85
  // Fire+Air or Earth+Water = 75
  // Fire+Water or Earth+Air = 55
  const eA = elementOf(signA);
  const eB = elementOf(signB);
  if (!eA || !eB) return { score: 0, reason: "Unknown sign/element." };

  if (eA === eB) return { score: 85, reason: `Same element (${eA}) = natural flow.` };

  const pair = [eA, eB].sort().join("+");
  if (pair === "Air+Fire") return { score: 75, reason: "Fire + Air = spark + ideas (high chemistry)." };
  if (pair === "Earth+Water") return { score: 75, reason: "Earth + Water = stability + depth (strong bond)." };

  if (pair === "Fire+Water") return { score: 55, reason: "Fire + Water can be intense—needs emotional skill." };
  if (pair === "Air+Earth") return { score: 55, reason: "Air + Earth can clash—needs patience + translation." };

  return { score: 60, reason: "Mixed dynamic—works with awareness." };
}

app.post("/match/astrology", (req, res) => {
  try {
    const { dobA, dobB } = req.body || {};
    if (!dobA || !dobB) {
      return res.status(400).json({ error: "dobA and dobB are required (YYYY-MM-DD)." });
    }

    const signA = getSunSign(dobA);
    const signB = getSunSign(dobB);

    if (!signA || !signB) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    const { score, reason } = compatibilityScore(signA, signB);

    return res.json({
      ok: true,
      dobA,
      dobB,
      signA,
      signB,
      elementA: elementOf(signA),
      elementB: elementOf(signB),
      score,
      reason,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
