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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
