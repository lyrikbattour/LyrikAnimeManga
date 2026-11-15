// Pages de fiches ANIMEDEX pour les moteurs de recherche et les partages.
// /anime/<id> et /manga/<id> : une fiche ; /anime et /manga : la liste complète.
// Les données viennent de api/_fiches.json (générées depuis index.html).
const DATA = require('./_fiches.json');
const SITE = 'https://animedexfr.fr';
const INDEX = { anime: new Map(DATA.anime.map(x => [x.id, x])), manga: new Map(DATA.manga.map(x => [x.id, x])) };
const LABEL = { anime: 'Animés', manga: 'Mangas' };

const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cut = (s, n) => { s = String(s || ''); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n - 30)).replace(/[ ,;:.]+$/, '') + '…'; };
const img = u => !u ? '' : (/^https?:\/\//.test(u) ? u : '/' + String(u).replace(/^\/+/, ''));
const amazon = q => 'https://www.amazon.fr/s?k=' + encodeURIComponent(q) + '&tag=animedexfr-21';

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
@media(max-width:600px){.top{grid-template-columns:1fr}.top img{max-width:210px}header nav a{padding:7px 8px;font-size:10px}}
`;

function shell({ title, desc, path, image, body, ld }) {
  const url = SITE + path;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="ANIMEDEX"><meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${esc(image || SITE + '/og-image.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-192.png">
<script>try{var t=localStorage.getItem('mx-theme');if(!t&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body>
<header><a class="brand" href="/"><i></i>ANIMEDEX</a><nav><a href="/anime">Animés</a><a href="/manga">Mangas</a><a href="/">Jeux</a></nav></header>
<main>${body}</main>
<footer>ANIMEDEX — encyclopédie fan-made non officielle · les œuvres citées appartiennent à leurs ayants droit<br>
<a href="/">Accueil</a> · <a href="/anime">Tous les animés</a> · <a href="/manga">Tous les mangas</a> · <a href="/confidentialite.html">Confidentialité</a></footer>
</body></html>`;
}

