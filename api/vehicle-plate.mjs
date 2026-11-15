/**
 * Proxy server-side de la Boostr Chile Vehicle API (A-02).
 * La clave vive SOLO en process.env.BOOSTR_API_KEY (Vercel env) — nunca viaja al bundle.
 * Sin CORS headers: la respuesta no es legible desde otros orígenes.
 *
 * N-S2: antes este endpoint era anónimo — un script podía llamarlo en loop y
 * agotar la cuota diaria de la API paga (y enumerar patentes en serie). Ahora:
 *  1. Exige un Firebase ID token válido (Authorization: Bearer) verificado con
 *     el Admin SDK — solo sesiones de la red pueden consumir cuota oficial.
 *  2. Rate limit por uid (en memoria, por instancia de la función: cota
 *     defensiva, no un contador global; Vercel no da store compartido en plan
 *     Hobby). Excedido → 429 RATE_LIMITED.
 *
 * Credenciales (env de Vercel): BOOSTR_API_KEY + FIREBASE_SERVICE_ACCOUNT
 * (JSON completo o su base64). Si falta la segunda, responde 503: sin Admin
 * SDK no hay forma de autenticar, y el cliente muestra NO VERIFICADO (AUTH).
 */
const PLATE_RE = /^[A-Z0-9]{5,7}$/;

// Rate limit por uid: ventana de 60 s y tope diario (cuota Boostr ~500/día:
// 250 por uid deja margen para varias terminales de una misma sede).
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 20;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_MAX_PER_DAY = 250;

const rateMap = new Map();

function checkRateLimit(uid) {
  const now = Date.now();
  let entry = rateMap.get(uid);
  if (!entry || now - entry.dayStart >= DAY_WINDOW_MS) {
    entry = { windowStart: now, windowCount: 0, dayStart: now, dayCount: 0 };
    rateMap.set(uid, entry);
  }
  if (now - entry.windowStart >= RATE_WINDOW_MS) {
    entry.windowStart = now;
    entry.windowCount = 0;
  }

  // Barrido defensivo: el mapa no puede crecer sin límite.
  if (rateMap.size > 5000) {
    for (const [key, value] of rateMap) {
      if (now - value.windowStart > DAY_WINDOW_MS) rateMap.delete(key);
    }
  }

  entry.windowCount += 1;
  entry.dayCount += 1;
  if (entry.windowCount > RATE_MAX_PER_WINDOW || entry.dayCount > RATE_MAX_PER_DAY) {
    return false;
  }
  return true;
}

let adminCache = null;
async function getAdmin() {
  if (adminCache) return adminCache;
  const { default: admin } = await import('firebase-admin');
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) throw new Error('NO_CREDENTIALS');
  if (!raw.trim().startsWith('{')) {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }
  const cert = JSON.parse(raw);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(cert) });
  }
  adminCache = admin;
  return admin;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const plate = String(req.query.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!PLATE_RE.test(plate)) {
    return res.status(400).json({ error: 'INVALID_PLATE' });
  }

  // 1. Autenticación de la sesión (N-S2).
  let uid = null;
  try {
    const admin = await getAdmin();
    const header = req.headers.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!idToken) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    if (String(err?.message || err) === 'NO_CREDENTIALS') {
      return res.status(503).json({ error: 'AUTH_PROXY_MISCONFIGURED' });
    }
    return res.status(401).json({ error: 'UNAUTHENTICATED' });
  }

  // 2. Rate limit por uid.
  if (!checkRateLimit(uid)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'RATE_LIMITED' });
  }

  const apiKey = process.env.BOOSTR_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'API_KEY_NOT_CONFIGURED' });
  }

  let upstream;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    upstream = await fetch(`https://api.boostr.cl/vehicle/${plate}.json`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    return res.status(504).json({ error: 'UPSTREAM_TIMEOUT' });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type') || 'application/json';
  res.setHeader('Content-Type', contentType);
  try {
    const body = await upstream.text();
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: 'UPSTREAM_READ_ERROR' });
  }
}
