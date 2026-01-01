// astrology.js
const sweImport = require('sweph');
const swe = sweImport.default || sweImport;

// Some builds export constants under `constants`
const C = swe.constants || swe;

// Function name compatibility (swe_* vs non-prefixed)
const pickFn = (...names) => {
  for (const n of names) if (typeof swe[n] === 'function') return swe[n];
  return null;
};

const setEphePath = pickFn('swe_set_ephe_path', 'set_ephe_path');
const julday     = pickFn('swe_julday', 'julday');
const calcUt     = pickFn('swe_calc_ut', 'calc_ut');
const houses     = pickFn('swe_houses', 'houses');

if (!julday || !calcUt || !houses) {
  console.error('SWE EXPORT SHAPE:', Object.keys(swe));
  throw new Error('Swiss Ephemeris functions missing (julday/calc_ut/houses)');
}

// Swiss Ephemeris init (MOSEPH-safe)
try {
  if (setEphePath) setEphePath('');
} catch (e) {
  console.error('set_ephe_path failed:', e);
}


const tzlookup = require('tz-lookup');
const NodeGeocoder = require('node-geocoder');
const { DateTime } = require('luxon');


// --------------------
// Geocoder (OSM/Nominatim via node-geocoder)
// --------------------
const geocoder = NodeGeocoder({
  provider: 'openstreetmap', // respects OSM/Nominatim usage policy
});

// --------------------
// Swiss Ephemeris setup
// --------------------
// You can use MOSEPH (built-in) to avoid shipping ephemeris files.
// For best accuracy, you’d set an ephe path to real files.
const BASE_FLAGS =
  C.SEFLG_SPEED |
  C.SEFLG_MOSEPH;

// If you want no ephe files, swap SWIEPH for MOSEPH:
// const BASE_FLAGS = swe.SEFLG_SPEED | swe.SEFLG_MOSEPH;

const PLANETS = [
  { key: 'Sun', id: C.SE_SUN },
  { key: 'Moon', id: C.SE_MOON },
  { key: 'Mercury', id: C.SE_MERCURY },
  { key: 'Venus', id: C.SE_VENUS },
  { key: 'Mars', id: C.SE_MARS },
  { key: 'Jupiter', id: C.SE_JUPITER },
  { key: 'Saturn', id: C.SE_SATURN },
  { key: 'Uranus', id: C.SE_URANUS },
  { key: 'Neptune', id: C.SE_NEPTUNE },
  { key: 'Pluto', id: C.SE_PLUTO },
];




// --------------------
// Utilities
// --------------------
function norm360(x) {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}

function signOfLongitude(lon) {
  const signs = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ];
  const idx = Math.floor(norm360(lon) / 30);
  return signs[idx];
}

function degInSign(lon) {
  return norm360(lon) % 30;
}

function houseOfLongitude(lon, houseCusps) {
  // houseCusps: 1..12 in degrees (array length 13 with index 1..12)
  // This is a simple approach; house boundary wrap-around needs care.
  // We'll do a robust wrap-aware search.
  const L = norm360(lon);
  const cusps = houseCusps.slice(1, 13).map(norm360);

  // Build intervals [cusp[i], cusp[i+1]) with wrap handling
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    if (start <= end) {
      if (L >= start && L < end) return i + 1;
    } else {
      // wraps past 360
      if (L >= start || L < end) return i + 1;
    }
  }
  return null;
}

async function geocodePlace(place) {
  const res = await geocoder.geocode(place);
  if (!res || !res.length) return null;
  return { lat: res[0].latitude, lon: res[0].longitude, label: res[0].formattedAddress || place };
}

function toUtcFromLocal({ date, time, tz }) {
  // date: YYYY-MM-DD, time: HH:mm (24h)
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: tz });
  if (!dt.isValid) return null;
  return dt.toUTC();
}

function julianDayFromUtc(utcDt) {
  // Swiss Ephemeris uses UTC time for swe_calc_ut.
  // Convert to Julian Day (UT).
  // swe_julday(year, month, day, hour, gregflag)
  const y = utcDt.year;
  const m = utcDt.month;
  const d = utcDt.day;
  const hour = utcDt.hour + utcDt.minute / 60 + utcDt.second / 3600;
  return julday(y, m, d, hour, C.SE_GREG_CAL);
}

