/* Le pont vers le calculateur de privatisation. Le moteur de prix vit dans un
   seul endroit, le Worker `labellevie`, et ce site ne fait que lui parler.
   Dupliquer la grille tarifaire ici serait le meilleur moyen d'avoir un jour
   deux prix differents pour la meme nuit. */

import { json } from "./garde.js";

/* Ceinture et bretelles. Le moteur ne sert deja plus les couts, mais rien ne
   coute de les retirer une seconde fois ici : si un jour quelqu'un ouvre une
   route la-bas sans y penser, rien ne fuit par ce chemin. */
function sansCout(v){
  if (Array.isArray(v)) return v.map(sansCout);
  if (v && typeof v === "object"){
    const out = {};
    for (const [k, x] of Object.entries(v)){
      if (k === "marge" || k === "controle" || k === "cout" || k === "coutTotal") continue;
      out[k] = sansCout(x);
    }
    return out;
  }
  return v;
}

async function parle(env, chemin, init){
  if (env.MOTEUR && typeof env.MOTEUR.fetch === "function")
    return env.MOTEUR.fetch(new Request("https://moteur" + chemin, init));
  const base = env.MOTEUR_URL || "https://labellevie.labelleviekpg.workers.dev";
  return fetch(base + chemin, init);
}

/* Ce que la page evenements a le droit de demander au moteur. Une liste
   fermee : pas de chemin construit depuis l'URL du visiteur. */
const PASSAGES = {
  "/api/events/calendrier": { vers: "/api/calendrier", methode: "GET",  cache: "public, max-age=300" },
  "/api/events/change":     { vers: "/api/change",     methode: "GET",  cache: "public, max-age=1800" },
  "/api/events/devis":      { vers: "/api/devis",      methode: "POST" },
  "/api/events/demande":    { vers: "/api/demande",    methode: "POST" }
};

export function estMoteur(chemin){
  return Object.prototype.hasOwnProperty.call(PASSAGES, chemin);
}

export async function moteur(chemin, requete, env){
  const p = PASSAGES[chemin];
  if (!p) return json({ erreur: "inconnu" }, 404);
  if (requete.method !== p.methode)
    return json({ erreur: "methode" }, 405, null);

  const init = { method: p.methode, headers: { "content-type": "application/json" } };
  if (p.methode === "POST"){
    const corps = await requete.text();
    if (corps.length > 20000) return json({ erreur: "trop_long" }, 413);
    init.body = corps;
  }

  let r;
  try { r = await parle(env, p.vers, init); }
  catch { return json({ erreur: "moteur_injoignable" }, 502); }

  let v;
  try { v = await r.json(); }
  catch { return json({ erreur: "moteur_illisible" }, 502); }

  return json(sansCout(v), r.status, r.ok ? p.cache : null);
}
