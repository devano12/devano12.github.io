// Cloudflare Pages Advanced Mode worker — handles /api/* only (see _routes.json).
// Bindings: SITE (KV), ADMIN_PASSWORD (secret), SESSION_SECRET (secret)
const enc = new TextEncoder();
const JH = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const J = (o, s = 200, h) => new Response(JSON.stringify(o), { status: s, headers: { ...JH, ...h } });
const hex = (u) => [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64u = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i]; return r === 0; };
const cookie = (t) => `ds_session=${t}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
async function pwOk(env, pw) {
  const rec = await env.SITE.get('auth', 'json');
  if (rec && rec.salt && rec.hash) return same(enc.encode(hex(await hmac(env.SESSION_SECRET + ':' + rec.salt, pw))), enc.encode(rec.hash));
  if (!env.ADMIN_PASSWORD) return false;
  return same(await hmac(env.SESSION_SECRET, pw), await hmac(env.SESSION_SECRET, env.ADMIN_PASSWORD));
}
async function mk(env, ver) {
  if (ver === undefined) { const rec = await env.SITE.get('auth', 'json'); ver = (rec && rec.v) || 0; }
  const p = Date.now() + 7 * 864e5 + '.' + ver;
  return p + '.' + b64u(await hmac(env.SESSION_SECRET, p));
}
async function authed(req, env) {
  const m = /(?:^|;\s*)ds_session=([^;]+)/.exec(req.headers.get('cookie') || '');
  if (!m) return false;
  const [exp, ver, sig] = m[1].split('.');
  if (!sig || +exp < Date.now()) return false;
  const rec = await env.SITE.get('auth', 'json');
  if (String((rec && rec.v) || 0) !== ver) return false;
  return same(enc.encode(b64u(await hmac(env.SESSION_SECRET, exp + '.' + ver))), enc.encode(sig));
}
function sniff(u) {
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return 'image/gif';
  if (u[0] === 0x52 && u[1] === 0x49 && u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return 'image/webp';
  return null;
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname, m = req.method;
    if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      if (p === '/api/content' && m === 'GET') {
        const c = await env.SITE.get('content');
        return new Response(c || '{}', { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=20, stale-while-revalidate=120', 'x-content-type-options': 'nosniff' } });
      }
      let im = /^\/api\/img\/([a-f0-9]{8,32})$/.exec(p);
      if (im && (m === 'GET' || m === 'HEAD')) {
        const { value, metadata } = await env.SITE.getWithMetadata('img:' + im[1], 'arrayBuffer');
        if (!value) return J({ error: 'Not found' }, 404);
        return new Response(m === 'HEAD' ? null : value, { headers: { 'content-type': (metadata && metadata.type) || 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
      }
      if (p === '/api/me' && m === 'GET') return J({ auth: await authed(req, env) });

      if (m !== 'GET' && req.headers.get('x-admin') !== '1') return J({ error: 'Bad request' }, 400);

      if (p === '/api/login' && m === 'POST') {
        const ip = req.headers.get('cf-connecting-ip') || 'x', rk = 'rl:' + ip, n = +((await env.SITE.get(rk)) || 0);
        if (n >= 8) return J({ error: 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.' }, 429);
        let b = {}; try { b = await req.json(); } catch (e) {}
        if (typeof b.password === 'string' && b.password && (await pwOk(env, b.password))) {
          await env.SITE.delete(rk);
          return J({ ok: true }, 200, { 'set-cookie': cookie(await mk(env)) });
        }
        await env.SITE.put(rk, String(n + 1), { expirationTtl: 600 });
        return J({ error: 'Password salah' }, 401);
      }
      if (p === '/api/logout' && m === 'POST') return J({ ok: true }, 200, { 'set-cookie': 'ds_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });

      if (!(await authed(req, env))) return J({ error: 'Sesi berakhir, silakan login lagi.' }, 401);

      if (p === '/api/content' && m === 'PUT') {
        const t = await req.text();
        if (t.length > 400000) return J({ error: 'Konten terlalu besar' }, 413);
        let o; try { o = JSON.parse(t); } catch (e) { return J({ error: 'JSON tidak valid' }, 400); }
        if (!o || typeof o !== 'object' || Array.isArray(o)) return J({ error: 'Format konten salah' }, 400);
        const prev = await env.SITE.get('content');
        if (prev) await env.SITE.put('content:prev', prev);
        await env.SITE.put('content', JSON.stringify(o));
        return J({ ok: true });
      }
      if (p === '/api/backup' && m === 'GET') return J({ content: JSON.parse((await env.SITE.get('content:prev')) || 'null') });
      if (p === '/api/images' && m === 'GET') {
        const l = await env.SITE.list({ prefix: 'img:' });
        return J({ images: l.keys.map((k) => ({ id: k.name.slice(4), url: '/api/img/' + k.name.slice(4), ...(k.metadata || {}) })) });
      }
      if (p === '/api/upload' && m === 'POST') {
        const buf = await req.arrayBuffer();
        if (buf.byteLength < 100) return J({ error: 'File kosong' }, 400);
        if (buf.byteLength > 3.5e6) return J({ error: 'Gambar terlalu besar (maks 3.5 MB). Kecilkan ukuran/kualitas.' }, 413);
        const type = sniff(new Uint8Array(buf.slice(0, 12)));
        if (!type) return J({ error: 'Format gambar tidak didukung (JPG, PNG, WebP, GIF).' }, 415);
        const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        let name = ''; try { name = decodeURIComponent(req.headers.get('x-name') || ''); } catch (e) {}
        await env.SITE.put('img:' + id, buf, { metadata: { type, size: buf.byteLength, name: name.slice(0, 80), created: Date.now() } });
        return J({ id, url: '/api/img/' + id });
      }
      im = /^\/api\/img\/([a-f0-9]{8,32})$/.exec(p);
      if (im && m === 'DELETE') { await env.SITE.delete('img:' + im[1]); return J({ ok: true }); }
      if (p === '/api/password' && m === 'POST') {
        const b = await req.json().catch(() => ({}));
        if (!(await pwOk(env, b.current || ''))) return J({ error: 'Password saat ini salah' }, 403);
        if (typeof b.next !== 'string' || b.next.length < 10 || b.next.length > 128) return J({ error: 'Password baru minimal 10 karakter' }, 400);
        const rec = (await env.SITE.get('auth', 'json')) || {}, salt = crypto.randomUUID(), v = (rec.v || 0) + 1;
        await env.SITE.put('auth', JSON.stringify({ salt, hash: hex(await hmac(env.SESSION_SECRET + ':' + salt, b.next)), v }));
        return J({ ok: true }, 200, { 'set-cookie': cookie(await mk(env, v)) });
      }
    } catch (e) {
      return J({ error: 'Server error' }, 500);
    }
    return J({ error: 'Not found' }, 404);
  }
};
