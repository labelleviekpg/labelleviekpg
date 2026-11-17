# Le site de La Belle Vie

Le site public : six chambres, la propriete, l'ile, le formulaire de contact.
Pages statiques servies par un Worker Cloudflare. **Pas d'etape de build.**

## Premiere installation

```
npx wrangler d1 create labelleviekpg
```

Reporte le `database_id` rendu dans `wrangler.jsonc`, puis :

```
npx wrangler d1 execute labelleviekpg --remote --file schema.sql
npx wrangler deploy
```

Enfin, branche le domaine `labelleviekpg.com` sur le Worker, dans le tableau de
bord Cloudflare : Workers, labelleviekpg, Settings, Domains & Routes.

## Deployer

```
npx wrangler deploy
```

C'est tout. Cloudflare prend `public/` tel quel.

Si tu as touche a `data/`, regenere les pages avant :

```
node outils/pages.mjs
npx wrangler deploy
```

ou en une fois : `npm run deploie`

## Essayer sur ta machine

```
npx wrangler dev
```

Puis ouvre http://localhost:8787

## Changer un texte, un chiffre, une photo

Tout le contenu vit dans `data/`, jamais dans le HTML.

| Fichier | Ce qu'il tient |
|---|---|
| `data/site.json` | Adresse, telephone, mails, reseaux, lien de reservation, services |
| `data/chambres.json` | Les six chambres : nom, capacite, lits, surface, textes, photos |
| `data/faq.json` | Les quinze questions |
| `data/images.json` | Largeurs reelles des photos. **Genere, ne pas editer a la main.** |

Apres toute modification : `node outils/pages.mjs`

## Ajouter des photos

1. Pose les fichiers dans un dossier, un sous-dossier par chambre.
2. Ajoute une ligne `pose <dossier> <numero> <nom>` dans `outils/images.sh`.
3. Lance `./outils/images.sh <chemin-du-dossier>`
   Trois largeurs sont fabriquees (640, 1100, 1800) et les dimensions reelles
   sont relevees dans `data/images.json`, pour que les `srcset` ne mentent pas.
4. Reference le nom dans `data/chambres.json` avec son texte alternatif.
5. `node outils/pages.mjs`

## Le formulaire de contact

Il poste sur `/api/contact`. Le message est ecrit dans la base D1, toujours.

**Pour recevoir les messages par mail**, il faut une cle Resend (gratuit
jusqu'a 3000 mails par mois, resend.com) :

```
npx wrangler secret put RESEND_CLE
```

Et dans `wrangler.jsonc`, la variable `CONTACT_VERS` dit a qui ils partent.
Elle est reglee sur `events@labelleviekpg.com`.

Sans cle, rien n'est perdu : les messages restent en base.

Pour les relire :

```
npx wrangler d1 execute labelleviekpg --remote \
  --command "SELECT recu, nom, mail, tel, sujet, message FROM messages ORDER BY recu DESC LIMIT 20"
```

## Ce qui reste ouvert

Voir `A-TRANCHER.md`.
