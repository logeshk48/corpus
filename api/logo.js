// Corpus logo proxy: runs as a Vercel serverless function at /api/logo.
//   ?d=ppfas.com   that website's icon (PNG), cached for 30 days at the edge
// The phone asks our own server, not Google, so no outside service learns which funds or stocks you hold.
// Only a domain comes in (no user data); anything that isn't a plain domain is refused.
const OK = /^(?=.{4,80}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const d = String((req.query && req.query.d) || '').toLowerCase();
  if (!OK.test(d)) return res.status(400).end();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`, { signal: ctl.signal });
    const type = r.headers.get('content-type') || '';
    // Google answers 404 with a grey globe when a site has no icon: treat that as "no logo"
    if (!r.ok || !type.startsWith('image/')) {
      res.setHeader('Cache-Control', 's-maxage=86400');
      return res.status(404).end();
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000');
    return res.status(200).send(buf);
  } catch {
    return res.status(502).end();
  } finally {
    clearTimeout(t);
  }
}
module.exports = handler;
