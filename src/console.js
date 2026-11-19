/* La console de gestion vit dans le Worker du calculateur, avec la base des
   demandes. Plutot que d'envoyer l'equipe sur une autre adresse, on la sert
   ici : un seul domaine, un seul mot de passe, et le jour ou le vrai domaine
   est branche la console le suit sans rien changer.

   Le mot de passe n'est pas verifie ici. Il voyage dans l'en-tete jusqu'au
   moteur, qui le controle comme il l'a toujours fait. Ce fichier ne fait que
   transporter, il n'ouvre aucune porte. */

/* Les deux ecritures menent au meme endroit. Les pages se lient entre elles
   par la forme courte, mais un lien copie ou un signet pris avant ce jour
   porte le .html : il ne doit pas tomber sur une page introuvable. */
const PAGES = {
  "/admin": "/admin.html",       "/admin.html": "/admin.html",
  "/fiche": "/fiche.html",       "/fiche.html": "/fiche.html",
  "/devis": "/devis.html",       "/devis.html": "/devis.html",
  "/planning": "/planning.html", "/planning.html": "/planning.html"
};

/* Ce que les pages de la console appellent. Liste fermee : aucun chemin
   construit depuis l'URL du visiteur. */
const ROUTES = [
  "/api/demandes",
  "/api/demandes/supprime",
  "/api/bloque",
  "/api/bloques",
  "/api/calendrier",
  "/api/devis",
  "/api/change",
  "/api/tarifs"
];

export function estConsole(chemin){
  return Object.prototype.hasOwnProperty.call(PAGES, chemin) ||
         ROUTES.indexOf(chemin) >= 0;
}

async function parle(env, chemin, init){
  if (env.MOTEUR && typeof env.MOTEUR.fetch === "function")
    return env.MOTEUR.fetch(new Request("https://moteur" + chemin, init));
  const base = env.MOTEUR_URL || "https://labellevie.labelleviekpg.workers.dev";
  return fetch(base + chemin, init);
}

export async function console_(chemin, requete, env){
  /* La question qui suit le chemin fait partie de l'adresse : sans elle,
     /devis?id=... arrive au moteur sans son id et la page s'ouvre vide. */
  const vers = (PAGES[chemin] || chemin) + new URL(requete.url).search;

  const entetes = new Headers();
  const cle = requete.headers.get("x-lbv-cle");
  if (cle) entetes.set("x-lbv-cle", cle);
  const type = requete.headers.get("content-type");
  if (type) entetes.set("content-type", type);

  const init = { method: requete.method, headers: entetes };
  if (requete.method !== "GET" && requete.method !== "HEAD"){
    const corps = await requete.text();
    if (corps.length > 200000)
      return new Response(JSON.stringify({ erreur: "trop_long" }), {
        status: 413, headers: { "content-type": "application/json" } });
    init.body = corps;
  }

  let r;
  try { r = await parle(env, vers, init); }
  catch {
    return new Response(JSON.stringify({ erreur: "console_injoignable" }), {
      status: 502, headers: { "content-type": "application/json" } });
  }

  const sortie = new Response(r.body, r);
  /* Rien de la console ne se met en cache, et rien ne s'indexe. */
  sortie.headers.set("cache-control", "no-store");
  sortie.headers.set("x-robots-tag", "noindex, nofollow");
  return sortie;
}
