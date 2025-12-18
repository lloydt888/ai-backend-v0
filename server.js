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
