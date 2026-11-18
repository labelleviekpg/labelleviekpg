/* Le mot de passe de l'equipe, le meme que sur les deux autres outils :
   trois personnes, une seule chose a retenir. Il n'existe ici que sous forme
   d'empreinte, et ce fichier n'est jamais servi au navigateur. */
const EMPREINTE = "885ce216a1891e9429900a67cf8efc0d6555debbb9f040a87acb7fbb050fafec";

export async function empreinte(texte){
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

/* Comparaison a temps constant : la duree ne doit pas trahir le nombre de
   caracteres justes. */
export function memeTexte(a, b){
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function barre(requete, env){
  const donnee = requete.headers.get("x-lbv-cle") || "";
  if (!donnee) return json({ erreur: "mauvaise_cle" }, 401);
  const posee = env && env.LBV_CLE;
  const bon = posee ? memeTexte(donnee, posee)
                    : memeTexte(await empreinte(donnee), EMPREINTE);
  return bon ? null : json({ erreur: "mauvaise_cle" }, 401);
}

export function json(corps, statut, cache){
  return new Response(JSON.stringify(corps), {
    status: statut || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache || "no-store"
    }
  });
}

/* Une chaine imprevisible, pour un jeton ou une cle de seance. */
export function tirage(octets = 24){
  const b = new Uint8Array(octets);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