function related(it, type) {
  const g = new Set(it.genres || []);
  return DATA[type].filter(x => x.id !== it.id)
    .map(x => [x, (x.genres || []).filter(v => g.has(v)).length])
    .filter(p => p[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(p => p[0]);
}

function card(x, type) {
  return `<li><a href="/${type}/${x.id}"><img loading="lazy" src="${esc(img(x.image))}" alt="" width="230" height="345"><span>${esc(x.title)}</span></a></li>`;
}

function pageItem(it, type) {
  const isM = type === 'manga';
  const kind = isM ? 'Manga' : 'Animé';
  const title = isM
    ? `${it.title} (manga) — résumé et personnages | ANIMEDEX`
    : `${it.title} — résumé, personnages, openings et OST | ANIMEDEX`;
  const desc = cut(it.summary, 158);
  const meta = [
    ...(it.genres || []).map(g => `<span>${esc(g)}</span>`),
    it.year ? `<span class="soft">${esc(it.year)}</span>` : '',
    it.author ? `<span class="soft">${esc(it.author)}</span>` : '',
    it.status ? `<span class="soft">${esc(it.status)}</span>` : '',
    it.seasons ? `<span class="soft">${esc(it.seasons)}</span>` : ''
  ].join('');
  const chars = (it.characters || []).map(c => `<li>${c.image ? `<img loading="lazy" src="${esc(img(c.image))}" alt="" width="56" height="56">` : ''}<div><b>${esc(c.name)}</b>${c.role ? `<em>${esc(c.role)}</em>` : ''}${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div></li>`).join('');
  const list = (h, arr) => arr && arr.length ? `<div><h3>${h}</h3><ul>${arr.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : '';
  const music = isM ? '' : [list('Openings', it.openings), list('Endings', it.endings), list('OST', it.ost)].join('');
  const aff = isM
    ? [['Le manga (tome 1)', it.title + ' manga tome 1'], ['Tous les tomes', it.title + ' manga'], ['Produits dérivés', it.title + ' figurine']]
    : [['Blu-ray / DVD', it.title + ' blu-ray dvd'], ['Le manga', it.title + ' manga'], ['Figurines', it.title + ' figurine']];
  const rel = related(it, type);
  const body = `
<p class="crumb"><a href="/">Accueil</a> / <a href="/${type}">${LABEL[type]}</a> / ${esc(it.title)}</p>
<div class="top">
  <img src="${esc(img(it.image))}" alt="Couverture de ${esc(it.title)}" width="230" height="345">
  <div>
    <p class="kind">${kind}</p>
    <h1>${esc(it.title)}</h1>
    <div class="meta">${meta}</div>
    <p class="sum">${esc(it.summary)}</p>
    <div class="cta">
      <a class="btn main" href="/#${type}/${it.id}">Ouvrir la fiche complète</a>
      ${isM ? '' : `<a class="btn" href="/#music/${it.id}">Écouter les musiques</a>`}
      <a class="btn" href="/">Quiz et jeux</a>
    </div>
  </div>
</div>
${chars ? `<h2>Personnages de ${esc(it.title)}</h2><ul class="chars">${chars}</ul>` : ''}
${music ? `<h2>Musiques de ${esc(it.title)}</h2><div class="cols">${music}</div>` : ''}
<h2>Où trouver ${esc(it.title)}</h2>
<div class="aff">${aff.map(a => `<a href="${amazon(a[1])}" target="_blank" rel="sponsored nofollow noopener">${a[0]}</a>`).join('')}</div>
<p class="note">Liens affiliés Amazon : ANIMEDEX peut toucher une commission, sans coût pour toi.</p>
${rel.length ? `<h2>Dans le même genre</h2><ul class="grid">${rel.map(x => card(x, type)).join('')}</ul>` : ''}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': isM ? 'ComicSeries' : 'TVSeries',
    name: it.title, description: it.summary, genre: it.genres, image: img(it.image), inLanguage: 'ja',
    url: `${SITE}/${type}/${it.id}`,
    ...(it.year && /^\d{4}$/.test(it.year) ? (isM ? { startDate: it.year } : { datePublished: it.year }) : {}),
    ...(it.author ? { author: { '@type': 'Person', name: it.author } } : {}),
    ...(it.characters && it.characters.length ? { character: it.characters.slice(0, 12).map(c => ({ '@type': 'Person', name: c.name })) } : {})
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: LABEL[type], item: `${SITE}/${type}` },
      { '@type': 'ListItem', position: 3, name: it.title, item: `${SITE}/${type}/${it.id}` }]
  }];
  return shell({ title, desc, path: `/${type}/${it.id}`, image: img(it.image), body, ld });
}

function pageList(type) {
  const items = [...DATA[type]].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const isM = type === 'manga';
  const title = isM ? `Tous les mangas (${items.length} fiches) | ANIMEDEX` : `Tous les animés (${items.length} fiches) | ANIMEDEX`;
  const desc = isM
    ? `Les ${items.length} mangas du catalogue ANIMEDEX : résumé, auteur et personnages de chaque série.`
    : `Les ${items.length} animés du catalogue ANIMEDEX : résumé, personnages, openings, endings et OST de chaque série.`;
  const body = `
<p class="crumb"><a href="/">Accueil</a> / ${LABEL[type]}</p>
<p class="kind">Catalogue</p>
<h1>${isM ? 'Tous les mangas' : 'Tous les animés'}</h1>
<p class="lede">${desc}</p>
<h2>${items.length} fiches, de A à Z</h2>
<ul class="grid">${items.map(x => card(x, type)).join('')}</ul>`;
  return shell({ title, desc, path: `/${type}`, body });
}

function notFound(type) {
  const body = `<p class="kind">Erreur 404</p><h1>Fiche introuvable</h1>
<p class="lede">Cette fiche n'existe pas ou a changé d'adresse.</p>
<div class="cta"><a class="btn main" href="/${type === 'manga' ? 'manga' : 'anime'}">Voir le catalogue</a><a class="btn" href="/">Accueil</a></div>`;
  return shell({ title: 'Fiche introuvable | ANIMEDEX', desc: 'Cette fiche est introuvable sur ANIMEDEX.', path: '/', body });
}

module.exports = (req, res) => {
  const q = req.query || {};
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
  return res.status(200).send(pageItem(it, type));
};
