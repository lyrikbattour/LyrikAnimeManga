// Pages de fiches ANIMEDEX pour les moteurs de recherche et les partages.
// /anime/<id> et /manga/<id> : une fiche ; /anime et /manga : la liste complète.
// Les données viennent de api/_fiches.json (générées depuis index.html).
const DATA_FR = require('./_fiches.json');
const EN = require('./_fiches_en.json');
// version anglaise : on fusionne les traductions (résumé, saisons, statut, rôles, genres)
const tg = g => EN.genres[g] || g;
const DATA_EN = {};
for (const t of ['anime', 'manga']) DATA_EN[t] = DATA_FR[t].map(x => {
  const o = EN[t][x.id] || {};
  return Object.assign({}, x, o, {
    genres: (x.genres || []).map(tg),
    status: x.status ? (EN.status[x.status] || x.status) : x.status,
    seasons: x.seasons ? (EN.seasons[x.seasons] || x.seasons) : x.seasons,
    characters: (x.characters || []).map(c => Object.assign({}, c, { role: EN.roles[c.role] || c.role, desc: (o.cdesc && o.cdesc[c.name]) || '' }))
  });
});
const DB = { fr: DATA_FR, en: DATA_EN };
let DATA = DATA_FR, LG = 'fr', P = '';
const SITE = 'https://animedexfr.fr';
const IDX = {}; for (const l of ['fr', 'en']) IDX[l] = { anime: new Map(DB[l].anime.map(x => [x.id, x])), manga: new Map(DB[l].manga.map(x => [x.id, x])) };
const TX = {
  fr: { anime: 'Animés', manga: 'Mangas', games: 'Jeux', home: 'Accueil', allA: 'Tous les animés', allM: 'Tous les mangas', privacy: 'Confidentialité', foot: 'ANIMEDEX — encyclopédie fan-made non officielle · les œuvres citées appartiennent à leurs ayants droit', kindA: 'Animé', kindM: 'Manga',
    tItemM: t => `${t} (manga) — résumé et personnages | ANIMEDEX`, tItemA: t => `${t} — résumé, personnages, openings et OST | ANIMEDEX`, cover: 'Couverture de ', open: 'Ouvrir la fiche complète', listen: 'Écouter les musiques', games2: 'Quiz et jeux',
    chars: t => `Personnages de ${t}`, music: t => `Musiques de ${t}`, where: t => `Où trouver ${t}`, affM: ['Le manga (tome 1)', 'Tous les tomes', 'Produits dérivés'], affA: ['Blu-ray / DVD', 'Le manga', 'Figurines'], affNote: 'Liens affiliés Amazon : ANIMEDEX peut toucher une commission, sans coût pour toi.',
    same: 'Dans le même genre', simCta: t => `Si tu as aimé ${t} : nos 10 conseils →`, simSlug: 'similaires', reco: 'Recommandations', common: 'Point commun : ', unitM: 'mangas à lire', unitA: 'animés à regarder',
    simTitle: (t, n, u) => `Si tu as aimé ${t} : ${n} ${u} ensuite | ANIMEDEX`, simDesc: (t, n, m, g) => `Tu as aimé ${t} ? Voici ${n} ${m ? 'mangas' : 'animés'} du même genre (${g}) à découvrir, avec la raison de chaque conseil.`,
    simH1: t => `Si tu as aimé ${t}`, simLede: (n, u, t, g) => `${n} ${u} ensuite, choisis pour leurs points communs avec ${t} : ${g}.`, back: t => `Revoir la fiche de ${t}`, inApp: "Ouvrir dans l'appli",
    nextM: 'Les mangas à lire ensuite', nextA: 'Les animés à regarder ensuite', crossM: 'En animé aussi', crossA: 'À lire en manga', simNote: "Conseils calculés à partir des genres, de la cible et de l'époque de chaque série du catalogue ANIMEDEX.",
    listTM: n => `Tous les mangas (${n} fiches) | ANIMEDEX`, listTA: n => `Tous les animés (${n} fiches) | ANIMEDEX`, listDM: n => `Les ${n} mangas du catalogue ANIMEDEX : résumé, auteur et personnages de chaque série.`, listDA: n => `Les ${n} animés du catalogue ANIMEDEX : résumé, personnages, openings, endings et OST de chaque série.`,
    catalog: 'Catalogue', az: n => `${n} fiches, de A à Z`, e404: 'Erreur 404', nf: 'Fiche introuvable', nfLede: "Cette fiche n'existe pas ou a changé d'adresse.", seeCat: 'Voir le catalogue', nfDesc: 'Cette fiche est introuvable sur ANIMEDEX.', locale: 'fr_FR', amazon: 'https://www.amazon.fr/s?k=', tag: 'animedexfr-21' },
  en: { anime: 'Anime', manga: 'Manga', games: 'Games', home: 'Home', allA: 'All anime', allM: 'All manga', privacy: 'Privacy', foot: 'ANIMEDEX: unofficial fan-made encyclopedia · all works belong to their respective rights holders', kindA: 'Anime', kindM: 'Manga',
    tItemM: t => `${t} (manga): synopsis and characters | ANIMEDEX`, tItemA: t => `${t}: synopsis, characters, openings and OST | ANIMEDEX`, cover: 'Cover of ', open: 'Open the full page', listen: 'Listen to the music', games2: 'Quizzes and games',
    chars: t => `${t} characters`, music: t => `${t} music`, where: t => `Where to find ${t}`, affM: ['The manga (volume 1)', 'All volumes', 'Merchandise'], affA: ['Blu-ray / DVD', 'The manga', 'Figures'], affNote: 'Amazon affiliate links: ANIMEDEX may earn a commission at no cost to you.',
    same: 'More like this', simCta: t => `If you liked ${t}: our 10 picks →`, simSlug: 'similar', reco: 'Recommendations', common: 'In common: ', unitM: 'manga to read', unitA: 'anime to watch',
    simTitle: (t, n, u) => `If you liked ${t}: ${n} ${u} next | ANIMEDEX`, simDesc: (t, n, m, g) => `Liked ${t}? Here are ${n} ${m ? 'manga' : 'anime'} in the same genre (${g}) to discover, with the reason for each pick.`,
    simH1: t => `If you liked ${t}`, simLede: (n, u, t, g) => `${n} ${u} next, picked for what they share with ${t}: ${g}.`, back: t => `Back to the ${t} page`, inApp: 'Open in the app',
    nextM: 'Manga to read next', nextA: 'Anime to watch next', crossM: 'Also as an anime', crossA: 'Also as a manga', simNote: 'Picks based on the genre, demographic and era of each series in the ANIMEDEX catalog.',
    listTM: n => `All manga (${n} pages) | ANIMEDEX`, listTA: n => `All anime (${n} pages) | ANIMEDEX`, listDM: n => `The ${n} manga in the ANIMEDEX catalog: synopsis, author and characters for each series.`, listDA: n => `The ${n} anime in the ANIMEDEX catalog: synopsis, characters, openings, endings and OST for each series.`,
    catalog: 'Catalog', az: n => `${n} pages, A to Z`, e404: 'Error 404', nf: 'Page not found', nfLede: "This page doesn't exist or has moved.", seeCat: 'See the catalog', nfDesc: "This page can't be found on ANIMEDEX.", locale: 'en_US', amazon: 'https://www.amazon.com/s?k=', tag: '' }
};
let L = TX.fr;

