/* Fabrique les pages statiques a partir de data/. Lancer : node outils/pages.mjs
   Le resultat va dans public/ et se commite. Pas d'etape de build au deploiement. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");
const lis = (f) => JSON.parse(readFileSync(resolve(RACINE, "data", f), "utf8"));

const S = lis("site.json");
const DIM = lis("images.json");   // largeurs reelles, relevees par outils/images.sh
const CHAMBRES = lis("chambres.json");
const FAQ = lis("faq.json");

const e = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- images ---------- */
// Un srcset ne doit jamais mentir : on declare les largeurs relevees sur le disque,
// et on saute une variante qui n'existe pas ou qui ne fait pas gagner de place.
function img(f, alt, { cls = "", lazy = true, tailles = "100vw", ratio = "" } = {}){
  const plein = DIM[f];
  if (!plein) throw new Error(`photo inconnue : ${f}`);
  const [w0, h0] = plein;

  const jeu = [];
  for (const suf of ["-640", "-1100", ""]){
    const d = DIM[f + suf];
    if (!d) continue;
    if (jeu.length && d[0] <= jeu[jeu.length - 1][1]) continue;  // doublon de largeur
    jeu.push([`/img/${f}${suf}.jpg`, d[0]]);
  }

  const classes = [cls, ratio ? "cadre-" + ratio : ""].filter(Boolean).join(" ");
  return `<img src="/img/${f}.jpg" srcset="${jeu.map(([u, w]) => `${u} ${w}w`).join(", ")}"` +
    ` sizes="${tailles}" width="${w0}" height="${h0}" alt="${e(alt)}"` +
    `${classes ? ` class="${classes}"` : ""}` +
    `${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high" decoding="async"'}>`;
}

/* ---------- petites icones au trait ---------- */
const T = {
  pers: '<path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a8 8 0 0116 0v1"/>',
  lit:  '<path d="M3 18V7m0 6h18m0 5V11a3 3 0 00-3-3H9v5M6.5 11.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>',
  m2:   '<path d="M4 4h16v16H4z"/><path d="M4 9h5V4M20 15h-5v5"/>',
  bain: '<path d="M3 12h18v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3zM6 12V6a2 2 0 014 0M7 19l-1 2M17 19l1 2"/>',
  wifi: '<path d="M2 8.5a16 16 0 0120 0M5 12a11 11 0 0114 0M8.5 15.5a6 6 0 017 0"/><circle cx="12" cy="19" r="1"/>',
  piscine: '<path d="M2 17c2 0 2 1.6 4 1.6S8 17 10 17s2 1.6 4 1.6S16 17 18 17s2 1.6 4 1.6M6 15V5a2 2 0 014 0v10M14 15V5a2 2 0 014 0v10M6 8h8M6 11.5h8"/>',
  bar:  '<path d="M4 4h16l-8 8v7M8 19h8M9 8h6"/>',
  linge:'<path d="M4 3h16v18H4zM7 6h3"/><circle cx="12" cy="14" r="4.5"/>',
  parking: '<path d="M4 3h16v18H4z"/><path d="M9.5 17V8h3a2.7 2.7 0 010 5.4h-3"/>',
  acces:'<circle cx="12" cy="4.2" r="1.8"/><path d="M11 8v5h5l2.5 7M7 11a6 6 0 108 7"/>',
  tel:  '<path d="M4.5 3h4l2 5-2.5 1.5a12 12 0 006.5 6.5L16 13.5l5 2v4a1.5 1.5 0 01-1.7 1.5A17 17 0 013 4.7 1.5 1.5 0 014.5 3z"/>',
  mail: '<path d="M3 5h18v14H3z"/><path d="M3 6l9 7 9-7"/>',
  lieu: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'
};
const ic = (k, c = "") => `<svg viewBox="0 0 24 24" aria-hidden="true"${c ? ` class="${c}"` : ""}>${T[k]}</svg>`;

/* ---------- entete, pied, bandeau ---------- */
function barre(actif){
  const liens = S.nav.map(l =>
    `<li><a href="${l.url}"${l.url === actif ? ' aria-current="page"' : ""}>${e(l.texte)}</a></li>`
  ).join("");
  return `<a class="saut" href="#corps">Skip to content</a>
<header class="barre">
  <div class="pl">
    <a class="marque" href="/">La Belle Vie<small>Koh Phangan</small></a>
    <button type="button" class="burger" aria-expanded="false" aria-label="Menu" aria-controls="menu">
      <span></span><span></span><span></span>
    </button>
    <nav id="menu" aria-label="Main">
      <ul>${liens}</ul>
      <a class="bt" href="${S.reservation}" target="_blank" rel="noopener">Book now</a>
    </nav>
  </div>
</header>
<div class="rideau" hidden-until-found></div>`;
}

const final = (titre, texte) => `<section class="final">
  <div class="pl serre">
    <span class="sur">Your stay</span>
    <h2>${e(titre)}</h2>
    <p>${e(texte)}</p>
    <div class="bts c"><a class="bt" href="${S.reservation}" target="_blank" rel="noopener">Book a room</a>
    <a class="bt clair" href="/contact">Talk to us</a></div>
  </div>
</section>`;

const CTA = ["Come home to happiness",
  "Discover the hidden corners of Koh Phangan, eat well, find the balance between comfort, style and art. Whether you are after quiet, adventure or a little of both, this is where the story starts."];

