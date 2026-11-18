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

## La page evenements

Le client compose sa semaine. Chaque prestation se choisit selon son `choix`,
servi par le moteur : `jours` ouvre un selecteur de dates, `sessions` un
compteur, `oui-non` reste une case. Le bloc "Your own plan" laisse ecrire des
lignes libres avec leurs jours : elles n'ont pas de prix, elles voyagent avec la
demande et arrivent sur la fiche de l'equipe.

Le detail du devis ne doit jamais raconter autre chose que le total : si une
prestation ne tourne que trois soirs, le calcul affiche trois soirs. Un client
qui compare deux devis doit pouvoir refaire l'addition.

## Le Worker voit toutes les pages

`run_worker_first` est a `true`. Sans lui, Cloudflare sert les fichiers
statiques sans jamais appeler le code : la balise canonical gardait l'adresse de
production meme sur une adresse workers.dev, et les en-tetes de cache des images
ne s'appliquaient pas.

Le Worker recolle `canonical`, `og:url` et `og:image` sur l'hote reellement
servi. Tant que le domaine n'est pas branche, une balise qui pointe sur
www.labelleviekpg.com envoie les moteurs vers l'ancien site WordPress.

## Le planning

`#plan` est une autre vue des memes donnees que les selecteurs de jours : une
grille, une ligne par prestation choisie au jour et par ligne libre, une colonne
par jour, decoupee en semaines. Cocher une case ecrit dans `PRIS[id].jours` ou
dans `MIENS[i].jours`, et le devis se refait. Il n'y a pas de second etat a
tenir a jour, donc rien qui puisse diverger.

Les prestations a la seance y figurent aussi : un massage pose un mardi se voit
dans la semaine comme un diner. Marquer un jour vaut une seance, et le compteur
de la carte suit, en lecture seule, pour qu'il n'y ait jamais deux chiffres a
tenir en accord. Une prestation sans jour marque reste listee sous la grille.

`recopie(n)` reporte le motif de la semaine n sur toutes les suivantes, rang
par rang dans la semaine. C'est ce qui permet de composer une semaine type et
de la poser sur trois semaines.

Le tableau est en `table-layout:fixed` avec une colonne de libelle fixee : sans
cela la derniere journee sortait du cadre. Sur telephone il defile dans son
cadre, jamais la page.

## Les noms de classe

`.pl` est le conteneur de chaque page. Avant d'inventer un nom de classe,
verifier qu'il n'existe pas deja dans `lbv.css`. Une case du planning avait ete
nommee `.pl` et sa regle `height:34px` a aplati tous les conteneurs du site,
sur toutes les pages, sans la moindre erreur de console. Les classes propres a
un bloc portent un prefixe clair : `jcase`, `sem-tete`, `ligne-mien`.

Le controle de geometrie fait partie des verifications obligatoires : une
section dont le contenu deborde se dessine par-dessus la suivante, et aucun
test de liens, de metadonnees ou de console ne le voit.

## Les cases a cocher

C'est l'etat du site qui les tient, pas le navigateur. Le clic est lu une seule
fois sur `.opt > .tete`, avec `preventDefault`, puis le bloc se redessine depuis
`PRIS`. Sans cela un clic sur le libelle partait en deux activations, le bloc
etant refait entre les deux, et la case revenait a son etat de depart.

Pour la meme raison, un redessin ne se fait jamais pendant le traitement d'un
evenement : `redessine()` attend le tour suivant et rend le focus a l'element
qui l'avait, sinon qui navigue au clavier le perd a chaque case.