const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cut = (s, n) => { s = String(s || ''); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n - 30)).replace(/[ ,;:.]+$/, '') + '…'; };
const img = u => !u ? '' : (/^https?:\/\//.test(u) ? u : '/' + String(u).replace(/^\/+/, ''));
const amazon = q => L.amazon + encodeURIComponent(q) + (L.tag ? '&tag=' + L.tag : '');

const CSS = `
:root{--bg:#ffffff;--bg-alt:#f4f4f4;--ink:#0a0a0a;--ink-soft:#5c5c5c;--ink-faint:#767676;--line:rgba(10,10,10,.13);--accent:#ff4d2e;
--display:'Archivo Black',sans-serif;--body:'Inter',sans-serif;--mono:'IBM Plex Mono',monospace}
:root[data-theme="dark"]{--bg:#0f0f10;--bg-alt:#1b1b1d;--ink:#f3f3f1;--ink-soft:#b0b0ac;--ink-faint:#8d8d89;--line:rgba(255,255,255,.18);color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--body);line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:2px solid var(--ink);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-family:var(--display);font-size:19px;letter-spacing:-.5px}
.brand i{width:14px;height:14px;background:var(--ink);display:block}
header nav{display:flex;gap:4px}
header nav a{font-family:var(--mono);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;padding:8px 10px;border:1px solid var(--line)}
main{max-width:980px;margin:0 auto;padding:22px 16px 70px}
.crumb{font-family:var(--mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-faint);margin-bottom:18px}
.crumb a{text-decoration:none}.crumb a:hover{text-decoration:underline}
.top{display:grid;grid-template-columns:minmax(0,230px) minmax(0,1fr);gap:26px;align-items:start}
.top img{width:100%;aspect-ratio:2/3;object-fit:cover;border:2px solid var(--ink);display:block;background:var(--bg-alt)}
h1{font-family:var(--display);font-size:clamp(30px,6vw,52px);line-height:1.02;letter-spacing:-1px;overflow-wrap:anywhere}
.kind{font-family:var(--mono);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-faint);margin-bottom:8px}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}
.meta span{font-family:var(--mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;border:1px solid var(--ink);padding:4px 8px}
.meta span.soft{border-color:var(--line);color:var(--ink-soft)}
.sum{font-size:16px;max-width:62ch}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
.btn{font-family:var(--mono);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;padding:13px 16px;border:2px solid var(--ink);display:inline-block}
.btn.main{background:var(--ink);color:var(--bg)}
h2{font-family:var(--display);font-size:22px;letter-spacing:-.4px;margin:44px 0 14px;padding-top:16px;border-top:2px solid var(--ink)}
.chars{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;list-style:none}
.chars li{border:1px solid var(--line);padding:12px;display:flex;gap:12px;align-items:flex-start}
.chars img{width:56px;height:56px;object-fit:cover;border:1px solid var(--ink);flex:none;background:var(--bg-alt)}
.chars b{display:block;font-size:15px}
.chars em{font-style:normal;font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-faint)}
.chars p{font-size:13.5px;color:var(--ink-soft);margin-top:4px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:22px}
.cols h3{font-family:var(--mono);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-faint);margin-bottom:8px}
.cols ul{list-style:none}.cols li{padding:7px 0;border-bottom:1px solid var(--line);font-size:14.5px}
.aff{display:flex;flex-wrap:wrap;gap:8px}
.aff a{font-size:14px;text-decoration:none;border:1px solid var(--ink);padding:9px 12px}
.note{font-size:12px;color:var(--ink-faint);margin-top:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px;list-style:none}
.grid a{text-decoration:none;display:block}
.grid img{width:100%;aspect-ratio:2/3;object-fit:cover;border:1px solid var(--ink);display:block;background:var(--bg-alt)}
.grid span{display:block;font-size:13px;font-weight:600;margin-top:6px;line-height:1.25}
.lede{color:var(--ink-soft);max-width:62ch;margin-top:10px}
footer{border-top:2px solid var(--ink);padding:22px 16px;font-family:var(--mono);font-size:11px;color:var(--ink-faint);text-align:center;line-height:1.9}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.recos{list-style:none;margin:0;padding:0;display:grid;gap:14px}.rc{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;border:1.5px solid var(--ink);padding:12px;background:var(--bg)}.rc img{width:96px;height:144px;object-fit:cover;border:1.5px solid var(--ink);display:block}.rc h3{margin:2px 0 4px;font-size:18px}.rc h3 a{color:inherit}.rc p{margin:4px 0;line-height:1.5}.rc .why{font-family:var(--mono,monospace);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
@media(max-width:600px){.top{grid-template-columns:1fr}.top img{max-width:210px}header nav a{padding:7px 8px;font-size:10px}}
`;

function shell({ title, desc, path, image, body, ld, alt }) {
  const url = SITE + P + path;
  const hl = alt === false ? '' : `<link rel="alternate" hreflang="fr" href="${SITE + path.replace('/similar', '/similaires')}"><link rel="alternate" hreflang="en" href="${SITE + '/en' + path.replace('/similaires', '/similar')}"><link rel="alternate" hreflang="x-default" href="${SITE + path.replace('/similar', '/similaires')}">`;
  return `<!doctype html><html lang="${LG}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">${hl}
<meta property="og:type" content="website"><meta property="og:site_name" content="ANIMEDEX"><meta property="og:locale" content="${L.locale}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${esc(image || SITE + '/og-image.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon-192-v2.png"><link rel="apple-touch-icon" href="/apple-touch-icon-v2.png">
<script>try{if('${LG}'==='en'||/[?&]lang=fr/.test(location.search))localStorage.setItem('mx_lang','${LG}');}catch(e){}try{var t=localStorage.getItem('mx-theme');if(!t&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body>
<header><a class="brand" href="${P}/"><i></i>ANIMEDEX</a><nav><a href="${P}/anime">${L.anime}</a><a href="${P}/manga">${L.manga}</a><a href="${P}/">${L.games}</a><a href="${LG === 'en' ? SITE + path.replace('/similar', '/similaires') + '?lang=fr' : SITE + '/en' + path.replace('/similaires', '/similar')}" hreflang="${LG === 'en' ? 'fr' : 'en'}" lang="${LG === 'en' ? 'fr' : 'en'}">${LG === 'en' ? 'FR' : 'EN'}</a></nav></header>
<main>${body}</main>
<footer>${L.foot}<br>
<a href="${P}/">${L.home}</a> · <a href="${P}/anime">${L.allA}</a> · <a href="${P}/manga">${L.allM}</a> · <a href="/confidentialite.html">${L.privacy}</a></footer>
</body></html>`;
}

function related(it, type) {
  const g = new Set(it.genres || []);
  return DATA[type].filter(x => x.id !== it.id)
    .map(x => [x, (x.genres || []).filter(v => g.has(v)).length])
    .filter(p => p[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(p => p[0]);
}

function card(x, type) {
  return `<li><a href="${P}/${type}/${x.id}"><img loading="lazy" src="${esc(img(x.image))}" alt="" width="230" height="345"><span>${esc(x.title)}</span></a></li>`;
}

function pageItem(it, type) {
  const isM = type === 'manga';
  const kind = isM ? L.kindM : L.kindA;
  const title = isM ? L.tItemM(it.title) : L.tItemA(it.title);
  const desc = cut(it.summary, 158);
  const meta = [
    ...(it.genres || []).map(g => `<span>${esc(g)}</span>`),
    it.year ? `<span class="soft">${esc(it.year)}</span>` : '',
    it.author ? `<span class="soft">${esc(it.author)}</span>` : '',
    it.status ? `<span class="soft">${esc(it.status)}</span>` : '',
    it.seasons ? `<span class="soft">${esc(it.seasons)}</span>` : '',
    it.x && it.x.studio ? `<span class="soft">Studio ${esc(it.x.studio)}</span>` : ''
  ].join('');
  const X = it.x || null;
  const xtra = X ? `${X.tr ? `<a class="btn" href="https://www.youtube.com/watch?v=${encodeURIComponent(X.tr)}" target="_blank" rel="noopener">▶ ${LG === 'en' ? 'Trailer' : 'Bande-annonce'}</a>` : ''}${(X.links || []).slice(0, 3).map(l => `<a class="btn" href="${esc(l.u)}" target="_blank" rel="noopener">${LG === 'en' ? 'Watch on' : 'Regarder sur'} ${esc(l.s)}</a>`).join('')}` : '';
  const chars = (it.characters || []).map(c => `<li>${c.image ? `<img loading="lazy" src="${esc(img(c.image))}" alt="" width="56" height="56">` : ''}<div><b>${esc(c.name)}</b>${c.role ? `<em>${esc(c.role)}</em>` : ''}${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div></li>`).join('');
  const list = (h, arr) => arr && arr.length ? `<div><h3>${h}</h3><ul>${arr.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : '';
  const music = isM ? '' : [list('Openings', it.openings), list('Endings', it.endings), list('OST', it.ost)].join('');
  const en = LG === 'en';
  const aff = isM
    ? [[L.affM[0], it.title + (en ? ' manga volume 1' : ' manga tome 1')], [L.affM[1], it.title + ' manga'], [L.affM[2], it.title + (en ? ' figure' : ' figurine')]]
    : [[L.affA[0], it.title + ' blu-ray dvd'], [L.affA[1], it.title + ' manga'], [L.affA[2], it.title + (en ? ' figure' : ' figurine')]];
  const rel = related(it, type);
  const body = `
<p class="crumb"><a href="${P}/">${L.home}</a> / <a href="${P}/${type}">${L[type]}</a> / ${esc(it.title)}</p>
<div class="top">
  <img src="${esc(img(it.image))}" alt="${L.cover}${esc(it.title)}" width="230" height="345">
  <div>
    <p class="kind">${kind}</p>
    <h1>${esc(it.title)}</h1>
    <div class="meta">${meta}</div>
    <p class="sum">${esc(it.summary)}</p>
    <div class="cta">
      <a class="btn main" href="${P}/#${type}/${it.id}">${L.open}</a>
      ${isM || !((it.openings || []).length || (it.ost || []).length) ? '' : `<a class="btn" href="${P}/#music/${it.id}">${L.listen}</a>`}
      <a class="btn" href="${P}/">${L.games2}</a>
      ${xtra}
    </div>
  </div>
</div>
${chars ? `<h2>${L.chars(esc(it.title))}</h2><ul class="chars">${chars}</ul>` : ''}
${music ? `<h2>${L.music(esc(it.title))}</h2><div class="cols">${music}</div>` : ''}
<h2>${L.where(esc(it.title))}</h2>
<div class="aff">${aff.map(a => `<a href="${amazon(a[1])}" target="_blank" rel="sponsored nofollow noopener">${a[0]}</a>`).join('')}</div>
<p class="note">${L.affNote}</p>
${rel.length ? `<h2>${L.same}</h2><ul class="grid">${rel.map(x => card(x, type)).join('')}</ul><div class="cta"><a class="btn main" href="${P}/${type}/${it.id}/${L.simSlug}">${L.simCta(esc(it.title))}</a></div>` : ''}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': isM ? 'ComicSeries' : 'TVSeries',
    name: it.title, description: it.summary, genre: it.genres, image: img(it.image), inLanguage: 'ja',
    url: `${SITE}${P}/${type}/${it.id}`,
    ...(it.year && /^\d{4}$/.test(it.year) ? (isM ? { startDate: it.year } : { datePublished: it.year }) : {}),
    ...(it.author ? { author: { '@type': 'Person', name: it.author } } : {}),
    ...(it.characters && it.characters.length ? { character: it.characters.slice(0, 12).map(c => ({ '@type': 'Person', name: c.name })) } : {})
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: L.home, item: SITE + P + '/' },
      { '@type': 'ListItem', position: 2, name: L[type], item: `${SITE}${P}/${type}` },
      { '@type': 'ListItem', position: 3, name: it.title, item: `${SITE}${P}/${type}/${it.id}` }]
  }];
  return shell({ title, desc, path: `/${type}/${it.id}`, image: img(it.image), body, ld });
}


