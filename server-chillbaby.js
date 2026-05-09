require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'chillbaby.txt'), 'utf8');

const CHILLBABY_URL_WHITELIST = new Set([
  'https://chillbabynaturals.com.au/collections/all',
  'https://chillbabynaturals.com.au/collections/nail-polish-gift-boxes',
  'https://chillbabynaturals.com.au/products/non-toxic-nail-polish-10-ml',
  'https://chillbabynaturals.com.au/products/summer-time-rainbow-nail-polish-gift-box',
  'https://chillbabynaturals.com.au/products/mermaid-magic-nail-polish-gift-box',
  'https://chillbabynaturals.com.au/products/summer-sunset-nail-polish-gift-box',
  'https://chillbabynaturals.com.au/products/non-toxic-nail-polish-glorious-sunset-gift-box-bundle',
  'https://chillbabynaturals.com.au/products/non-toxic-nail-polish-mermaid-magic-gift-box-bundle',
  'https://chillbabynaturals.com.au/products/non-toxic-nail-polish-summer-time-rainbow-gift-box-bundle',
  'https://chillbabynaturals.com.au/products/non-toxic-nail-polish-remover-serum',
  'https://chillbabynaturals.com.au/products/chill-baby-naturals-gift-card',
]);

const CHILLBABY_FALLBACK_URL = 'https://chillbabynaturals.com.au/collections/all';

function sanitizeChillbabyUrls(text) {
  return text.replace(/https?:\/\/chillbabynaturals\.com\.au[^\s)]*/g, (url) => {
    const clean = url.replace(/[.,;:!?'"]+$/, '');
    const trail = url.slice(clean.length);
    const safe = CHILLBABY_URL_WHITELIST.has(clean) ? clean : CHILLBABY_FALLBACK_URL;
    return safe + trail;
  });
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Chill Baby chat server running' });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages
    });

    let reply = completion.choices?.[0]?.message?.content || '';
    reply = sanitizeChillbabyUrls(reply);

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Chill Baby server listening on ${PORT}`);
});
