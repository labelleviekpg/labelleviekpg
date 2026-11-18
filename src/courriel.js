/* L'envoi de courriel, par Resend. Sans cle posee sur le Worker, rien ne part
   et la fonction le dit : l'appelant decide quoi faire, il ne doit jamais
   repondre "envoye" a la legere. */
export async function envoie(env, { vers, sujet, texte, repondreA }){
  if (!env.RESEND_CLE || !vers) return { envoye: false, raison: "pas_de_cle" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "authorization": "Bearer " + env.RESEND_CLE,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: env.CONTACT_DE || "La Belle Vie <onboarding@resend.dev>",
        to: [vers],
        ...(repondreA ? { reply_to: repondreA } : {}),
        subject: sujet,
        text: texte
      })
    });
    if (!r.ok) return { envoye: false, raison: "refus_" + r.status };
    return { envoye: true };
  } catch {
    return { envoye: false, raison: "reseau" };
  }
}