// ----- Recommandations « Si tu as aimé X » -----
const DEMO = new Set(['Shonen', 'Seinen', 'Shojo', 'Josei', 'Kodomo']);
function simScore(a, b) {
  const ga = new Set(a.genres || []), gb = new Set(b.genres || []);
  let inter = 0; ga.forEach(g => { if (gb.has(g)) inter++; });
  if (!inter) return 0;
  const uni = new Set([...ga, ...gb]).size;
  let sc = inter / uni * 10 + inter;
  ga.forEach(g => { if (DEMO.has(g) && gb.has(g)) sc += 1.5; });
  const ya = parseInt(a.year, 10), yb = parseInt(b.year, 10);
  if (ya && yb) sc += Math.max(0, 2 - Math.abs(ya - yb) / 6);
  const ta = a.title.toLowerCase().split(/[^a-z0-9]+/)[0], tb = b.title.toLowerCase().split(/[^a-z0-9]+/)[0];
  if (ta.length > 3 && ta === tb) sc -= 6; // évite de recommander la même franchise
  return sc;
}
function recos(it, type, n) {
  return DATA[type].filter(x => x.id !== it.id && x.title !== it.title)
    .map(x => [x, simScore(it, x)]).filter(p => p[1] > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, n).map(p => p[0]);
}
function shared(a, b) { const g = new Set(a.genres || []); return (b.genres || []).filter(x => g.has(x)); }
function recoItem(x, it, type, i) {
  const why = shared(it, x).slice(0, 3).join(', ');
  return `<li class="rc"><a href="${P}/${type}/${x.id}"><img loading="lazy" src="${esc(img(x.image))}" alt="" width="120" height="180"></a><div>
<p class="kind">${i + 1}. ${type === 'manga' ? L.kindM : L.kindA}${x.year ? ' · ' + esc(x.year) : ''}</p>
<h3><a href="${P}/${type}/${x.id}">${esc(x.title)}</a></h3>
<p class="why">${L.common}${esc(why)}</p>
<p>${esc(cut(x.summary, 210))}</p></div></li>`;
}
function pageSimilar(it, type) {
  const isM = type === 'manga', other = isM ? 'anime' : 'manga';
  const main = recos(it, type, 10), cross = recos(it, other, 4);
  const unit = isM ? L.unitM : L.unitA;
  const title = L.simTitle(it.title, main.length, unit);
  const desc = cut(L.simDesc(it.title, main.length, isM, (it.genres || []).slice(0, 3).join(', ')), 158);
  const body = `
<p class="crumb"><a href="${P}/">${L.home}</a> / <a href="${P}/${type}">${L[type]}</a> / <a href="${P}/${type}/${it.id}">${esc(it.title)}</a> / ${L.reco}</p>
<div class="top"><img src="${esc(img(it.image))}" alt="${L.cover}${esc(it.title)}" width="230" height="345"><div>
<p class="kind">${L.reco}</p><h1>${L.simH1(esc(it.title))}</h1>
<p class="lede">${L.simLede(main.length, unit, esc(it.title), esc((it.genres || []).join(', ')))}</p>
<div class="cta"><a class="btn main" href="${P}/${type}/${it.id}">${L.back(esc(it.title))}</a><a class="btn" href="${P}/#${type}/${it.id}">${L.inApp}</a></div></div></div>
<h2>${isM ? L.nextM : L.nextA}</h2>
<ol class="recos">${main.map((x, i) => recoItem(x, it, type, i)).join('')}</ol>
${cross.length ? `<h2>${isM ? L.crossM : L.crossA}</h2><ul class="grid">${cross.map(x => card(x, other)).join('')}</ul>` : ''}
<p class="note">${L.simNote}</p>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: L.simH1(it.title), itemListElement: main.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${P}/${type}/${x.id}`, name: x.title })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: L.home, item: SITE + P + '/' },
      { '@type': 'ListItem', position: 2, name: L[type], item: `${SITE}${P}/${type}` },
      { '@type': 'ListItem', position: 3, name: it.title, item: `${SITE}${P}/${type}/${it.id}` },
      { '@type': 'ListItem', position: 4, name: L.reco, item: `${SITE}${P}/${type}/${it.id}/${L.simSlug}` }] }];
  return shell({ title, desc, path: `/${type}/${it.id}/${L.simSlug}`, image: img(it.image), body, ld });
}

