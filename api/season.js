// ANIMEDEX — mise à jour automatique des animés de la saison.
// GET /api/season           -> JSON des séries ajoutées automatiquement + prochains épisodes à jour
// GET /api/season?a=cron    -> (cron quotidien) récupère la saison en cours sur AniList,
//                              fait rédiger les résumés FR/EN par Gemini pour les nouvelles séries, sauvegarde dans Vercel Blob.
const { put, list } = require('@vercel/blob');
const STATIC = new Set(require('./_season_static.json'));
const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean);
const G = { Action: 'Action', Adventure: 'Aventure', Comedy: 'Comédie', Drama: 'Drame', Fantasy: 'Fantasy', Horror: 'Horreur', 'Mahou Shoujo': 'Mahou Shoujo', Mecha: 'Mecha', Music: 'Musique', Mystery: 'Mystère', Psychological: 'Psychologique', Romance: 'Romance', 'Sci-Fi': 'Sci-Fi', 'Slice of Life': 'Slice of Life', Sports: 'Sport', Supernatural: 'Surnaturel', Thriller: 'Thriller' };
const FMT = { TV: 'Série TV', TV_SHORT: 'Format court', ONA: 'Série web (ONA)', MOVIE: 'Film' };
const SRC = { MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', WEB_NOVEL: 'Web novel', NOVEL: 'Roman', ORIGINAL: 'Création originale', VIDEO_GAME: 'Jeu vidéo', GAME: 'Jeu', OTHER: 'Autre', WEB_MANGA: 'Webcomic', MULTIMEDIA_PROJECT: 'Projet multimédia', CARD_GAME: 'Jeu de cartes', VISUAL_NOVEL: 'Visual novel' };
const SEASON_FR = { WINTER: 'Hiver', SPRING: 'Printemps', SUMMER: 'Été', FALL: 'Automne' };
const SEASON_EN = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const MAX_NEW_PER_RUN = 6;

function current() {
  const d = new Date(), m = d.getUTCMonth();
  return { s: m < 3 ? 'WINTER' : m < 6 ? 'SPRING' : m < 9 ? 'SUMMER' : 'FALL', y: d.getUTCFullYear() };
}
const slug = s => { let r = String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); if (r.length > 55) r = r.slice(0, 55).replace(/-[^-]*$/, ''); return r; };
const clean = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\(Source:[^)]*\)|\[Written by[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

const Q = `query($s:MediaSeason,$y:Int,$p:Int){Page(page:$p,perPage:50){pageInfo{hasNextPage}media(season:$s,seasonYear:$y,type:ANIME,isAdult:false,sort:POPULARITY_DESC,format_in:[TV,TV_SHORT,ONA]){id title{romaji english native} format episodes duration status source startDate{year month day} genres averageScore popularity description(asHtml:false) coverImage{extraLarge large} studios(isMain:true){nodes{name}} nextAiringEpisode{episode airingAt} trailer{id site} externalLinks{site url type} characters(sort:[ROLE,RELEVANCE],perPage:6){edges{role node{name{full} image{large} description(asHtml:false)}}} staff(sort:RELEVANCE,perPage:6){edges{role node{name{full}}}}}}}`;

async function anilist(s, y) {
  const out = [];
  for (let p = 1; p <= 3; p++) {
    const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: Q, variables: { s, y, p } }), signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('anilist ' + r.status);
    const j = await r.json(); const pg = j.data.Page; out.push(...pg.media);
    if (!pg.pageInfo.hasNextPage) break;
  }
  return out;
}

async function gemini(prompt, schema) {
  if (!process.env.GEMINI_API_KEY) return null;
  for (const model of MODELS) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1400, responseMimeType: 'application/json', responseSchema: schema } })
      });
      if (!r.ok) continue;
      const j = await r.json(); const t = j.candidates && j.candidates[0] && j.candidates[0].content.parts[0].text;
      return JSON.parse(t);
    } catch (e) { /* modèle suivant */ }
  }
  return null;
}

async function write(m) {
  const chars = m.characters.edges.filter(e => e.role === 'MAIN').slice(0, 3);
  const prompt = "Tu rédiges une fiche pour ANIMEDEX, une encyclopédie d'animés. À partir des informations ci-dessous (en anglais), écris avec tes propres mots, sans copier les phrases d'origine et sans spoiler :\n" +
    "- fr : un résumé en français de 2 phrases (300 caractères max), ton neutre et vivant, tutoiement interdit ;\n- en : le même résumé en anglais ;\n" +
    "- chars : pour chaque personnage listé, une phrase courte (90 caractères max) en français (fr) et en anglais (en).\nN'invente aucun fait absent des informations.\n\n" +
    'TITRE : ' + (m.title.english || m.title.romaji) + '\nGENRES : ' + m.genres.join(', ') + '\nSYNOPSIS : ' + clean(m.description).slice(0, 1500) +
    '\nPERSONNAGES :\n' + chars.map(e => '- ' + e.node.name.full + ' : ' + clean(e.node.description).slice(0, 300)).join('\n');
  return gemini(prompt, { type: 'OBJECT', properties: { fr: { type: 'STRING' }, en: { type: 'STRING' }, chars: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, fr: { type: 'STRING' }, en: { type: 'STRING' } }, required: ['name', 'fr', 'en'] } } }, required: ['fr', 'en'] });
}

