/**
 * Builds the #C review site from the bundled artifact exports in this folder.
 *
 * Each source .html is a self-unpacking bundle: the real page lives as a JSON
 * string inside <script type="__bundler/template">, and on load the bootstrap
 * does document.documentElement.replaceWith(...). Anything added to the OUTER
 * file is therefore destroyed at unpack time — the nav has to go INTO the
 * template string, which is what injectNav() does.
 *
 * Sources are never modified. Output lands in ./site.
 *
 *   node build-site.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not new URL().pathname — this folder sits under "#c", which
// import.meta.url carries as the percent-escape %23. Only fileURLToPath decodes it.
const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SRC, 'site');

// --- palette, lifted from the templates' own custom properties ---------------
const PAPER = '#EDE8DC';
const OBSIDIAN = '#0A0A0A';
const C = {
  canon: '#F25C05',
  cool: '#C6F035',
  chic: '#D4A017',
  charisme: '#6B2FD6',
  class: '#C41E1E',
  choco: '#3157FF',
};

/**
 * com: how the nav's "Communauté" entry resolves on this page.
 *   {id}    scroll to that element
 *   {text}  find the element whose text is exactly "Communauté" (offline page,
 *           which has the content but no section id) and drop the link if absent
 *   {href}  leave the page and land on the portal's canonical community section
 */
/** Where the "Communauté" link points from a page that has no such section. */
const COM_FALLBACK = 'proposition-a.html#pn-com';

const PAGES = [
  {
    src: 'Systeme C - Page complete.html',
    out: 'proposition-a.html',
    group: 'proposals',
    title: 'Le Système complet',
    blurb:
      'Le système au complet : le monde, les six C, les créateurs, les opportunités, les expériences, la communauté, rejoindre.',
    accent: C.canon,
    com: { id: 't-com' },
  },
  {
    src: 'Systeme C - Page (hors ligne).html',
    out: 'proposition-b.html',
    group: 'proposals',
    title: 'Hors ligne',
    blurb:
      'Entièrement autonome. Bodoni Moda, navigation en verre, outfit check, brief, villes, FAQ.',
    accent: C.choco,
    com: { text: true },
  },
  {
    src: 'C - Landing (standalone).html',
    out: 'proposition-c.html',
    group: 'proposals',
    title: 'Le Landing',
    blurb:
      'Page d’atterrissage autonome, en une coulée : concept, mur, ce que tu y gagnes, candidature.',
    accent: C.cool,
    com: { text: true },
  },
  {
    src: 'Variante A - Le Journal.html',
    out: 'proposition-d.html',
    group: 'proposals',
    title: 'Le Journal',
    blurb: 'Papier, colonnes et filets. Une lecture éditoriale, dense et posée.',
    accent: C.chic,
    com: { id: 'jr-t-com' },
  },
  {
    src: 'Variante B - Plein ecran.dc.html',
    out: 'proposition-e.html',
    group: 'proposals',
    title: 'Le Plein écran',
    blurb: 'Section par section, en plein écran. Défilement par paliers, rythme cinéma.',
    accent: C.class,
    com: { id: 'pe-07' },
  },
  {
    src: 'Variante C - Le Studio.html',
    out: 'proposition-f.html',
    group: 'proposals',
    title: 'Le Studio',
    blurb: "Rail latéral numéroté, scène centrale. Une navigation d'atelier.",
    accent: C.charisme,
    com: { id: 'st-07' },
  },
  {
    src: 'Rejoindre C.html',
    out: 'rejoindre.html',
    group: 'inner',
    title: 'Rejoindre #C',
    tabTitle: 'Rejoindre #C — Deviens C.',
    blurb: "Le formulaire de candidature — nom, âge, ville, WhatsApp, e-mail, motivation.",
    accent: PAPER,
    com: { href: COM_FALLBACK },
  },
  {
    src: 'Carte de partage C.html',
    out: 'carte-partage.html',
    group: 'inner',
    title: 'Carte de partage',
    tabTitle: 'OG-01 — Carte de partage #C',
    blurb: 'OG-01 — la carte de partage social, 1200 × 630.',
    accent: PAPER,
    com: { href: COM_FALLBACK },
  },
];

