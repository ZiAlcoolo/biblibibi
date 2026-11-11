// Proxy Notion pour la PWA — Google Apps Script (Web App).
// Propriétés du script (Paramètres du projet → Propriétés du script) : NOTION_TOKEN, DATABASE_ID, APP_KEY
const NV = '2022-06-28';
const FIELDS = { nom: 'Nom', type: 'Type', statut: 'Statut', note: 'Note sur 5', auteur: 'Auteur', termine: 'Terminé le',
  lien: 'Lien', cover: 'Cover', genre: 'Genre', notes: 'Notes', resume: 'Résumé' };
const norm = s => s.trim().toLowerCase();
const prop = k => PropertiesService.getScriptProperties().getProperty(k);

function notion(path, method, body) {
  const opt = { method: method || 'get', muteHttpExceptions: true, contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + prop('NOTION_TOKEN'), 'Notion-Version': NV } };
  if (body) opt.payload = JSON.stringify(body);
  const r = UrlFetchApp.fetch('https://api.notion.com/v1' + path, opt), j = JSON.parse(r.getContentText());
  if (r.getResponseCode() >= 300) throw new Error(j.message || 'Notion ' + r.getResponseCode());
  return j;
}
const txt = a => (a || []).map(t => t.plain_text).join('');
const stars = s => [...(s || '')].filter(c => c === '⭐').length;

function read(p, f) {
  if (!p) return f === 'genre' ? [] : f === 'note' ? 0 : '';
  const t = p.type, v = p[t];
  const out = t === 'title' || t === 'rich_text' ? txt(v) : t === 'select' || t === 'status' ? (v ? v.name : '')
    : t === 'multi_select' ? v.map(x => x.name) : t === 'date' ? (v ? v.start.slice(0, 10) : '')
    : t === 'files' ? (v[0] ? (v[0].external ? v[0].external.url : v[0].file.url) : '') : (v == null ? '' : v);
  return f === 'note' ? stars(out) : out;
}
function write(type, f, v) {
  if (f === 'note') v = v ? '⭐️'.repeat(v) : 'À déterminer';
  switch (type) {
    case 'title': return { title: [{ text: { content: v || '' } }] };
    case 'rich_text': return { rich_text: ((v || '').match(/[\s\S]{1,2000}/g) || []).map(c => ({ text: { content: c } })) };
    case 'select': return { select: v ? { name: v } : null };
    case 'status': return v ? { status: { name: v } } : undefined;
    case 'multi_select': return { multi_select: (v || []).map(name => ({ name })) };
    case 'date': return { date: v ? { start: v } : null };
    case 'url': return { url: v || null };
    case 'files': return { files: v ? [{ name: 'cover', external: { url: v } }] : [] };
  }
}
function schema() {
  const cache = CacheService.getScriptCache(), hit = cache.get('schema');
  if (hit) return JSON.parse(hit);
  const db = notion('/databases/' + prop('DATABASE_ID')), map = {};
  Object.keys(db.properties).forEach(name => {
    const f = Object.keys(FIELDS).find(k => norm(FIELDS[k]) === norm(name));
    if (f) map[f] = { name, type: db.properties[name].type };
  });
  cache.put('schema', JSON.stringify(map), 600);
  return map;
}
const toItem = (pg, map) => { const it = { notionId: pg.id };
  Object.keys(FIELDS).forEach(f => { it[f] = read(pg.properties[map[f] && map[f].name], f); }); return it; };
function toProps(it, map) { const props = {};
  Object.keys(map).forEach(f => { if (f in it) { const w = write(map[f].type, f, it[f]); if (w) props[map[f].name] = w; } });
  return props; }

function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const req = JSON.parse(e.postData.contents);
    if (!prop('APP_KEY') || req.key !== prop('APP_KEY')) return out({ error: 'Clé invalide' });
    const map = schema(), db = prop('DATABASE_ID');
    switch (req.action) {
      case 'list': {
        const items = []; let cursor;
        do { const r = notion('/databases/' + db + '/query', 'post', cursor ? { page_size: 100, start_cursor: cursor } : { page_size: 100 });
          r.results.forEach(p => items.push(toItem(p, map))); cursor = r.has_more ? r.next_cursor : null; } while (cursor);
        return out(items);
      }
      case 'create': return out({ notionId: notion('/pages', 'post', { parent: { database_id: db }, properties: toProps(req.item, map) }).id });
      case 'update': notion('/pages/' + req.id, 'patch', { properties: toProps(req.item, map) }); return out({ ok: 1 });
      case 'delete': notion('/pages/' + req.id, 'patch', { archived: true }); return out({ ok: 1 });
    }
    return out({ error: 'Action inconnue' });
  } catch (err) { return out({ error: String(err.message || err) }); }
}
function doGet() { return ContentService.createTextOutput('Proxy Notion actif'); }

// À exécuter une fois depuis l'éditeur pour accorder les autorisations et tester la connexion à Notion.
function autoriser() { Logger.log(JSON.stringify(schema())); }
