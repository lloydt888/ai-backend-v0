// harmonicMatch.js

function norm360(x) {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}

function angDiff(a, b) {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d; // 0..180
}

// harmonic longitude transform: (lon * h) mod 360
function harmLon(lon, h) {
  return norm360(lon * h);
}

/**
 * v1 "harmonic resonance" score:
 * - transform planet longitudes into harmonic space (h)
 * - reward close conjunctions (within orbDeg) across a few key pairs
 * - accumulate across multiple harmonics, normalize 0..10
 */
function harmonicMatchScore({ chartA, chartB, harmonics = [7, 11, 17], orbDeg = 3 }) {
  // pick a small set of “relationship-relevant” points for v1
  const points = ['Sun', 'Moon', 'Venus', 'Mars', 'Saturn'];

  const getLon = (chart, key) => chart?.planets?.[key]?.lon;

  let raw = 0;
  const breakdown = [];

  for (const h of harmonics) {
    let hits = 0;
    let possible = 0;

    for (const p of points) {
      const a = getLon(chartA, p);
      const b = getLon(chartB, p);
      if (typeof a !== 'number' || typeof b !== 'number') continue;

      possible++;
      const da = harmLon(a, h);
      const db = harmLon(b, h);
      const d = angDiff(da, db);

      // score: closer = more points (simple ramp)
      if (d <= orbDeg) {
        hits++;
        raw += (orbDeg - d + 1); // e.g. within orb => 1..(orb+1)
      }
    }

    breakdown.push({
      harmonic: h,
      pointsChecked: possible,
      hitsWithinOrb: hits
    });
  }

  // Normalize raw score into 0..10
  // This scaling is intentionally conservative; you’ll tune after real data.
  const score10 = Math.max(0, Math.min(10, Number((raw / 6).toFixed(1))));

  const notes = [
    'v1 scoring rewards close harmonic conjunctions of same planets (Sun-Sun, Moon-Moon, etc.).',
    'Next upgrade: add cross-pairs (Sun–Moon, Venus–Mars), add composite/midpoint harmonics, and weights per harmonic.'
  ];

  return { score10, breakdown, notes };
}

module.exports = { harmonicMatchScore };
