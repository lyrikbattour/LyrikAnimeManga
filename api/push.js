// Notifications « Le défi du jour est dispo » (Web Push sans contenu chiffré : le service worker affiche le texte).
//  GET  /api/push?a=key    -> clé publique VAPID
//  POST /api/push?a=sub    -> enregistre un abonnement (corps = PushSubscription JSON)
//  POST /api/push?a=unsub  -> le supprime
//  GET  /api/push?a=cron   -> envoie la notification à tous les abonnés (Vercel Cron, une fois par jour maximum)
// Les clés VAPID sont dérivées côté serveur du secret BLOB_READ_WRITE_TOKEN : aucune clé n'est stockée dans le code.
const crypto = require('crypto');
const { put, del, list } = require('@vercel/blob');
const SUB = 'https://animedexfr.fr';
const N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');

const b64u = (b) => Buffer.from(b).toString('base64url');
function idOf(endpoint) { return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 40); }
function okEndpoint(e) { try { const u = new URL(e); return u.protocol === 'https:' && e.length < 1000; } catch (_) { return false; } }

let KEYS = null;
function keys() {
  if (KEYS) return KEYS;
  const seed = process.env.VAPID_SEED || process.env.BLOB_READ_WRITE_TOKEN;
  if (!seed) throw new Error('secret manquant');
  const raw = crypto.createHmac('sha256', 'animedex-vapid-v1').update(seed).digest();
  let d = (BigInt('0x' + raw.toString('hex')) % (N - 1n)) + 1n;
  const dBuf = Buffer.from(d.toString(16).padStart(64, '0'), 'hex');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.setPrivateKey(dBuf);
  const pub = ecdh.getPublicKey();
  const priv = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(dBuf), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
  KEYS = { pub: b64u(pub), priv };
  return KEYS;
}

function vapidJwt(audience) {
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUB }));
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key: keys().priv, dsaEncoding: 'ieee-p1363' });
  return head + '.' + body + '.' + b64u(sig);
}

async function sendOne(endpoint) {
  const aud = new URL(endpoint).origin;
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { TTL: '43200', Urgency: 'normal', 'Content-Length': '0', Authorization: 'vapid t=' + vapidJwt(aud) + ', k=' + keys().pub }
  });
  return r.status;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return null; } }
  return await new Promise((res) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 8000) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(d)); } catch (_) { res(null); } }); });
}

function parisDay() { return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date()); }

module.exports = async (req, res) => {
  const a = (req.query && req.query.a) || '';
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (a === 'key') return res.status(200).json({ key: keys().pub });

    if (a === 'sub' || a === 'unsub') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'POST attendu' });
      const b = await readBody(req);
      const endpoint = b && b.endpoint;
      if (!endpoint || !okEndpoint(endpoint)) return res.status(400).json({ error: 'abonnement invalide' });
      const path = 'push/' + idOf(endpoint) + '.json';
      if (a === 'unsub') { try { const l = await list({ prefix: path }); if (l.blobs[0]) await del(l.blobs[0].url); } catch (_) {} return res.status(200).json({ ok: true }); }
      await put(path, JSON.stringify({ endpoint, ts: Date.now() }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
      return res.status(200).json({ ok: true });
    }

    if (a === 'cron') {
      // Autorisé si le secret de Vercel Cron est présent, sinon une seule fois par jour (anti-spam)
      const auth = req.headers['authorization'] || '';
      const cronOk = process.env.CRON_SECRET && auth === 'Bearer ' + process.env.CRON_SECRET;
      const day = parisDay();
      const lastL = await list({ prefix: 'meta/last-' });
      if (!cronOk && lastL.blobs.some((b) => b.pathname === 'meta/last-' + day + '.txt')) return res.status(200).json({ skipped: 'déjà envoyé aujourd\'hui' });
      for (const b of lastL.blobs) { try { await del(b.url); } catch (_) {} }
      await put('meta/last-' + day + '.txt', day, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
      let cursor, sent = 0, gone = 0, failed = 0;
      do {
        const page = await list({ prefix: 'push/', cursor, limit: 500 });
        cursor = page.hasMore ? page.cursor : undefined;
        for (const blob of page.blobs) {
          try {
            const sub = await (await fetch(blob.url + '?t=' + Date.now())).json();
            const st = await sendOne(sub.endpoint);
            if (st === 404 || st === 410) { await del(blob.url); gone++; }
            else if (st >= 200 && st < 300) sent++; else failed++;
          } catch (_) { failed++; }
        }
      } while (cursor);
      return res.status(200).json({ sent, gone, failed });
    }
    return res.status(404).json({ error: 'action inconnue' });
  } catch (e) {
    return res.status(500).json({ error: 'erreur serveur' });
  }
};