function calcHousesAndAngles(jdUt, lat, lon, houseSystem = 'P') {
  try {
    const result = houses(jdUt, lat, lon, houseSystem);

        // Support multiple return shapes from different wrappers:
    // A) [cusps, ascmc]
    // B) { cusps, ascmc }
    // C) { flag, data: { houses: [...12], points: [...] } }
    let cusps = null;
    let ascmc = null;

    if (Array.isArray(result)) {
      cusps = result[0];
      ascmc = result[1];
    } else if (result && typeof result === 'object') {
      // NEW: sweph wrapper shape
      if (result.data && Array.isArray(result.data.houses) && Array.isArray(result.data.points)) {
        // normalize cusps to index 1..12 (your downstream expects slice(1,13))
        cusps = [null, ...result.data.houses];       // length 13, indexes 1..12
        const pts = result.data.points;

        // points[0] looks like ASC, points[1] looks like MC in your logs
        ascmc = [pts[0], pts[1], ...pts.slice(2)];
      } else {
        cusps = result.cusps || result.cusp || null;
        ascmc = result.ascmc || result.angles || null;
      }
    }

    if (!Array.isArray(cusps) || cusps.length < 13 || !Array.isArray(ascmc)) {
      throw new Error(`invalid_houses_result: ${JSON.stringify(result).slice(0, 300)}`);
    }


    return {
      houseSystem,
      cusps,                // should be index 1..12 or 0..12 depending on wrapper
      ascendant: ascmc[0],  // ASC
      midheaven: ascmc[1],  // MC
    };
  } catch (err) {
    throw new Error(`houses_calc_failed: ${err.message}`);
  }
}



function calcPlanets(jdUt) {
  const out = {};

  for (const p of PLANETS) {
    try {
      const result = calcUt(jdUt, p.id, BASE_FLAGS);

          // Support multiple return shapes from sweph wrappers
      const raw =
  result?.xx ??
  result?.data?.xx ??
  result?.data?.position ??
  result?.data?.coords ??
  null;

// Accept normal arrays OR typed arrays
const xx = raw && (Array.isArray(raw) || ArrayBuffer.isView(raw))
  ? Array.from(raw)
  : null;

if (!xx || xx.length < 4) {
  // optional: log ONE sample for debugging
  // console.log('calc_ut result shape for', p.key, result);
  out[p.key] = { error: 'no_data' };
  continue;
}

const lon = xx[0];
const speedLon = xx[3];


      out[p.key] = {
        lon: norm360(lon),
        sign: signOfLongitude(lon),
        deg: degInSign(lon),
        retrograde: speedLon < 0,
      };
    } catch (err) {
      out[p.key] = { error: err.message || 'exception' };
    }
  }

  return out;
}


// --------------------
// Public API
// --------------------
async function buildNatalChart({
  date,       // 'YYYY-MM-DD'
  time,       // 'HH:mm'
  place,      // optional string
  lat, lon,   // optional numbers
  houseSystem = 'P',
}) {
  let coords = null;

  if (typeof lat === 'number' && typeof lon === 'number') {
    coords = { lat, lon, label: 'coords' };
  } else if (place) {
    coords = await geocodePlace(place);
    if (!coords) return { ok: false, error: 'geocode_failed' };
  } else {
    return { ok: false, error: 'location_required' };
  }

  const tz = tzlookup(coords.lat, coords.lon);

  const utcDt = toUtcFromLocal({ date, time, tz });
  if (!utcDt) return { ok: false, error: 'invalid_datetime' };

  const jdUt = julianDayFromUtc(utcDt);

  const houses = calcHousesAndAngles(jdUt, coords.lat, coords.lon, houseSystem);
  const planets = calcPlanets(jdUt);

  // add house placements
  for (const k of Object.keys(planets)) {
    if (planets[k]?.lon != null) {
      planets[k].house = houseOfLongitude(planets[k].lon, houses.cusps);
    }
  }

  return {
    ok: true,
    input: { date, time, place: coords.label, lat: coords.lat, lon: coords.lon, tz },
    utc: utcDt.toISO(),
    jdUt,
    angles: {
      ascendant: {
        lon: norm360(houses.ascendant),
        sign: signOfLongitude(houses.ascendant),
        deg: degInSign(houses.ascendant),
      },
      midheaven: {
        lon: norm360(houses.midheaven),
        sign: signOfLongitude(houses.midheaven),
        deg: degInSign(houses.midheaven),
      },
    },
    houses: {
      system: houses.houseSystem,
      cusps: houses.cusps.slice(1, 13).map((c) => ({
        lon: norm360(c),
        sign: signOfLongitude(c),
        deg: degInSign(c),
      })),
    },
    planets,
  };
}

module.exports = {
  buildNatalChart,
  signOfLongitude,
  norm360,
};
