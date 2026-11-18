# Reprise de session

Ce fichier existe pour qu'une nouvelle session reprenne le travail sans tout
relire. Si tu es une session Claude qui demarre : lis ce fichier en entier, puis
`CLAUDE.md`, puis `A-TRANCHER.md`.

## Ou en est le projet

Le site de La Belle Vie est **ecrit, teste, pousse et deploye**. Il tourne sur
Cloudflare a l'adresse `.workers.dev` du Worker `labelleviekpg`.

**Le domaine labelleviekpg.com n'est volontairement pas branche.** Alex veut
preparer le site avant de le mettre en ligne. L'ancien site WordPress tourne
toujours sur labelleviekpg.com. Ne pas brancher le domaine sans son feu vert.

## Ce qui est en place

- Onze pages : accueil, About, la liste des chambres et les six fiches,
  Location, Contact, une 404.
- 31 photos reelles en trois largeurs, texte alternatif sur chacune.
- Palette d'origine : brun `#422409`, or `#AF7600`, creme `#F7F5F0`.
  Polices Forum et Work Sans.
- Formulaire de contact : ecrit dans D1, part par mail si une cle Resend existe.
  Destinataire : `events@labelleviekpg.com`.
- Donnees structurees Hotel et HotelRoom, plan du site, robots.txt.
- Le contenu reste visible sans JavaScript.

## Ce qui est branche cote Cloudflare

| Quoi | Valeur |
|---|---|
| Worker | `labelleviekpg` |
| Base D1 | `labelleviekpg`, id `53700590-1e9e-4797-9e2c-51c0d82314f6` |
| Deploiement | Workers Builds depuis GitHub, branche `main` |
| Build command | vide |
| Deploy command | `npx wrangler deploy` |
| Table | `messages`, creee |
| Cle Resend | **pas encore posee** |

## A verifier en premier, dans une session sur l'environnement "Sites La Belle Vie"

Cet environnement autorise `labelleviekpg.com`, `www.labelleviekpg.com` et
`labelleviekpg.labelleviekpg.workers.dev`. Depuis une session qui tourne dessus,
on peut ouvrir le site et le verifier pour de vrai.

A controler sur le site en ligne :

1. Les onze pages repondent en 200.
2. Les vignettes des six chambres montrent un lit ou un salon, jamais une salle
   de bain. C'est une erreur qui a deja ete faite et corrigee.
3. La visionneuse de photos : ouverture, fleches, Echap.
4. Le menu burger sur telephone : il s'ouvre et il se ferme.
5. Le formulaire de contact, de bout en bout, jusqu'a la ligne en base.
6. Les cartes Google sur Location et Contact, qui n'etaient pas verifiables en
   local faute de reseau.

## Ce qui reste ouvert

1. **Page Clara Morgane.** Mise de cote, en attente de contenu. L'ancien site
   avait un bouton de menu qui renvoyait a l'accueil, il a ete retire.
2. **Version francaise.** Le site est en anglais, comme l'ancien. Une vraie
   version FR vaut le coup pour la clientele francaise. Pas de traduction
   automatique. A decider.
3. **Cle Resend** pour recevoir les messages par mail. Sans elle, tout reste en
   base, rien n'est perdu. Voir `LISEZMOI.md`.
4. **Photos manquantes** : aucune photo de la plage de Ban Tai dans le lot. La
   page Location en aurait besoin.
5. **Video du hero.** L'ancien site avait une vue aerienne YouTube
   (`2SAt0HK6fgI`). Remplacee par une photo, qui charge plus vite. A rediscuter.
6. Les points de `A-TRANCHER.md` encore ouverts.

## Comment travailler ici

Tout le contenu vit dans `data/`. Apres toute modification :

```
node outils/pages.mjs      # regenere les onze pages
npx wrangler dev           # essai local sur le port 8787
```

Le detail est dans `LISEZMOI.md`. Les regles d'ecriture et les regles techniques
sont dans `CLAUDE.md`, elles sont contraignantes.

## Les autres depots

- `labelleviekpg/site` : site de la **privatisation**, la maison entiere louee a
  un seul groupe. Calculateur de prix, devis imprimable, suivi des demandes.
  **Ce n'est pas le meme produit que ce depot.**
- `labelleviekpg/prospection` : outil de prospection B2B, 1024 cibles, editeur
  de lettres par famille et par langue.