// The six proposals are labelled A–F by position, so reordering the list above
// relabels everything at once and nothing can drift out of sync.
const LETTERS = 'ABCDEF';
const proposals = PAGES.filter((p) => p.group === 'proposals');
for (const p of proposals) {
  p.letter = LETTERS[proposals.indexOf(p)];
  p.nav = p.letter;
  p.tabTitle = `#C / ${p.letter} — ${p.title}`;
}

// --- bundle plumbing ---------------------------------------------------------

function readBundle(file) {
  const lines = fs.readFileSync(path.join(SRC, file), 'utf8').split('\n');
  const at = (tag) => {
    const i = lines.findIndex((l) => l.includes(`<script type="__bundler/${tag}">`));
    return i === -1 ? -1 : i + 1;
  };
  const tI = at('template');
  const mI = at('manifest');
  if (tI === -1) throw new Error(`${file}: no __bundler/template`);
  return { lines, tI, mI, template: JSON.parse(lines[tI]) };
}

/**
 * Re-encode a template string back onto its script line. The `</` -> `</`
 * pass is load-bearing: without it the `</script>` inside the injected nav
 * would close the __bundler/template tag early and the page would never
 * unpack. / parses back to `/`, so the template is byte-identical after
 * JSON.parse — this is the same escaping the bundle's own producer applies
 * (visible as the `</title>` sequences already in the sources).
 */
