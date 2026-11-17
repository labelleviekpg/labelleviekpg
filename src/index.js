/* La Belle Vie. Les pages sortent de public/, une seule route passe par le code. */
import { contact } from "./contact.js";

export default {
  async fetch(requete, env){
    const chemin = new URL(requete.url).pathname;

    if (chemin === "/api/contact"){
      try {
        return await contact(requete, env);
      } catch {
        return new Response(JSON.stringify({ erreur: "serveur" }), {
          status: 500, headers: { "content-type": "application/json" }
        });
      }
    }

    const r = await env.ASSETS.fetch(requete);

    // Les images et les feuilles ne bougent jamais. Les pages, si.
    if (r.status === 200 && /\.(jpg|png|svg|webp|avif|woff2?)$/.test(chemin)){
      const t = new Response(r.body, r);
      t.headers.set("cache-control", "public, max-age=31536000, immutable");
      return t;
    }
    return r;
  }
};