function pied(){
  const liens = S.nav.map(l => `<li><a href="${l.url}">${e(l.texte)}</a></li>`).join("");
  const ch = CHAMBRES.map(c =>
    `<li><a href="/accommodations/${c.cle}">${e(c.nom)}</a></li>`).join("");
  return `<footer>
  <div class="pl">
    <div class="pied">
      <div>
        <h4>La Belle Vie</h4>
        <p>${e(S.baseline)}</p>
        <p style="margin-top:14px"><a href="${S.facebook}" target="_blank" rel="noopener">Facebook</a>
        &nbsp;&middot;&nbsp;<a href="${S.instagram}" target="_blank" rel="noopener">Instagram</a></p>
      </div>
      <div><h4>Pages</h4><ul>${liens}</ul></div>
      <div><h4>Rooms</h4><ul>${ch}</ul></div>
      <div>
        <h4>Find us</h4>
        <ul>
          <li>${e(S.adresse)}</li>
          <li><a href="tel:${S.telLien}">${e(S.tel)}</a></li>
          <li><a href="mailto:${S.mail}">${e(S.mail)}</a></li>
        </ul>
      </div>
    </div>
    <div class="bas">
      <span>&copy; <span id="annee">2026</span> ${e(S.nomLong)}</span>
      <span>Ban Tai, Koh Phangan, Thailand</span>
    </div>
  </div>
</footer>`;
}

/* ---------- donnees structurees pour Google ---------- */
function jsonld(extra){
  const hotel = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: S.nomLong,
    description: S.baseline,
    url: S.site,
    telephone: S.tel,
    email: S.mail,
    image: [`${S.site}/img/pool-wide.jpg`, `${S.site}/img/deck-salah.jpg`],
    address: { "@type": "PostalAddress", streetAddress: "112, 5, Ban Tai",
      addressLocality: "Koh Phangan", addressRegion: "Surat Thani",
      postalCode: "84280", addressCountry: "TH" },
    geo: { "@type": "GeoCoordinates", latitude: S.geo.lat, longitude: S.geo.lon },
    numberOfRooms: 6,
    petsAllowed: false,
    sameAs: [S.facebook, S.instagram],
    amenityFeature: S.services.map(s =>
      ({ "@type": "LocationFeatureSpecification", name: s.nom, value: true }))
  };
  const tout = extra ? [hotel, extra] : [hotel];
  return tout.map(o =>
    `<script type="application/ld+json">${JSON.stringify(o)}<\/script>`).join("\n");
}

