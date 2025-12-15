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
      model: 'gpt-4.1-mini',
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
