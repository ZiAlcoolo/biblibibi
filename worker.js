// Proxy Notion pour la PWA — à déployer sur Cloudflare Workers.
// Secrets/variables : NOTION_TOKEN, DATABASE_ID, APP_KEY (mot de passe de la PWA), ALLOWED_ORIGIN (optionnel)
const NV = '2022-06-28';
const FIELDS = { nom: 'Nom', type: 'Type', statut: 'Statut', note: 'Note sur 5', auteur: 'Auteur', termine: 'Terminé le',
  lien: 'Lien', cover: 'Cover', genre: 'Genre', notes: 'Notes', resume: 'Résumé' };
const norm = s => s.trim().toLowerCase();

async function notion(env, path, method = 'GET', body) {
  const r = await fetch('https://api.notion.com/v1' + path, { method,
    headers: { Authorization: 'Bearer ' + env.NOTION_TOKEN, 'Notion-Version': NV, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error(j.message || r.status); return j;
}
const txt = a => (a || []).map(t => t.plain_text).join('');
const stars = s => [...(s || '')].filter(c => c === '⭐').length;

function read(p, f) {
  if (!p) return f === 'genre' ? [] : f === 'note' ? 0 : '';
  const t = p.type, v = p[t];
  let out = t === 'title' || t === 'rich_text' ? txt(v) : t === 'select' || t === 'status' ? v?.name || ''
    : t === 'multi_select' ? v.map(x => x.name) : t === 'date' ? v?.start?.slice(0, 10) || ''
    : t === 'files' ? (v[0]?.external?.url || v[0]?.file?.url || '') : v ?? '';
  return f === 'note' ? stars(out) : out;
}
function write(type, f, v) {
  if (f === 'note') v = v ? '⭐️'.repeat(v) : 'À déterminer';
  switch (type) {
    case 'title': return { title: [{ text: { content: v || '' } }] };
    case 'rich_text': return { rich_text: (v || '').match(/[\s\S]{1,2000}/g)?.map(c => ({ text: { content: c } })) || [] };
    case 'select': return { select: v ? { name: v } : null };
    case 'status': return v ? { status: { name: v } } : undefined;
    case 'multi_select': return { multi_select: (v || []).map(name => ({ name })) };
    case 'date': return { date: v ? { start: v } : null };
    case 'url': return { url: v || null };
    case 'files': return { files: v ? [{ name: 'cover', external: { url: v } }] : [] };
  }
}
async function schema(env) {
  const db = await notion(env, '/databases/' + env.DATABASE_ID), map = {};
  for (const [name, p] of Object.entries(db.properties)) {
    const f = Object.keys(FIELDS).find(k => norm(FIELDS[k]) === norm(name));
    if (f) map[f] = { name, type: p.type };
  }
  return map;
}
const toItem = (pg, map) => { const it = { notionId: pg.id };
  for (const f in FIELDS) it[f] = read(pg.properties[map[f]?.name], f); return it; };
function toProps(it, map) { const props = {};
  for (const f in map) if (f in it) { const w = write(map[f].type, f, it[f]); if (w) props[map[f].name] = w; }
  return props; }

export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Key',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
    const send = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.headers.get('X-Key') !== env.APP_KEY) return send({ error: 'Clé invalide' }, 401);
    try {
      const url = new URL(req.url), id = url.pathname.split('/')[2], map = await schema(env);
      if (req.method === 'GET') {
        let items = [], cursor;
        do { const r = await notion(env, `/databases/${env.DATABASE_ID}/query`, 'POST', { page_size: 100, start_cursor: cursor });
          items.push(...r.results.map(p => toItem(p, map))); cursor = r.has_more ? r.next_cursor : null; } while (cursor);
        return send(items);
      }
      const it = req.method === 'DELETE' ? {} : await req.json();
      if (req.method === 'POST') { const p = await notion(env, '/pages', 'POST', { parent: { database_id: env.DATABASE_ID }, properties: toProps(it, map) });
        return send({ notionId: p.id }); }
      if (req.method === 'PATCH') { await notion(env, '/pages/' + id, 'PATCH', { properties: toProps(it, map) }); return send({ ok: 1 }); }
      if (req.method === 'DELETE') { await notion(env, '/pages/' + id, 'PATCH', { archived: true }); return send({ ok: 1 }); }
    } catch (e) { return send({ error: e.message }, 500); }
    return send({ error: 'Not found' }, 404);
  }
};