function toItem(m, w, season) {
  const ep = m.episodes, sd = m.startDate || {};
  const title = (m.title.english || m.title.romaji || '').replace(/\s+/g, ' ').trim();
  const cd = {}; ((w && w.chars) || []).forEach(c => { cd[c.name] = c; });
  return {
    id: slug(title) || 'al-' + m.id, title, genres: m.genres.map(g => G[g]).filter(Boolean), year: String(season.y),
    seasons: SEASON_FR[season.s] + ' ' + season.y + ' · ' + (ep ? ep + ' épisodes' : 'en cours de diffusion'),
    seasons_en: SEASON_EN[season.s] + ' ' + season.y + ' · ' + (ep ? ep + ' episodes' : 'currently airing'),
    image: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || '', summary: w.fr, summary_en: w.en, ost: [], openings: [], endings: [], al: m.id, auto: 1,
    characters: m.characters.edges.map(e => ({ name: e.node.name.full, role: e.role === 'MAIN' ? 'Personnage principal' : 'Personnage secondaire', desc: (cd[e.node.name.full] || {}).fr || '', desc_en: (cd[e.node.name.full] || {}).en || '', image: e.node.image.large })),
    x: {
      studio: m.studios.nodes.slice(0, 2).map(s => s.name).join(', '), format: FMT[m.format] || m.format, ep, dur: m.duration, src: SRC[m.source] || '', st: m.status,
      start: sd.year ? [sd.year, String(sd.month || 1).padStart(2, '0'), String(sd.day || 1).padStart(2, '0')].join('-') : '', next: m.nextAiringEpisode,
      tr: m.trailer && m.trailer.site === 'youtube' ? m.trailer.id : '', links: m.externalLinks.filter(l => l.type === 'STREAMING').slice(0, 6).map(l => ({ s: l.site, u: l.url })),
      off: '', dir: (() => { const d = m.staff.edges.find(s => /^director/i.test(s.role)); return d ? d.node.name.full : ''; })(),
      native: m.title.native || '', romaji: m.title.romaji, score: m.averageScore, season: SEASON_FR[season.s] + ' ' + season.y, season_en: SEASON_EN[season.s] + ' ' + season.y
    }
  };
}

async function load(key) {
  try { const l = await list({ prefix: key }); if (!l.blobs[0]) return null; const r = await fetch(l.blobs[0].url + '?t=' + Date.now()); return r.ok ? await r.json() : null; } catch (e) { return null; }
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const season = current(), key = 'season/' + season.s + '-' + season.y + '.json';
  if (q.a !== 'cron') {
    const d = (await load(key)) || { items: [], next: {} };
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json(d);
  }
  const day = new Date().toISOString().slice(0, 10);
  const cur = (await load(key)) || { season: season.s + '-' + season.y, items: [], next: {}, day: '' };
  if (cur.day === day && !q.force) return res.status(200).json({ skipped: 'deja fait aujourd hui', items: cur.items.length });
  let media;
  try { media = await anilist(season.s, season.y); } catch (e) { return res.status(502).json({ error: String(e).slice(0, 120) }); }
  const have = new Set(cur.items.map(i => i.al)), ids = new Set();
  cur.next = {};
  for (const m of media) if (m.nextAiringEpisode) cur.next[m.id] = m.nextAiringEpisode;
  // les séries déjà connues : on met à jour le statut et le prochain épisode
  for (const it of cur.items) { const m = media.find(x => x.id === it.al); if (m) { it.x.next = m.nextAiringEpisode; it.x.st = m.status; it.x.score = m.averageScore; } }
  let added = 0;
  const todo = media.filter(m => !STATIC.has(m.id) && !have.has(m.id) && m.popularity >= 1500 && m.description && !m.genres.includes('Ecchi') && !m.genres.includes('Hentai'));
  for (const m of todo) {
    if (added >= MAX_NEW_PER_RUN) break;
    const w = await write(m);
    if (!w || !w.fr || !w.en) continue;
    const it = toItem(m, w, season);
    while (cur.items.some(i => i.id === it.id) || ids.has(it.id)) it.id += '-' + season.y;
    ids.add(it.id); cur.items.push(it); added++;
  }
  cur.day = day; cur.updated = Date.now();
  await put(key, JSON.stringify(cur), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  return res.status(200).json({ ok: true, season: season.s + '-' + season.y, added, total: cur.items.length, remaining: Math.max(0, todo.length - added) });
};