/* ---------- squelette ---------- */
function page({ url, titre, desc, ogImage = "pool-wide", actif, corps, extraLd = null,
                script = null, horsIndex = false }){
  const canon = S.site + (url === "/" ? "/" : url);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${e(titre)}</title>
<meta name="description" content="${e(desc)}">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${e(S.nomLong)}">
<meta property="og:title" content="${e(titre)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${S.site}/img/${ogImage}.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2E1805">
${horsIndex ? '<meta name="robots" content="noindex,follow">\n' : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Forum&family=Work+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/assets/lbv.css">
<script>document.documentElement.className="js"<\/script>
${jsonld(extraLd)}
</head>
<body>
${barre(actif)}
<main id="corps">
${corps}
</main>
${pied()}
<script src="/assets/lbv.js" defer><\/script>
${script ? `<script src="${script}" defer><\/script>` : ""}
</body>
</html>
`;
}

function ecris(chemin, html){
  const f = resolve(RACINE, "public", chemin);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, html);
  return chemin;
}

/* ---------- morceaux reutilises ---------- */
const reperes = (c) => `<ul class="reperes">
  <li>${ic("pers")}${c.pour} guests</li>
  <li>${ic("lit")}${e(c.lits)}</li>
  <li>${ic("m2")}${c.surface} m&sup2;</li>
  <li>${ic("bain")}${c.sdb} bathroom</li>
</ul>`;

const carte = (c) => `<article class="ch monte">
  <a class="vignette" href="/accommodations/${c.cle}" tabindex="-1" aria-hidden="true">
    ${img(c.photos[0].f, c.photos[0].alt, { tailles: "(min-width:900px) 380px, 92vw" })}
  </a>
  <div class="dedans">
    <p class="pour">Ideal for ${c.pour}</p>
    <h3><a href="/accommodations/${c.cle}">${e(c.nom)}</a></h3>
    <p>${e(c.resume)}</p>
    ${reperes(c)}
    <div class="bts"><a class="bt vide" href="/accommodations/${c.cle}">See details</a></div>
  </div>
</article>`;

const blocServices = () => `<div class="services">` + S.services.map(s =>
  `<div class="sv monte">${ic(s.icone)}<span>${e(s.nom)}</span></div>`).join("") + `</div>`;

const blocFaq = () => `<div class="faq">` + FAQ.map(([q, r]) =>
  `<details><summary>${e(q)}</summary><div class="rep"><p>${e(r)}</p></div></details>`
).join("") + `</div>`;

const faqLd = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: FAQ.map(([q, r]) => ({ "@type": "Question", name: q,
    acceptedAnswer: { "@type": "Answer", text: r } }))
};

/* une photo cliquable pour la visionneuse. `l` est le nombre de colonnes
   qu'elle occupe sur la grille de six. */
const vue = (f, alt, l = 2) =>
  `<a href="/img/${f}.jpg" data-vue="/img/${f}.jpg" data-lg="${e(alt)}" data-l="${l}">` +
  img(f, alt, { tailles: l === 6 ? "(min-width:900px) 1100px, 92vw"
                     : l === 3 ? "(min-width:900px) 560px, 92vw"
                               : "(min-width:900px) 370px, 46vw" }) + `</a>`;

/* La derniere rangee doit toujours se remplir, sans jamais produire un pave
   qui ecrase le reste. Multiple de trois : trois par rangee. Pair : deux par
   rangee, ce qui donne un carre propre a quatre photos. Sinon on elargit la
   derniere rangee de ce qu'il faut. */
function galerie(photos){
  const n = photos.length;
  let large = (i) => 2;
  if (n % 3 === 0)       large = () => 2;
  else if (n % 2 === 0)  large = () => 3;
  else {
    const reste = n % 3;
    const debut = n - reste;
    const fin = reste === 1 ? 6 : 3;
    large = (i) => i >= debut ? fin : 2;
  }
  return `<div class="galerie">` + photos.map(([f, alt], i) =>
    vue(f, alt, large(i))).join("") + `</div>`;
}

/* ============================================================ */
/*  HOME                                                        */
/* ============================================================ */
const home = page({
  url: "/", actif: "/", ogImage: "deck-salah", extraLd: faqLd,
  titre: "Boutique Hotel in Ban Tai, Koh Phangan | La Belle Vie Adults Only",
  desc: "A six room adults only boutique hotel in Ban Tai, Koh Phangan. Art by Anis Dargaa, a lagoon pool, private garden terraces and step free access throughout.",
  corps: `
<section class="haut">
  ${img("deck-salah", "Teak deck and thatched salah beside the pool at La Belle Vie", { lazy:false, tailles:"100vw" })}
  <div class="pl">
    <span class="sur">Ban Tai &middot; Koh Phangan</span>
    <h1>La Belle Vie</h1>
    <p>Not just a hotel. A sanctuary of six rooms, where art and quiet are given the same care as the linen.</p>
    <ul class="pastilles">
      <li>6 rooms only</li><li>Adults only</li><li>Lagoon pool</li><li>Step free throughout</li>
    </ul>
    <div class="bts">
      <a class="bt" href="${S.reservation}" target="_blank" rel="noopener">Book now</a>
      <a class="bt clair" href="/accommodations">Our rooms</a>
    </div>
  </div>
</section>

<section>
  <div class="pl deux penche">
    <div class="monte">
      <span class="sur">Discover La Belle Vie</span>
      <h2>A unique adults only boutique resort.</h2>
      <hr class="filet">
      <p class="lead" style="margin-top:26px">On the quiet shore of Ban Tai, a short walk from the sand, six rooms and a lagoon pool sit inside one walled garden. Nothing here is shared with a crowd.</p>
      <p>Every room carries original work by ${e(S.artiste)}. No two are alike. Six keys means the team knows your name by the second morning. It also means the pool is rarely busy.</p>
      <ul class="pts">
        <li>A hundred metres from Ban Tai beach, far enough for silence</li>
        <li>Twenty five minutes from anywhere on the island</li>
        <li>Private garden and terrace with every room</li>
        <li>One level throughout, no step at the door</li>
      </ul>
      <div class="bts"><a class="bt" href="/about">About the house</a></div>
    </div>
    <div class="monte">${img("pool-wide", "The lagoon pool at La Belle Vie, with terracotta warrior statues along the far edge", { tailles:"(min-width:860px) 560px, 92vw", ratio:"haut" })}</div>
  </div>
</section>

<section class="alt">
  <div class="pl">
    <div class="centre">
      <span class="sur">Accommodation</span>
      <h2>Six rooms, no two alike.</h2>
      <hr class="filet c">
    </div>
    <div class="chambres">${CHAMBRES.map(carte).join("")}</div>
  </div>
</section>

<section class="bande">
  ${img("pool-loungers", "Sun loungers and an outdoor shower beside the pool, among palms and boulders", { tailles:"100vw" })}
  <div class="pl serre centre">
    <span class="sur">The pool</span>
    <h2>When your soul meets your home.</h2>
    <p style="margin-top:20px">Step into the lagoon pool, surrounded by green and a sea breeze. Let the day go. Whether you are floating, reading in the shade or out exploring the island, this is the place you come back to.</p>
  </div>
</section>

<section>
  <div class="pl">
    <div class="centre">
      <span class="sur">What is here</span>
      <h2>Everything included, nothing to ask twice for.</h2>
      <hr class="filet c">
    </div>
    ${blocServices()}
  </div>
</section>

<section class="sombre">
  <div class="pl deux inverse">
    <div class="monte">${img("elephant-red", "Red lacquered elephant sculpture by Anis Dargaa on a plinth in the garden", { tailles:"(min-width:860px) 520px, 92vw" , ratio:"haut" })}</div>
    <div class="monte">
      <span class="sur">Art in the house</span>
      <h2>Anis Dargaa lives on these walls.</h2>
      <hr class="filet">
      <p style="margin-top:26px">The elephant is the thread. It appears in red above one bed, in blue above another, as a lacquered sculpture by the pool. Each piece was chosen for the room it stands in, not bought by the metre.</p>
      <p>Around the water, a row of terracotta warriors and a bronze gong keep watch. Guests notice them at different hours, as the light moves.</p>
    </div>
  </div>
</section>

<section>
  <div class="pl">
    <div class="centre">
      <span class="sur">The property</span>
      <h2>Designed for doing nothing well.</h2>
      <hr class="filet c">
    </div>
    ${galerie([
      ["pool-wide", "Wide view of the lagoon pool with palms and statues"],
      ["deck-salah", "Teak deck leading to the thatched salah and hanging egg chairs"],
      ["warrior-gong", "Terracotta warrior statue and a bronze gong beside the water"],
      ["pool-loungers", "Sun loungers and the sculpted outdoor shower"],
      ["presidential-3", "Terrace with water features and a rattan daybed"],
      ["triple-3", "Private garden with a round rattan daybed under the palms"]
    ])}
  </div>
</section>

<section class="alt">
  <div class="pl serre">
    <div class="centre"><span class="sur">Good to know</span><h2>Questions we are asked</h2><hr class="filet c"></div>
    ${blocFaq()}
  </div>
</section>

${final(CTA[0], CTA[1])}`
});
ecris("index.html", home);

/* ============================================================ */
/*  ABOUT                                                       */
/* ============================================================ */
ecris("about/index.html", page({
  url: "/about", actif: "/about", ogImage: "deck-salah",
  titre: "About La Belle Vie | Boutique Hotel in Ban Tai, Koh Phangan",
  desc: "The story behind La Belle Vie, an adults only boutique hotel in Ban Tai, Koh Phangan. Art, comfort and quiet, in six rooms on one level.",
  corps: `
<section class="haut court">
  ${img("presidential-5", "Four poster bed behind white voile curtains in the Presidential Suite", { lazy:false })}
  <div class="pl">
    <span class="sur">About us</span>
    <h1 style="font-size:clamp(38px,7vw,78px)">Where art, comfort<br>and quiet meet</h1>
  </div>
</section>

<section>
  <div class="pl serre">
    <span class="sur">Our story</span>
    <h2>What "la belle vie" actually means.</h2>
    <hr class="filet">
    <p class="lead" style="margin-top:28px">It means the good life, taken slowly. The house was built out of a liking for art, for design and for looking after people properly. Those three things are still what it runs on.</p>
    <p>La Belle Vie sits on the quiet shore of Ban Tai. It is less a hotel than a canvas. Six rooms, each made differently, each furnished to its own plan and hung with work by ${e(S.artiste)}. Every piece has a story behind it. Every room is a small world that holds together on its own.</p>
    <div class="bts"><a class="bt" href="/accommodations">See the rooms</a></div>
  </div>
</section>

<section class="alt">
  <div class="pl deux">
    <div class="monte">${img("salah-2", "King bed with a deep red headboard under a red elephant artwork", { tailles:"(min-width:860px) 540px, 92vw" , ratio:"haut" })}</div>
    <div class="monte">
      <span class="sur">How we work</span>
      <h2>Six keys, one team that knows them all.</h2>
      <hr class="filet">
      <p style="margin-top:26px">With this few rooms the service can be personal without pretending. Someone is here to arrange a dinner, book a boat, find the right beach for the wind that day, or simply say good morning and mean it.</p>
      <p>Accessibility was decided before the first wall went up, not added afterwards. Every room, every bathroom, the entrance and the common areas are step free. A guest in a wheelchair uses the same rooms as everybody else, not a special one at the back.</p>
    </div>
  </div>
</section>

<section>
  <div class="pl deux inverse">
    <div class="monte">${img("pool-loungers", "Loungers and the sculpted outdoor shower beside the lagoon pool", { tailles:"(min-width:860px) 540px, 92vw" , ratio:"haut" })}</div>
    <div class="monte">
      <span class="sur">The heart of it</span>
      <h2>The lagoon pool.</h2>
      <hr class="filet">
      <p style="margin-top:26px">Everything turns around the water. The pool curves between boulders and planting, with loungers on the gravel and an outdoor shower cut into a white wall. Mornings are for swimming, afternoons for the shade of the salah.</p>
      <p>Travel is not really about the place you go to. It is about the handful of hours you remember afterwards. We try to supply a few of those.</p>
    </div>
  </div>
</section>

<section class="sombre">
  <div class="pl">
    <div class="centre"><span class="sur">Who is here</span><h2>A small house, kept by three people.</h2><hr class="filet c"></div>
    <div class="trois" style="margin-top:clamp(36px,4vw,56px)">
      <div class="monte"><h3>Alex</h3><p style="margin-top:12px">Built the house and lives in it. He chose the art, the trees and the angle of every terrace. He gets around on wheels, which is why the place has no steps.</p></div>
      <div class="monte"><h3>Fah</h3><p style="margin-top:12px">Concierge. She knows which boat captain turns up on time, which kitchen delivers late, where the sea is calm when the wind swings round.</p></div>
      <div class="monte"><h3>David</h3><p style="margin-top:12px">Concierge. He answers the emails, plans the arrivals and will have the transfer waiting before you have asked for it.</p></div>
    </div>
  </div>
</section>

${final(CTA[0], CTA[1])}`
}));

/* ============================================================ */
/*  ACCOMMODATIONS                                              */
/* ============================================================ */
ecris("accommodations/index.html", page({
  url: "/accommodations", actif: "/accommodations", ogImage: "salah-2",
  titre: "Rooms and Suites | La Belle Vie, Ban Tai, Koh Phangan",
  desc: "Six rooms and suites at La Belle Vie, an adults only boutique hotel in Ban Tai, Koh Phangan. From 40 to 68 square metres, each with a private garden terrace.",
  extraLd: {
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: CHAMBRES.map((c, i) => ({ "@type": "ListItem", position: i + 1,
      name: c.nom, url: `${S.site}/accommodations/${c.cle}` }))
  },
  corps: `
<section class="haut court">
  ${img("salah-3", "Wide view of the Private Salah room with a curved daybed and a red cabinet", { lazy:false })}
  <div class="pl">
    <span class="sur">Our rooms</span>
    <h1 style="font-size:clamp(38px,7vw,78px)">Six rooms,<br>six characters</h1>
  </div>
</section>

<section>
  <div class="pl serre centre">
    <h2>No two stays should be the same.</h2>
    <hr class="filet c">
    <p class="lead" style="margin-top:26px">Each of the six rooms is its own world, from 40 to 68 square metres, every one with a private garden and terrace. The work of ${e(S.artiste)} runs through all of them, not as decoration but as the reason the room looks the way it does.</p>
  </div>
  <div class="pl"><div class="chambres">${CHAMBRES.map(carte).join("")}</div></div>
</section>

<section class="alt">
  <div class="pl serre">
    <span class="sur">In every room</span>
    <h2>The same care, whichever key you get.</h2>
    <hr class="filet">
    <div class="trois" style="margin-top:clamp(32px,4vw,48px)">
      <div><h4>Comfort</h4><ul class="pts" style="margin-top:14px">
        <li>Air conditioning and a ceiling fan</li>
        <li>Tea and coffee maker</li>
        <li>Mini fridge</li><li>Flat screen television</li></ul></div>
      <div><h4>Bathroom</h4><ul class="pts" style="margin-top:14px">
        <li>Walk in shower, level floor</li>
        <li>Hairdryer and towels</li>
        <li>Beach towels on request</li></ul></div>
      <div><h4>Outside</h4><ul class="pts" style="margin-top:14px">
        <li>Private terrace</li><li>Private garden</li>
        <li>Step free access from the car</li></ul></div>
    </div>
  </div>
</section>

${final("Your room is not just a place to sleep",
  "Large windows bring the garden indoors. The linen, the lamps, the artwork, all of it was chosen so the room holds up at six in the morning as well as at midnight.")}`
}));

/* ============================================================ */
/*  UNE PAGE PAR CHAMBRE                                        */
/* ============================================================ */
for (const c of CHAMBRES){
  const autres = CHAMBRES.filter(x => x.cle !== c.cle).slice(0, 3);
  ecris(`accommodations/${c.cle}/index.html`, page({
    url: `/accommodations/${c.cle}`, actif: "/accommodations", ogImage: c.photos[0].f,
    titre: `${c.nom} | La Belle Vie, Koh Phangan`,
    desc: c.meta,
    extraLd: {
      "@context": "https://schema.org", "@type": "HotelRoom",
      name: c.nom, description: c.resume,
      image: c.photos.map(p => `${S.site}/img/${p.f}.jpg`),
      occupancy: { "@type": "QuantitativeValue", maxValue: c.pour },
      floorSize: { "@type": "QuantitativeValue", value: c.surface, unitCode: "MTK" },
      bed: { "@type": "BedDetails", typeOfBed: c.lits },
      containedInPlace: { "@type": "Hotel", name: S.nomLong, url: S.site }
    },
    corps: `
<section class="haut court">
  ${img(c.photos[0].f, c.photos[0].alt, { lazy:false })}
  <div class="pl">
    <span class="sur">Ideal for ${c.pour}</span>
    <h1 style="font-size:clamp(32px,5.6vw,62px);text-transform:none">${e(c.nom)}</h1>
  </div>
</section>

<section>
  <div class="pl deux penche">
    <div class="monte">
      <h2>${e(c.resume)}</h2>
      <hr class="filet">
      ${c.corps.map(p => `<p style="margin-top:22px">${e(p)}</p>`).join("")}
      ${reperes(c)}
      <div class="bts">
        <a class="bt" href="${S.reservation}" target="_blank" rel="noopener">Check availability</a>
        <a class="bt vide" href="/contact">Ask a question</a>
      </div>
    </div>
    <div class="monte">${img(c.photos[1] ? c.photos[1].f : c.photos[0].f,
      c.photos[1] ? c.photos[1].alt : c.photos[0].alt, { tailles:"(min-width:860px) 540px, 92vw", ratio:"haut" })}</div>
  </div>
</section>

<section class="alt">
  <div class="pl">
    <div class="centre"><span class="sur">The room</span><h2>Look around</h2><hr class="filet c"></div>
    ${galerie(c.photos.map(p => [p.f, p.alt]))}
  </div>
</section>

<section>
  <div class="pl">
    <div class="centre"><span class="sur">Included</span><h2>What comes with the room</h2><hr class="filet c"></div>
    ${blocServices()}
  </div>
</section>

<section class="sombre">
  <div class="pl serre">
    <div class="trois">
      <div><h3>House rules</h3><ul class="pts" style="margin-top:16px">
        <li>Check in from 3 PM to 8 PM</li>
        <li>Check out from 8 AM to 11 AM</li>
        <li>No smoking indoors</li>
        <li>No parties or events</li></ul></div>
      <div><h3>Cancellation</h3><ul class="pts" style="margin-top:16px">
        <li>Flexible rate: free until 30 days before arrival</li>
        <li>Inside 30 days, the full stay is charged</li>
        <li>Non refundable rate: charged in full at any time</li></ul></div>
      <div><h3>Access</h3><ul class="pts" style="margin-top:16px">
        <li>One level, no step at the door</li>
        <li>Level floor into the shower</li>
        <li>Parking beside the entrance</li></ul></div>
    </div>
  </div>
</section>

<section class="alt">
  <div class="pl">
    <div class="centre"><span class="sur">Also here</span><h2>The other rooms</h2><hr class="filet c"></div>
    <div class="chambres">${autres.map(carte).join("")}</div>
  </div>
</section>

${final(CTA[0], CTA[1])}`
  }));
}

/* ============================================================ */
/*  EVENTS : la maison entiere, pour un groupe                  */
/* ============================================================ */
const GOOGLE_G = '<svg viewBox="0 0 48 48" aria-hidden="true">' +
  '<path fill="#4285F4" d="M45 24.5c0-1.6-.1-2.8-.4-4H24v7.5h12c-.3 2-1.6 5-4.5 7l6.9 5.3C42.5 36.5 45 31 45 24.5z"/>' +
  '<path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.2 15.4 46 24 46z"/>' +
  '<path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z"/>' +
  '<path fill="#EA4335" d="M24 10.5c3.2 0 6 1.1 8.2 3.2l6.1-6.1C34.9 4.1 29.9 2 24 2 15.4 2 8 6.8 4.4 14l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/></svg>';

ecris("events/index.html", page({
  url: "/events", actif: "/events", ogImage: "deck-salah",
  script: "/assets/events.js", horsIndex: true,
  titre: "Private events and buyouts | La Belle Vie, Koh Phangan",
  desc: "Take the whole of La Belle Vie for your group. Six rooms, a lagoon pool and a private garden on Koh Phangan, for retreats, offsites and celebrations.",
  corps: `
<div class="porte" id="porte" role="dialog" aria-modal="true" aria-labelledby="porte-t">
  <div class="boite">
    <span class="sur">Private events</span>
    <h2 id="porte-t">See dates and prices</h2>
    <p>Sign in once and the calendar, the calculator and our rates open up.</p>
    <button type="button" class="gg" id="porte-go">${GOOGLE_G}Continue with Google</button>
    <button type="button" class="sinon" id="porte-non">Continue without signing in</button>
    <p class="note"><strong>This is a demonstration.</strong> Nothing is asked of you and
    nothing is created: no password, no account, no email. Either button simply opens
    the page. The real sign in comes later.</p>
  </div>
</div>

<section class="haut court">
  ${img("deck-salah", "The teak deck and thatched salah at La Belle Vie, set for a group", { lazy:false })}
  <div class="pl">
    <span class="sur">Private events</span>
    <h1 style="font-size:clamp(36px,6.6vw,74px)">The whole house,<br>one group at a time</h1>
  </div>
</section>

<section>
  <div class="pl deux penche">
    <div class="monte">
      <span class="sur">What you get</span>
      <h2>Not a venue you share. A house you are handed the keys to.</h2>
      <hr class="filet">
      <p style="margin-top:26px">When you take La Belle Vie privately, you take all of it. The
      <span id="chambres">6</span> rooms, the lagoon pool, the salah, the garden, the bar.
      No other guests, no timetable but yours, no one at the next table.</p>
      <p>It suits a retreat, a company offsite, a wedding party, a birthday or a shoot.
      The house sleeps up to <span id="capacite">15</span>. It is let for a minimum of
      <span id="minimum">5</span> nights.</p>
      <ul class="pts">
        <li>Every room on one level, no step anywhere</li>
        <li>Breakfast for everyone, every morning, included</li>
        <li>A self service bar with soft drinks, juice, coffee and tea</li>
        <li>A concierge who knows the island and answers all day</li>
        <li>Meals, transfers, a meeting room and activities on request</li>
      </ul>
    </div>
    <div class="monte">${img("presidential-3", "Terrace with water features and a rattan daybed", { tailles:"(min-width:860px) 540px, 92vw", ratio:"haut" })}</div>
  </div>
</section>

<section class="alt" id="calendrier">
  <div class="pl">
    <div class="centre">
      <span class="sur">Availability</span>
      <h2>Pick your window</h2>
      <hr class="filet c">
      <p class="lead" style="margin-top:22px;max-width:60ch;margin-inline:auto">Click an
      arrival, then a departure. Crossed dates are already taken.</p>
    </div>
    <div class="pl" style="padding-inline:0">
      <div class="navmois">
        <button type="button" id="prec" aria-label="Previous months">&lsaquo;</button>
        <ul class="legende">
          <li><i class="l-privee"></i>Private season, best rate</li>
          <li><i class="l-hotel"></i>Hotel season</li>
          <li><i class="l-pris"></i>Taken</li>
        </ul>
        <button type="button" id="suiv" aria-label="Next months">&rsaquo;</button>
      </div>
      <div class="cal" id="mois"></div>
    </div>
  </div>
</section>

<section id="calc">
  <div class="pl">
    <div class="centre">
      <span class="sur">Your price</span>
      <h2>What your stay costs, to the baht</h2>
      <hr class="filet c">
      <p class="lead" style="margin-top:22px;max-width:62ch;margin-inline:auto">No form to
      fill in first, no one calling you back with a number. The same rates we quote by email.</p>
    </div>

    <div class="champs">
      <div><label for="a">Arrival</label><input type="date" id="a"></div>
      <div><label for="d">Departure</label><input type="date" id="d"></div>
      <div><label for="p">Guests</label><input type="number" id="p" min="1" value="12"></div>
      <div><label for="dev">Shown in</label><select id="dev"></select></div>
    </div>

    <p class="sur" style="margin-top:36px">Add what you need</p>
    <div class="opts" id="opts"></div>

    <div class="plan-tete">
      <span class="sur">Your week</span>
      <h3>Lay the whole stay out, day by day</h3>
      <p class="aide">Everything you ticked above shows here. Change a day by
      tapping it. Build the first week the way you want it, then copy it over
      the rest of the stay.</p>
    </div>
    <div id="plan"></div>

    <div class="somme" id="somme"></div>
  </div>
</section>

<section class="alt" id="demande">
  <div class="pl serre">
    <div class="centre"><span class="sur">Hold these dates</span>
      <h2>Tell us about your group</h2><hr class="filet c"></div>
    <div class="form">
      <div class="duo">
        <div><label for="q-nom">Your name</label><input id="q-nom" autocomplete="name"></div>
        <div><label for="q-mail">Email</label><input id="q-mail" type="email" autocomplete="email"></div>
      </div>
      <div class="duo">
        <div><label for="q-org">Company or group</label><input id="q-org" autocomplete="organization"></div>
        <div><label for="q-tel">Phone or WhatsApp</label><input id="q-tel" autocomplete="tel"></div>
      </div>
      <div class="duo">
        <div><label for="q-pays">Where you are based</label><input id="q-pays" autocomplete="country-name"></div>
        <div><label for="q-type">What kind of event</label>
          <select id="q-type">
            <option>Retreat</option><option>Company offsite</option>
            <option>Wedding or celebration</option><option>Family or friends</option>
            <option>Photo or film shoot</option><option>Something else</option>
          </select></div>
      </div>
      <div><label for="q-msg">Anything we should know</label>
        <textarea id="q-msg" rows="4" placeholder="Dietary needs, arrival times, a teacher to house, a room to set up, anything at all."></textarea></div>
      <p class="dit" id="q-dit" role="status" aria-live="polite"></p>
      <div><button type="button" class="bt" id="q-go">Send the request</button></div>
    </div>
  </div>
</section>

${final("Let us hold the week for you",
  "Send your dates and we answer the same day with a firm yes or no on availability, plus a written quote you can forward to whoever signs it.")}`
}));

/* ============================================================ */
/*  LOCATION                                                    */
/* ============================================================ */
const AUTOUR = [
  ["Ban Tai beach", "100 m", "A long quiet stretch of sand with the best sunsets on this coast. Two minutes on foot."],
  ["Thong Sala night market", "4 km", "Street food, fresh seafood, tropical fruit and local crafts, every evening."],
  ["Diamond Muay Thai", "2.9 km", "Watch a fight or take a class. Proper Thai boxing, not a show for tourists."],
  ["Haad Rin beach", "15 min", "Famous for the Full Moon Party. A good beach by daylight too."],
  ["Phaeng waterfall", "9 km", "Jungle trail to a waterfall and a viewpoint over the whole island."],
  ["Bottle Beach", "10.2 km", "Clear water, white sand, reachable by boat. A day trip worth the crossing."]
];
ecris("location/index.html", page({
  url: "/location", actif: "/location", ogImage: "pool-wide",
  titre: "Location | La Belle Vie, Ban Tai, Koh Phangan",
  desc: "La Belle Vie sits in Ban Tai on Koh Phangan, a hundred metres from the beach and twenty five minutes from anywhere on the island.",
  corps: `
<section class="haut court">
  ${img("pool-loungers", "Loungers and an outdoor shower beside the lagoon pool at La Belle Vie", { lazy:false })}
  <div class="pl">
    <span class="sur">Where we are</span>
    <h1 style="font-size:clamp(38px,7vw,78px)">Ban Tai,<br>Koh Phangan</h1>
  </div>
</section>

<section>
  <div class="pl serre">
    <span class="sur">The island</span>
    <h2>An island of beaches, jungle and very little hurry.</h2>
    <hr class="filet">
    <p class="lead" style="margin-top:26px">Koh Phangan sits in the Gulf of Thailand, between Koh Samui and the mainland. Clear water, a green interior and a culture that has not been flattened by tourism.</p>
    <p>Ban Tai, where the house is, is the calm south coast. Long sand, gentle water, sunsets worth stopping for. Thong Sala, the island's main town and the ferry pier, is a few minutes up the road, so you get quiet without being cut off.</p>
    <p>Getting here: fly to Koh Samui and take the ferry, about 20 minutes of water, or come by boat from Surat Thani on the mainland. Tell us your arrival and the concierge will have a car waiting at the pier.</p>
  </div>
</section>

<section class="alt">
  <div class="pl">
    <div class="centre"><span class="sur">Nearby</span><h2>What is around the corner</h2><hr class="filet c"></div>
    <div class="trois" style="margin-top:clamp(36px,4vw,56px)">
      ${AUTOUR.map(([n, d, t]) => `<div class="monte">
        <p class="sur" style="margin-bottom:8px">${e(d)}</p>
        <h3>${e(n)}</h3>
        <p style="margin-top:12px">${e(t)}</p>
      </div>`).join("")}
    </div>
  </div>
</section>

<section>
  <div class="pl">
    <div class="centre"><span class="sur">On the map</span><h2>${e(S.adresse)}</h2><hr class="filet c"></div>
    <div style="margin-top:clamp(32px,4vw,48px)">
      <iframe class="carte" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        title="Map showing La Belle Vie in Ban Tai, Koh Phangan"
        src="https://www.google.com/maps?q=${S.geo.lat},${S.geo.lon}&z=14&output=embed"></iframe>
    </div>
    <div class="bts c">
      <a class="bt vide" target="_blank" rel="noopener"
         href="https://www.google.com/maps/search/?api=1&query=${S.geo.lat},${S.geo.lon}">Open in Google Maps</a>
    </div>
  </div>
</section>

<section class="alt">
  <div class="pl">
    <div class="centre"><span class="sur">Around the house</span><h2>Explore, unwind, come back</h2><hr class="filet c"></div>
    ${galerie([
      ["deck-salah", "Teak deck and thatched salah with hanging egg chairs"],
      ["warrior-gong", "Terracotta warrior and bronze gong beside the pool"],
      ["elephant-red", "Red lacquered elephant sculpture in the garden"],
      ["triple-3", "Round rattan daybed in a private garden"],
      ["pool-loungers", "Loungers and the outdoor shower by the water"],
      ["pool-wide", "The lagoon pool seen from the far end of the garden"]
    ])}
  </div>
</section>

${final(CTA[0], CTA[1])}`
}));

/* ============================================================ */
/*  CONTACT                                                     */
/* ============================================================ */
ecris("contact/index.html", page({
  url: "/contact", actif: "/contact", ogImage: "presidential-1",
  titre: "Contact | La Belle Vie, Ban Tai, Koh Phangan",
  desc: "Reach La Belle Vie in Ban Tai, Koh Phangan, for reservations, questions or anything else about an adults only stay on the island.",
  corps: `
<section class="haut court">
  ${img("presidential-1", "Living room of the Presidential Suite with green velvet armchairs", { lazy:false })}
  <div class="pl">
    <span class="sur">Get in touch</span>
    <h1 style="font-size:clamp(38px,7vw,78px)">Always a<br>warm welcome</h1>
  </div>
</section>

<section>
  <div class="pl deux penche">
    <div class="monte">
      <span class="sur">Write or call</span>
      <h2>We answer within a day, usually sooner.</h2>
      <hr class="filet">
      <p style="margin-top:26px">Ask us anything about the rooms, the island or how to get here. If you want to hold dates, booking on our own site gets you the best rate, guaranteed.</p>
      <ul class="coord">
        <li>${ic("tel")}<div><a href="tel:${S.telLien}">${e(S.tel)}</a><br>
          <small>Also on WhatsApp</small></div></li>
        <li>${ic("mail")}<div><a href="mailto:${S.mail}">${e(S.mail)}</a><br>
          <small>Reservations and general questions</small></div></li>
        <li>${ic("mail")}<div><a href="mailto:${S.mailEvents}">${e(S.mailEvents)}</a><br>
          <small>Groups, private hire and events</small></div></li>
        <li>${ic("lieu")}<div>${e(S.adresse)}</div></li>
      </ul>
      <div class="bts">
        <a class="bt" href="${S.reservation}" target="_blank" rel="noopener">Book a room</a>
      </div>
      <p style="margin-top:26px"><a href="${S.facebook}" target="_blank" rel="noopener">Facebook</a>
      &nbsp;&middot;&nbsp;<a href="${S.instagram}" target="_blank" rel="noopener">Instagram</a></p>
    </div>

    <div class="monte">
      <h3>Send us a message</h3>
      <form class="form" id="form-contact" novalidate>
        <div class="duo">
          <div><label for="f-nom">Your name</label><input id="f-nom" name="nom" autocomplete="name" required></div>
          <div><label for="f-mail">Email</label><input id="f-mail" name="mail" type="email" autocomplete="email" required></div>
        </div>
        <div class="duo">
          <div><label for="f-tel">Phone or WhatsApp</label><input id="f-tel" name="tel" autocomplete="tel"></div>
          <div><label for="f-sujet">Subject</label>
            <select id="f-sujet" name="sujet">
              <option>A booking</option><option>A question about a room</option>
              <option>Groups or private hire</option><option>Something else</option>
            </select></div>
        </div>
        <div><label for="f-msg">Your message</label><textarea id="f-msg" name="message" required></textarea></div>
        <div style="position:absolute;left:-9999px" aria-hidden="true">
          <label for="f-site">Leave this empty</label><input id="f-site" name="site" tabindex="-1" autocomplete="off">
        </div>
        <p class="dit" id="form-dit" role="status" aria-live="polite"></p>
        <div><button type="submit" class="bt" id="form-envoi">Send the message</button></div>
      </form>
    </div>
  </div>
</section>

<section class="alt">
  <div class="pl">
    <div class="centre"><span class="sur">Find us</span><h2>${e(S.adresse)}</h2><hr class="filet c"></div>
    <div style="margin-top:clamp(32px,4vw,48px)">
      <iframe class="carte" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        title="Map showing La Belle Vie in Ban Tai, Koh Phangan"
        src="https://www.google.com/maps?q=${S.geo.lat},${S.geo.lon}&z=14&output=embed"></iframe>
    </div>
  </div>
</section>

${final("Have the best holiday of the year",
  "Questions about a booking, a special occasion to plan, or feedback after a stay. Whatever it is, we read everything and reply.")}`
}));

/* ============================================================ */
/*  404, sitemap, robots                                        */
/* ============================================================ */
ecris("404.html", page({
  url: "/404", actif: "", titre: "Page not found | La Belle Vie",
  desc: "This page does not exist.",
  corps: `<section style="padding-top:clamp(140px,18vw,220px)">
  <div class="pl serre centre">
    <span class="sur">404</span>
    <h2>This page has gone for a swim.</h2>
    <hr class="filet c">
    <p class="lead" style="margin-top:24px">The page you were after is not here. The rooms, however, are exactly where you left them.</p>
    <div class="bts c"><a class="bt" href="/">Back to the home page</a>
    <a class="bt vide" href="/accommodations">See the rooms</a></div>
  </div>
</section>`
}));

/* /events est servie mais pas listee : elle se partage par son lien. */
const urls = ["/", "/about", "/accommodations", "/location", "/contact"]
  .concat(CHAMBRES.map(c => `/accommodations/${c.cle}`));
const jour = new Date().toISOString().slice(0, 10);
ecris("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${S.site}${u === "/" ? "/" : u}</loc><lastmod>${jour}</lastmod>` +
    `<priority>${u === "/" ? "1.0" : u.split("/").length > 2 ? "0.7" : "0.8"}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

ecris("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${S.site}/sitemap.xml\n`);

/* petit favicon : le cercle or de la marque */
ecris("favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" fill="#2E1805"/>` +
  `<circle cx="32" cy="32" r="22" fill="none" stroke="#D4AF37" stroke-width="2.5"/>` +
  `<text x="32" y="40" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#D4AF37">L</text>` +
  `</svg>\n`);

console.log(`${urls.length} pages, ${CHAMBRES.length} chambres, ${FAQ.length} questions, sitemap et robots ecrits.`);
