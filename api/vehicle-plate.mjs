/**
 * Proxy server-side de la Boostr Chile Vehicle API (A-02).
 * La clave vive SOLO en process.env.BOOSTR_API_KEY (Vercel env) — nunca viaja al bundle.
 * Sin CORS headers: la respuesta no es legible desde otros orígenes.
 */
const PLATE_RE = /^[A-Z0-9]{5,7}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const plate = String(req.query.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!PLATE_RE.test(plate)) {
    return res.status(400).json({ error: 'INVALID_PLATE' });
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
