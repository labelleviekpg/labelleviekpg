/* La Belle Vie. Les pages sortent de public/, deux familles de routes passent
   par le code : le formulaire de contact, et le pont vers le calculateur. */
import { contact } from "./contact.js";
import { estMoteur, moteur } from "./moteur.js";

export default {
  async fetch(requete, env){
    const chemin = new URL(requete.url).pathname;

    if (chemin === "/api/contact"){
      try { return await contact(requete, env); }
      catch { return erreur(); }
    }

    if (estMoteur(chemin)){
      try { return await moteur(chemin, requete, env); }
      catch { return erreur(); }
    }

    const r = await env.ASSETS.fetch(requete);

    // Les images et les feuilles ne bougent jamais. Les pages, si.
    if (r.status === 200 && /\.(jpg|png|svg|webp|avif|woff2?)$/.test(chemin)){
      const t = new Response(r.body, r);
      t.headers.set("cache-control", "public, max-age=31536000, immutable");
      return t;
    }

    /* Les pages sont generees avec l'adresse de production dans leur
       canonical et leur og:url. Tant que le site vit ailleurs, sur une
       adresse workers.dev ou une preversion, cette balise envoie les
       moteurs et certains navigateurs vers l'ancien site. On la fait donc
       suivre l'adresse reellement servie. */
    const type = r.headers.get("content-type") || "";
    if (r.status === 200 && type.includes("text/html")){
      const ici = new URL(requete.url);
      return new HTMLRewriter()
        .on('link[rel="canonical"]', recolle("href", ici))
        .on('meta[property="og:url"]', recolle("content", ici))
        .on('meta[property="og:image"]', recolle("content", ici))
        .transform(r);
    }
    return r;
  }
};

/* Reecrit un attribut pour qu'il pointe sur l'hote servi, en gardant le
   chemin tel quel. */
function recolle(attribut, ici){
  return {
    element(e){
      const v = e.getAttribute(attribut);
      if (!v) return;
      try {
        const u = new URL(v);
        if (u.host === ici.host) return;
        e.setAttribute(attribut, ici.origin + u.pathname + u.search);
      } catch { /* une valeur relative n'a rien a corriger */ }
    }
  };
}

function erreur(){
  return new Response(JSON.stringify({ erreur: "serveur" }), {
    status: 500, headers: { "content-type": "application/json" }
  });
}