function pageList(type) {
  const items = [...DATA[type]].sort((a, b) => a.title.localeCompare(b.title, LG));
  const isM = type === 'manga';
  const title = isM ? L.listTM(items.length) : L.listTA(items.length);
  const desc = isM ? L.listDM(items.length) : L.listDA(items.length);
  const body = `
<p class="crumb"><a href="${P}/">${L.home}</a> / ${L[type]}</p>
<p class="kind">${L.catalog}</p>
<h1>${isM ? L.allM : L.allA}</h1>
<p class="lede">${desc}</p>
<h2>${L.az(items.length)}</h2>
<ul class="grid">${items.map(x => card(x, type)).join('')}</ul>`;
  return shell({ title, desc, path: `/${type}`, body });
}

function notFound(type) {
  const body = `<p class="kind">${L.e404}</p><h1>${L.nf}</h1>
<p class="lede">${L.nfLede}</p>
<div class="cta"><a class="btn main" href="${P}/${type === 'manga' ? 'manga' : 'anime'}">${L.seeCat}</a><a class="btn" href="${P}/">${L.home}</a></div>`;
  return shell({ title: L.nf + ' | ANIMEDEX', desc: L.nfDesc, path: '/', body, alt: false });
}

module.exports = (req, res) => {
  const q = req.query || {};
  LG = q.lang === 'en' ? 'en' : 'fr'; L = TX[LG]; DATA = DB[LG]; P = LG === 'en' ? '/en' : '';
  const INDEX = IDX[LG];
  const type = q.type === 'manga' ? 'manga' : 'anime';
  const id = String(q.id || '').toLowerCase();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!id) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(pageList(type));
  }
  const it = INDEX[type].get(id);
  if (!it) {
    res.setHeader('X-Robots-Tag', 'noindex');
    return res.status(404).send(notFound(type));
  }
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).send(q.sim ? pageSimilar(it, type) : pageItem(it, type));
};
