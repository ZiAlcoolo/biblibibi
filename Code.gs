// Proxy Notion pour la PWA — Google Apps Script (Web App).
// Propriétés du script (Paramètres du projet → Propriétés du script) :
//   APP_KEY   : clé partagée par les amis (Google Sheet) — à recopier dans CONFIG.APP_KEY de l'app
//   ADMIN_KEY : ta clé personnelle, réservée à la source Notion
//   NOTION_TOKEN, DATABASE_ID : source Notion uniquement
// Source Google Sheet : le lien du Sheet est envoyé par l'app, rien d'autre à configurer.
const NV = '2022-06-28';
const FIELDS = { nom: 'Nom', type: 'Type', statut: 'Statut', note: 'Note sur 5', auteur: 'Auteur', termine: 'Terminé le',
  lien: 'Lien', cover: 'Cover', genre: 'Genre', notes: 'Notes', resume: 'Résumé', added: 'Ajouté le' };
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
  Object.keys(FIELDS).forEach(f => { it[f] = read(pg.properties[map[f] && map[f].name], f); });
  it.added = Date.parse(it.added) || Date.parse(pg.created_time) || 0; return it; };
function toProps(it, map) { const props = {};
  Object.keys(map).forEach(f => { if (f in it && f !== 'added') { const w = write(map[f].type, f, it[f]); if (w) props[map[f].name] = w; } });
  return props; }

function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.sheet) {   // Google Sheet : clé partagée (APP_KEY), préremplie dans l'app
      if (!prop('APP_KEY') || req.key !== prop('APP_KEY')) return out({ error: 'Clé invalide' });
      return out(sheetAction(req));
    }
    // Notion : clé personnelle de l'administrateur (ADMIN_KEY), jamais écrite dans l'app
    if (!prop('ADMIN_KEY') || req.key !== prop('ADMIN_KEY')) return out({ error: 'Clé admin invalide (propriété ADMIN_KEY du script)' });
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
// ---- Mode Google Sheet (aucune configuration Notion nécessaire)
function sheetCtx(url) {
  let ss;
  try { ss = SpreadsheetApp.openByUrl(url); }
  catch (e) { throw new Error("Impossible d'ouvrir le Sheet : vérifie le lien et qu'il est partagé en « Éditeur » avec l'administrateur."); }
  const sh = ss.getSheetByName('Médias') || ss.insertSheet('Médias');
  const head = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
  Object.keys(FIELDS).map(f => FIELDS[f]).concat('ID').forEach(c => {
    if (head.some(h => norm(h) === norm(c))) return;
    head.push(c);
    sh.getRange(1, head.length).setValue(c).setFontWeight('bold');
    if ([FIELDS.termine, FIELDS.added, 'ID'].indexOf(c) >= 0) sh.getRange(1, head.length, sh.getMaxRows(), 1).setNumberFormat('@');
  });
  const idx = { id: head.findIndex(h => norm(h) === 'id') };
  Object.keys(FIELDS).forEach(f => { idx[f] = head.findIndex(h => norm(h) === norm(FIELDS[f])); });
  return { sh, head, idx };
}
const cellText = v => v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;

function sheetAction(req) {
  const { sh, head, idx } = sheetCtx(req.sheet), lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const last = sh.getLastRow(), rows = last > 1 ? sh.getRange(2, 1, last - 1, head.length).getValues() : [];
    const rowOf = id => rows.findIndex(r => String(r[idx.id]) === id) + 2;
    const fill = (r, it) => Object.keys(FIELDS).forEach(f => {
      if (!(f in it)) return;
      r[idx[f]] = f === 'genre' ? (it.genre || []).join(', ') : f === 'note' ? (it.note || 0)
        : f === 'added' ? new Date(it.added || Date.now()).toISOString() : (it[f] == null ? '' : it[f]);
    });
    const put = (n, r) => { const rg = sh.getRange(n, 1, 1, head.length); rg.setNumberFormat('@'); rg.setValues([r]); };
    switch (req.action) {
      case 'list': {
        const iso = new Date().toISOString(); let fix = false;
        rows.forEach(r => {
          if (!r[idx.nom]) return;
          if (!r[idx.id]) { r[idx.id] = Utilities.getUuid(); fix = true; }
          if (!r[idx.added]) { r[idx.added] = iso; fix = true; }
        });
        if (fix) {
          sh.getRange(2, idx.id + 1, rows.length, 1).setValues(rows.map(r => [r[idx.id]]));
          sh.getRange(2, idx.added + 1, rows.length, 1).setValues(rows.map(r => [r[idx.added]]));
        }
        return rows.filter(r => r[idx.nom]).map(r => {
          const it = { notionId: String(r[idx.id]) };
          Object.keys(FIELDS).forEach(f => {
            const v = cellText(r[idx[f]]);
            it[f] = f === 'genre' ? String(v || '').split(',').map(s => s.trim()).filter(Boolean)
              : f === 'note' ? Math.min(5, Number(v) || 0) : f === 'added' ? (Date.parse(v) || 0) : String(v == null ? '' : v);
          });
          if (!it.statut) it.statut = 'Pas commencé';
          return it;
        });
      }
      case 'create': {
        const id = Utilities.getUuid(), r = new Array(head.length).fill('');
        fill(r, req.item); r[idx.id] = id; put(last + 1, r);
        return { notionId: id };
      }
      case 'update': {
        const n = rowOf(req.id); if (n < 2) throw new Error('Ligne introuvable dans le Sheet');
        const r = rows[n - 2]; fill(r, req.item); put(n, r);
        return { ok: 1 };
      }
      case 'delete': { const n = rowOf(req.id); if (n >= 2) sh.deleteRow(n); return { ok: 1 }; }
    }
    throw new Error('Action inconnue');
  } finally { lock.releaseLock(); }
}

function doGet() { return ContentService.createTextOutput('Proxy Notion actif'); }

// À exécuter une fois depuis l'éditeur pour accorder les autorisations et tester la connexion à Notion.
function autoriser() {
  if (prop('NOTION_TOKEN') && prop('DATABASE_ID')) Logger.log(JSON.stringify(schema()));
  else Logger.log('Autorisations accordées. En mode Google Sheet, aucune propriété Notion n’est nécessaire.');
}
