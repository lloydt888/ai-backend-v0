// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// ------------------
// Helpers (Astrology)
// ------------------
function getSunSign(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;

  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

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
  const eA = elementOf(signA);
  const eB = elementOf(signB);
  if (!eA || !eB) return { score: 0, reason: "Unknown sign." };

  if (eA === eB) return { score: 85, reason: "Same element = natural flow." };

  const pair = [eA, eB].sort().join("+");
  if (pair === "Air+Fire") return { score: 75, reason: "Fire + Air = chemistry." };
  if (pair === "Earth+Water") return { score: 75, reason: "Earth + Water = stability." };
  if (pair === "Fire+Water") return { score: 55, reason: "Intense but volatile." };
  if (pair === "Air+Earth") return { score: 55, reason: "Different speeds." };

  return { score: 60, reason: "Mixed but workable." };
}

// ------------------
// Routes
// ------------------
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AI backend running' });
});

app.post('/match/astrology', (req, res) => {
  const { dobA, dobB } = req.body || {};
  if (!dobA || !dobB) {
    return res.status(400).json({ error: 'dobA and dobB required' });
  }

  const signA = getSunSign(dobA);
  const signB = getSunSign(dobB);
  if (!signA || !signB) {
    return res.status(400).json({ error: 'Invalid DOB format' });
  }

  const { score, reason } = compatibilityScore(signA, signB);

  res.json({
    ok: true,
    signA,
    signB,
    elementA: elementOf(signA),
    elementB: elementOf(signB),
    score,
    reason
  });
});

// ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