function encodeTemplate(t) {
  return JSON.stringify(t).replace(/<\//g, '<\\u002F');
}

/** The bundler's own per-page preview SVG, and its dominant background. */
function thumbOf(file) {
  const s = fs.readFileSync(path.join(SRC, file), 'utf8').slice(0, 20000);
  const m = s.match(/<div id="__bundler_thumbnail">([\s\S]*?)<\/div>/);
  if (!m) return { svg: '', bg: OBSIDIAN };
  const svg = m[1].trim();
  const bg = (svg.match(/<rect[^>]*fill="(#[0-9a-fA-F]{3,8})"/) || [])[1] || OBSIDIAN;
  return { svg, bg };
}

// --- fonts: pulled straight out of a manifest so the portal matches the pages -

function extractFonts(file) {
  const { template, lines, mI } = readBundle(file);
  const manifest = JSON.parse(lines[mI]);
  const dir = path.join(OUT, 'assets', 'fonts');
  fs.mkdirSync(dir, { recursive: true });

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const css = [];
  // One woff2 per uuid, not per @font-face block. A family ships the same file
  // across several blocks that differ only by unicode-range (latin, latin-ext,
  // math…), so keying on the block would write each font three times over.
  const written = new Map();

  for (const block of template.match(/@font-face\s*\{[\s\S]*?\}/g) || []) {
    const uuid = (block.match(/url\("([0-9a-f-]{36})"\)/) || [])[1];
    if (!uuid) continue;
    const entry = manifest[uuid];
    if (!entry || !/font\//.test(entry.mime) || entry.compressed) continue;

    let name = written.get(uuid);
    if (!name) {
      const fam = (block.match(/font-family:\s*'([^']+)'/) || [])[1] || 'font';
      const style = (block.match(/font-style:\s*([\w ]+?)\s*;/) || [])[1] || 'normal';
      // Variable fonts declare a range ("100 900"); keep it whole for the filename.
      const weight = ((block.match(/font-weight:\s*([\d ]+?)\s*;/) || [])[1] || '400')
        .trim()
        .replace(/\s+/g, '-');
      name = `${slug(fam)}-${slug(style)}-${weight}-${written.size + 1}.woff2`;
      fs.writeFileSync(path.join(dir, name), Buffer.from(entry.data, 'base64'));
      written.set(uuid, name);
    }
    css.push(block.replace(/url\("[0-9a-f-]{36}"\)/, `url("./${name}")`));
  }

  fs.writeFileSync(path.join(dir, 'fonts.css'), css.join('\n') + '\n', 'utf8');
  return written.size;
}

// --- the injected nav --------------------------------------------------------

const NAV_CSS = `
#pnav{position:fixed;left:50%;bottom:16px;z-index:99000;max-width:calc(100vw - 20px);
transform:translateX(-50%);transition:transform .4s cubic-bezier(.4,0,.2,1),opacity .26s ease;
font-family:'Switzer',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
font-size:11.5px;line-height:1;-webkit-font-smoothing:antialiased}
#pnav[data-state=hide]{transform:translateX(-50%) translateY(190%);opacity:0;pointer-events:none}
#pnav-in{display:flex;align-items:center;gap:1px;padding:5px 6px;border-radius:999px;
background:rgba(10,10,10,.74);border:1px solid rgba(237,232,220,.15);
box-shadow:0 10px 34px rgba(0,0,0,.5),0 1px 0 rgba(237,232,220,.06) inset;
-webkit-backdrop-filter:blur(16px) saturate(1.5);backdrop-filter:blur(16px) saturate(1.5);
overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
#pnav-in::-webkit-scrollbar{display:none}
#pnav a,#pnav span.pnav-i{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex:none;
padding:8px 12px;border-radius:999px;text-decoration:none;border:0;background:transparent;
color:rgba(237,232,220,.58);font-weight:500;letter-spacing:.075em;text-transform:uppercase;
transition:color .18s ease,background-color .18s ease;-webkit-tap-highlight-color:transparent}
#pnav a:hover{color:${PAPER};background:rgba(237,232,220,.09)}
#pnav .pnav-cur{color:${PAPER};background:rgba(237,232,220,.08);cursor:default}
#pnav .pnav-cur::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--pnav-a)}
#pnav .pnav-cta{color:${OBSIDIAN};background:var(--pnav-a);font-weight:700}
#pnav .pnav-cta:hover{color:${OBSIDIAN};background:var(--pnav-a);filter:brightness(1.12)}
#pnav .pnav-d{width:1px;height:15px;margin:0 5px;flex:none;background:rgba(237,232,220,.18);
padding:0;border-radius:0}
@media (max-width:560px){#pnav{left:10px;right:10px;transform:none;max-width:none}
#pnav[data-state=hide]{transform:translateY(190%)}}
@media (prefers-reduced-motion:reduce){#pnav{transition:none}}
`.trim();

function navJs(comSpec) {
  return `
(function(){
var nav=document.getElementById('pnav');if(!nav)return;
var COM=${JSON.stringify(comSpec)};
function norm(e){return (e.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();}
function findCom(){
  if(!COM)return null;
  if(COM.id)return document.getElementById(COM.id);
  if(!COM.text)return null;
  // Exact label first — the offline export titles its section plainly.
  var els=document.querySelectorAll('h1,h2,h3,h4,span,div,p,li');
  for(var i=0;i<els.length;i++){var e=els[i];
    if(e.children.length)continue;
    var t=norm(e);
    if(t==='communaut\\u00e9'||t==='communaute')return e;}
  // Then a short heading that merely contains it ("Une communauté" on the
  // landing page). Headings only, and length-capped, so a body paragraph
  // that happens to mention the word cannot win.
  var hs=document.querySelectorAll('h1,h2,h3,h4');
  for(var j=0;j<hs.length;j++){var h=hs[j],ht=norm(h);
    if(ht.length<=40&&ht.indexOf('communaut')!==-1)return h;}
  return null;
}
// scrollIntoView aligns to the viewport top and knows nothing about a sticky
// header covering that band — the landing and offline pages both have one, the
// variants don't. Measure whatever is actually pinned up there instead of
// guessing a constant.
function headerOffset(){
  var max=0,all=document.body.getElementsByTagName('*');
  for(var i=0;i<all.length&&i<3000;i++){var e=all[i];
    if(e.id==='pnav')continue;
    var cs=window.getComputedStyle(e);
    if(cs.position!=='fixed'&&cs.position!=='sticky')continue;
    var r=e.getBoundingClientRect();
    // Floating pills sit inset from the edge, so allow slack at the top; what
    // gets covered is the bar's bottom edge, not its height.
    if(r.top>48||r.height>160||r.width<240)continue;
    if(r.bottom>max)max=r.bottom;}
  return max>0?Math.round(max)+16:0;
}
function goCom(e){var t=findCom();if(!t)return;
  if(e)e.preventDefault();
  try{t.style.scrollMarginTop=headerOffset()+'px';}catch(_){}
  try{t.scrollIntoView({behavior:'smooth',block:'start'});}catch(_){t.scrollIntoView();}}
var link=nav.querySelector('.pnav-com');
if(link&&!COM.href){
  link.addEventListener('click',goCom);
  setTimeout(function(){if(!findCom())link.style.display='none';},1500);
}
if(location.hash==='#pn-com')setTimeout(function(){goCom(null);},700);
var timer=null;
function show(){nav.setAttribute('data-state','show');}
function hide(){nav.setAttribute('data-state','hide');}
// These pages disagree about what scrolls: the document on one, a nested
// #pe-scroll on another, <body overflow-y:auto> on a third. Trust whichever
// element the event came from, so long as it really is a scroller.
document.addEventListener('scroll',function(ev){
  var el=ev.target,y,key;
  if(el&&el.nodeType===1&&el!==document.documentElement&&el.scrollHeight>el.clientHeight+4){
    y=el.scrollTop;key=el;
  }else{
    y=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;key=window;
  }
  var prev=key.__pnavY;key.__pnavY=y;
  if(prev!=null){var d=y-prev;if(d>6)hide();else if(d<-6)show();}
  clearTimeout(timer);timer=setTimeout(show,900);
},true);
})();
`.trim();
}

function navHtml(page) {
  const items = [];
  items.push(`<a href="index.html">◂ Portail</a>`);
  items.push(`<i class="pnav-d"></i>`);

  for (const p of PAGES) {
    if (!p.nav) continue;
    items.push(
      p.out === page.out
        ? `<span class="pnav-i pnav-cur">${p.nav}</span>`
        : `<a href="${p.out}">${p.nav}</a>`
    );
  }

  items.push(`<i class="pnav-d"></i>`);
  items.push(
    `<a class="pnav-com" href="${page.com.href || '#pn-com'}">Communauté</a>`
  );
  if (page.out !== 'rejoindre.html') {
    items.push(`<a class="pnav-cta" href="rejoindre.html">Rejoindre →</a>`);
  }

  return (
    `<style>${NAV_CSS}</style>` +
    `<div id="pnav" data-portal-nav data-state="show" style="--pnav-a:${page.accent}">` +
    `<div id="pnav-in">${items.join('')}</div></div>` +
    `<script>${navJs(page.com)}</script>`
  );
}

/**
 * Stamp the review label into the tab title. Two of the exports ship no <title>
 * at all — their <helmet> carries viewport and font links only, so the tab fell
 * back to the raw URL — and the rest carry near-identical titles that are
 * indistinguishable once six of them are open side by side.
 */
function setTitle(t, page) {
  const tag = `<title>${esc(page.tabTitle || page.title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(t)) return t.replace(/<title>[\s\S]*?<\/title>/i, tag);
  const head = t.match(/<head[^>]*>/i);
  if (!head) return t;
  const i = head.index + head[0].length;
  return t.slice(0, i) + tag + t.slice(i);
}

function injectNav(page) {
  const b = readBundle(page.src);
  let t = setTitle(b.template, page);

  const close = t.lastIndexOf('</body>');
  const markup = navHtml(page);
  t = close === -1 ? t + markup : t.slice(0, close) + markup + t.slice(close);

  b.lines[b.tI] = encodeTemplate(t);
  fs.writeFileSync(path.join(OUT, page.out), b.lines.join('\n'), 'utf8');

  // Cheap guarantee that the round-trip is lossless and the escaping held.
  const back = JSON.parse(b.lines[b.tI]);
  if (back.indexOf('id="pnav"') === -1) throw new Error(`${page.out}: nav lost in re-encode`);
  return Buffer.byteLength(b.lines.join('\n'));
}

// --- portal ------------------------------------------------------------------

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card(page, big) {
  const { svg, bg } = thumbOf(page.src);
  const badge = page.letter ? `Proposition ${page.letter}` : 'Page interne';
  return `      <a class="card${big ? ' card-lg' : ''}" href="${page.out}" style="--a:${page.accent}">
        <span class="thumb" style="background:${bg}">${svg}</span>
        <span class="body">
          <span class="num">${badge}</span>
          <span class="name">${esc(page.title)}</span>
          <span class="blurb">${esc(page.blurb)}</span>
          <span class="go">Ouvrir <i>↗</i></span>
        </span>
      </a>`;
}

function portal() {
  const by = (g) => PAGES.filter((p) => p.group === g);
  const favicon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230A0A0A'/%3E%3Ctext x='16' y='24' font-family='Helvetica,Arial' font-weight='900' font-size='22' text-anchor='middle' fill='%23EDE8DC'%3EC%3C/text%3E%3C/svg%3E";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>#C — Portail des propositions</title>
<meta name="description" content="Revue de design #C : deux propositions, trois variantes et les pages internes.">
<meta property="og:title" content="#C — Portail des propositions">
<meta property="og:description" content="Revue de design #C : deux propositions, trois variantes et les pages internes.">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="${OBSIDIAN}">
<link rel="icon" href="${favicon}">
<link rel="stylesheet" href="assets/fonts/fonts.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--paper:${PAPER};--ink:${OBSIDIAN};--dim:rgba(237,232,220,.52);--line:rgba(237,232,220,.14)}
html{-webkit-text-size-adjust:100%}
body{background:var(--ink);color:var(--paper);min-height:100vh;
font-family:'Switzer',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
::selection{background:${C.canon};color:var(--ink)}
a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(20px,5vw,56px)}

header{padding:clamp(64px,13vh,140px) 0 clamp(40px,7vh,72px);border-bottom:1px solid var(--line)}
.eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);margin-bottom:clamp(28px,6vh,52px)}
.mark{font-size:clamp(88px,20vw,240px);font-weight:900;letter-spacing:-.055em;line-height:.82}
.tag{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;
font-size:clamp(24px,4.6vw,52px);line-height:1.12;margin-top:clamp(16px,3vh,28px);color:var(--paper)}
.rule{height:6px;background:${C.canon};margin-top:clamp(26px,5vh,44px);max-width:min(100%,560px)}
.meta{margin-top:22px;font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}

section{padding:clamp(48px,8vh,84px) 0}
section+section{border-top:1px solid var(--line)}
.sec{display:flex;align-items:baseline;gap:14px;font-size:11px;letter-spacing:.22em;
text-transform:uppercase;color:var(--dim);font-weight:500;margin-bottom:clamp(24px,4vh,38px)}
.sec::after{content:'';flex:1;height:1px;background:var(--line)}

.grid{display:grid;gap:clamp(14px,2vw,22px)}
.g2{grid-template-columns:repeat(2,1fr)}
.g3{grid-template-columns:repeat(3,1fr)}
@media (max-width:860px){.g2,.g3{grid-template-columns:1fr}}

.card{display:flex;flex-direction:column;text-decoration:none;overflow:hidden;
border:1px solid var(--line);border-radius:3px;background:rgba(237,232,220,.02);
transition:border-color .3s ease,background-color .3s ease,transform .3s ease}
.card:hover{border-color:var(--a);background:rgba(237,232,220,.045);transform:translateY(-3px)}
.card:focus-visible{outline:2px solid var(--a);outline-offset:3px}
.thumb{display:block;position:relative;aspect-ratio:3/2;overflow:hidden;border-bottom:1px solid var(--line)}
/* Proposals sit in the same 3-up rhythm as the variants; the taller thumbnail
   is what marks them as primary. */
.card-lg .thumb{aspect-ratio:4/3}
.card-lg .name{font-size:clamp(22px,2.7vw,32px)}
.thumb svg{position:absolute;inset:0;width:100%;height:100%;
transition:transform .5s cubic-bezier(.2,.7,.3,1)}
.card:hover .thumb svg{transform:scale(1.028)}
.thumb::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;
background:var(--a);transform:scaleX(0);transform-origin:0 50%;
transition:transform .42s cubic-bezier(.2,.7,.3,1)}
.card:hover .thumb::after{transform:scaleX(1)}

.body{display:flex;flex-direction:column;gap:9px;padding:clamp(18px,2.4vw,26px)}
.num{font-size:10.5px;letter-spacing:.2em;color:var(--a);font-weight:600}
.name{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(21px,2.5vw,29px);
line-height:1.12;letter-spacing:-.005em}
.blurb{font-size:14px;line-height:1.55;color:var(--dim);max-width:46ch}
.go{margin-top:6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
color:var(--dim);display:inline-flex;align-items:center;gap:7px;transition:color .25s ease}
.go i{font-style:normal;transition:transform .28s ease}
.card:hover .go{color:var(--paper)}
.card:hover .go i{transform:translate(3px,-3px)}

footer{padding:clamp(40px,7vh,72px) 0 clamp(56px,10vh,100px);border-top:1px solid var(--line);
font-size:12px;line-height:1.7;color:var(--dim)}
footer b{color:var(--paper);font-weight:500}
footer .prev{display:inline-block;margin-top:14px;font-size:11px;letter-spacing:.16em;
text-transform:uppercase;color:var(--dim);text-decoration:none;
border-bottom:1px solid var(--line);padding-bottom:3px;transition:color .2s ease,border-color .2s ease}
footer .prev:hover{color:var(--paper);border-color:var(--paper)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="eyebrow">Système C · Revue de design</div>
    <h1 class="mark">#C</h1>
    <p class="tag">Ton style mérite d’être vu.</p>
    <div class="rule"></div>
    <p class="meta">${by('proposals').length} propositions · ${by('inner').length} pages internes</p>
  </header>

  <main>
    <section>
      <h2 class="sec">Propositions — A à F</h2>
      <div class="grid g3">
${by('proposals').map((p) => card(p, true)).join('\n')}
      </div>
    </section>

    <section>
      <h2 class="sec">Pages internes</h2>
      <div class="grid g3">
${by('inner').map((p) => card(p, false)).join('\n')}
      </div>
    </section>
  </main>

  <footer>
    Chaque page porte une navigation flottante en bas d’écran :
    <b>Portail</b>, les propositions <b>A</b> à <b>F</b>, <b>Communauté</b> et <b>Rejoindre</b>.<br>
    Les pages se déballent au chargement — laisse-leur une seconde.<br>
    <a class="prev" href="legacy/pass-1.html">Archive — spécimen Pass 1</a>
  </footer>

</div>
</body>
</html>
`;
}

// --- run ---------------------------------------------------------------------

// Clear the contents rather than the directory itself: on Windows an open
// handle (a shell sitting in ./site, an editor, the indexer) makes removing
// the root itself fail with EPERM even when every child deletes fine.
fs.mkdirSync(OUT, { recursive: true });
for (const e of fs.readdirSync(OUT)) {
  fs.rmSync(path.join(OUT, e), { recursive: true, force: true });
}

const fontCount = extractFonts('Systeme C - Page complete.html');
console.log(`fonts   ${fontCount} woff2 -> assets/fonts/`);

let total = 0;
for (const p of PAGES) {
  const bytes = injectNav(p);
  total += bytes;
  console.log(`page    ${p.out.padEnd(26)} ${(bytes / 1048576).toFixed(2)} MB   ← ${p.src}`);
}

fs.writeFileSync(path.join(OUT, 'index.html'), portal(), 'utf8');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');
console.log(`portal  index.html`);
console.log(`total   ${(total / 1048576).toFixed(1)} MB`);
