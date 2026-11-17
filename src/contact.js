/* Le formulaire de contact. Le message va dans la base, et part par mail
   si une cle Resend est posee sur le Worker. Sans cle, il est juste garde. */

const LIMITE = { nom: 120, mail: 160, tel: 60, sujet: 120, message: 4000 };

function propre(v, max){
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
}

// Assez pour arreter les fautes de frappe. La vraie verification, c'est la reponse.
function mailValide(m){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);
}

async function table(db){
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS messages (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       recu TEXT NOT NULL,
       nom TEXT NOT NULL,
       mail TEXT NOT NULL,
       tel TEXT,
       sujet TEXT,
       message TEXT NOT NULL,
       ip TEXT,
       envoye INTEGER NOT NULL DEFAULT 0
     )`
  ).run();
}

async function parMail(env, m){
  if (!env.RESEND_CLE || !env.CONTACT_VERS) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.RESEND_CLE,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.CONTACT_DE || "La Belle Vie <onboarding@resend.dev>",
      to: [env.CONTACT_VERS],
      reply_to: m.mail,
      subject: `Website: ${m.sujet || "message"} from ${m.nom}`,
      text:
        `Name:    ${m.nom}\n` +
        `Email:   ${m.mail}\n` +
        `Phone:   ${m.tel || "-"}\n` +
        `Subject: ${m.sujet || "-"}\n\n` +
        `${m.message}\n`
    })
  });
  return r.ok;
}

export async function contact(requete, env){
  if (requete.method !== "POST"){
    return new Response(JSON.stringify({ erreur: "methode" }), {
      status: 405, headers: { "content-type": "application/json", "allow": "POST" }
    });
  }

  let d;
  try { d = await requete.json(); }
  catch { return reponse({ erreur: "json" }, 400); }

  // Le champ cache. Rempli, c'est un robot : on repond oui et on jette.
  if (propre(d.piege, 50)) return reponse({ ok: true });

  const m = {
    nom:     propre(d.nom, LIMITE.nom),
    mail:    propre(d.mail, LIMITE.mail),
    tel:     propre(d.tel, LIMITE.tel),
    sujet:   propre(d.sujet, LIMITE.sujet),
    message: String(d.message == null ? "" : d.message).trim().slice(0, LIMITE.message)
  };

  if (!m.nom || !m.message) return reponse({ erreur: "champs" }, 400);
  if (!mailValide(m.mail))  return reponse({ erreur: "mail" }, 400);

  const ip = requete.headers.get("cf-connecting-ip") || "";

  let garde = false;
  if (env.DB){
    try {
      await ecrit(env.DB, m, ip);
      garde = true;
    } catch (err) {
      if (String(err && err.message || "").includes("no such table")){
        await table(env.DB);
        await ecrit(env.DB, m, ip);
        garde = true;
      } else {
        throw err;
      }
    }
  }

  const envoye = await parMail(env, m).catch(() => false);

  // Le message est accepte des qu'il est garde quelque part.
  if (!garde && !envoye) return reponse({ erreur: "perdu" }, 500);
  return reponse({ ok: true, envoye });
}

async function ecrit(db, m, ip){
  await db.prepare(
    `INSERT INTO messages (recu, nom, mail, tel, sujet, message, ip)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(new Date().toISOString(), m.nom, m.mail, m.tel, m.sujet, m.message, ip).run();
}

function reponse(corps, code = 200){
  return new Response(JSON.stringify(corps), {
    status: code,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
