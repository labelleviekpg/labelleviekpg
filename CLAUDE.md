# La Belle Vie, site public

Boutique hotel adults only de six chambres a Ban Tai, Koh Phangan. Ce depot est
le site vitrine. **A ne pas confondre avec le depot `Site`**, qui vend la
privatisation complete de la maison a un groupe.

## Regles d'ecriture

- **Jamais de virgule avant `and` ou `et`.** Couper la phrase en deux plutot.
- **Jamais de tiret long ni de tiret moyen.** Ni en incise, ni ailleurs.
- Ne jamais expliquer a quelqu'un ce qu'il sait deja de sa propre maison.
- Phrases courtes. Un fait par phrase. Pas de triade rhetorique.
- Le site est en anglais. Anglais naturel, pas de l'anglais traduit du francais.
- Les commentaires de code et la documentation sont en francais.

## Regles techniques

- **Rien d'invente.** Si une information manque ou se contredit, elle ne va pas
  sur le site. Elle va dans `A-TRANCHER.md`.
- **Tout le contenu dans `data/`.** Jamais de texte en dur dans `outils/pages.mjs`
  qui aurait sa place dans un fichier de donnees.
- **Pas d'etape de build au deploiement.** `wrangler deploy` suffit.
- **Un `srcset` ne ment jamais.** Les largeurs viennent de `data/images.json`,
  releve sur le disque par `outils/images.sh`.
- **Texte alternatif sur chaque image.** Sans exception.
- **Le contenu reste visible sans JavaScript.** Les animations d'apparition sont
  sous `.js`, pose par un script en tete de page.
- Mobile d'abord. La majorite des clients reservent sur telephone.

## Apres toute modification

```
node outils/pages.mjs      # regenere les 11 pages
npx wrangler dev           # essai local
```

Puis verifier, sur les pages touchees :
- aucun debordement horizontal sur telephone
- aucune erreur de console
- toutes les images ont un alt
- un seul H1 par page, canonical et og:image presents

## La galerie

Elle ne se construit jamais a la main. `galerie([[fichier, alt], ...])` calcule
la largeur de chaque photo pour que la derniere rangee se remplisse toujours :
multiple de trois, trois par rangee ; nombre pair, deux par rangee ; sinon la
derniere rangee s'elargit. Une grille ouverte laisse un trou des que le nombre
de photos ne tombe pas juste, et ca se voit comme une image manquante.
