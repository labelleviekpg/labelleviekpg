# La Belle Vie, site public

Boutique hotel adults only de six chambres a Ban Tai, Koh Phangan. Ce depot est
le site vitrine. **A ne pas confondre avec le depot `Site`**, qui vend la
privatisation complete de la maison a un groupe.

## La loi thaïlandaise : nous louons un lieu, nous n'organisons rien

**Contrainte juridique. Elle passe avant le style, avant la tournure, avant
tout le reste de ce document.**

La retraite appartient toujours au client. Nous louons la propriété. Le mot
« retraite » reste donc possible, à condition qu'il soit précédé de « votre »
et jamais de « nos ».

| Jamais | Toujours |
|---|---|
| nos retraites | votre retraite, votre séjour, votre groupe |
| organiser des retraites | accueillir des groupes, louer la propriété |
| programme de partenariats | offre de location en exclusivité, conditions de location |
| partenaire, en parlant du prospect | client, locataire, organisateur |
| notre programme | votre programme ; pour nous : notre offre, nos tarifs |
| nous proposons des retraites | nous louons la propriété aux groupes en retraite |
| séjour tout compris, package, forfait | location, devis de location |
| animateurs partenaires | les organisateurs qui louent chez nous |
| collaborer, travailler ensemble | louer, réserver |

Phrases prêtes à l'emploi :

- « Nous louons La Belle Vie en exclusivité aux groupes qui organisent leur
  propre retraite. »
- « Vous réservez la propriété, vous organisez votre séjour comme vous le
  souhaitez. »
- « Notre offre de location en exclusivité comprend… »
- « Nous avons déjà accueilli un groupe venu avec son propre projet. »

**« régulièrement » est interdit tant que c'est faux.** Un seul groupe accueilli
à ce jour. On écrit « nous avons déjà accueilli un groupe », jamais « nous
accueillons régulièrement ».

**« organisateur » désigne le client, jamais nous.** Le mot est juste quand il
le désigne, lui. Il ne doit simplement jamais nous désigner.

La règle vaut dans toutes les langues. L'anglais tombe dans le même piège avec
`our retreats`, `we organise`, `we host retreats`, `partner`, `package`,
`all-inclusive`, `partnership programme`.

### Ce que la règle ne vise pas

Un mot qui décrit le métier du prospect n'est pas concerné, et c'est même tout
l'intérêt d'une accroche : `your tourism board partnerships`, `a partner hotel`,
`you already run retreats` parlent de lui.

Un nom d'entreprise non plus. Forbes & Partners s'appelle ainsi.

« Prestataires locaux » et « partenaires locaux » désignent nos fournisseurs,
pas le client. Ils restent.

Ce qui est interdit, c'est que **nous** apparaissions comme l'organisateur de
la retraite, ou que le prospect apparaisse comme **notre** partenaire.

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

## La console de gestion

Elle vit dans le Worker du calculateur, avec la base des demandes. `src/console.js`
la sert depuis ce domaine : `/admin`, `/fiche`, `/devis` et les routes qu'elles
appellent, par liaison de service. Un seul domaine, un seul mot de passe, et le
jour ou le vrai domaine est branche la console le suit sans rien changer.

Ce fichier ne verifie aucun mot de passe. Il transporte l'en-tete `x-lbv-cle`
jusqu'au moteur, qui controle comme il l'a toujours fait. Il n'ouvre donc aucune
porte, et la liste des chemins est fermee : aucun chemin construit depuis l'URL
du visiteur.

**Le lien Admin ne figure plus dans le menu.** Il y est reste le temps de la
mise au point, il en est sorti avant l'ouverture au public. La console se
rejoint en direct par `/admin`, elle reste absente du plan du site et du pied
de page et repond `noindex, nofollow`.

Pour la remettre dans le menu le temps d'une mise au point, rajouter
`{ "url": "/admin", "texte": "Admin" }` a la fin de `nav` dans
`data/site.json`. La classe `coulisses` lui redonne sa mise en forme discrete,
elle est toujours en place dans `barre()`.

## Deux portes, deux maisons

La porte de la page evenements n'est plus decorative. `porte-go` donne un
inscrit, `porte-non` donne un visiteur, et l'etat tient dans `lbv-events-vu`.
La valeur `oui`, d'avant les deux portes, compte pour un inscrit : on ne
reprend pas les prix a quelqu'un qui les voyait hier.

Le visiteur garde les dates, le calendrier des disponibilites et le choix des
prestations. Il perd les montants, qui sortent masques par `masque()`, le
premier chiffre puis des points. Il perd le detail nuit par nuit et le
planificateur de semaine, remplaces par `verrou()`. Et il ne peut pas envoyer
sa demande : `envoie()` rouvre la porte.

Le titre de la section des prix suit l'etat, par `titrePrix()`. Promettre le
prix a la baht au-dessus d'un montant masque, ce serait se contredire a
l'ecran.

**Le masque est pose a l'affichage, pas au calcul.** Le moteur renvoie les
vrais montants et quelqu'un qui ouvre les outils du navigateur les verra.
C'est une porte de demonstration : elle decourage le partage distrait, elle
n'arrete personne. Le jour ou la vraie connexion arrive, c'est le serveur qui
devra retenir les chiffres, et `pourLeClient()` dans le moteur est l'endroit
ou ca se jouera.

Une fonction nouvelle reservee aux inscrits se ferme par `verrou()`, jamais en
masquant en CSS : ce qui n'est pas dans la page ne se lit pas dans
l'inspecteur.

## La carte

Le point etait tombe dans la mer : les coordonnees du depart n'avaient jamais
ete verifiees, et elles etaient fausses des deux cotes, de deux kilometres et
demi en longitude.

Celles de `data/site.json` ont ete relevees sur place. La carte et le lien
pointent ce point, avec le nom de la maison entre parentheses pour que
l'epingle porte une etiquette, et les donnees structurees publient le
`GeoCoordinates`.

Le jour ou on touche a ces nombres sans les verifier, remettre
`approximatif: true` : le generateur retire alors le `GeoCoordinates` des
donnees structurees, plutot que de publier une position devinee qu'un moteur
prendrait pour la bonne. On releve le point par un clic droit sur la maison
dans Google Maps, les deux nombres en tete du menu.

## Regler une prestation en voyant la semaine

Le libelle d'une rangee du planning ouvre son panneau **a gauche du
tableau**, pas plus haut dans la page. On remplit en voyant ce qu'on remplit.
`PANNEAU` porte l'identifiant de l'option reglee, et `#plan[data-cote="oui"]`
passe en deux colonnes.

La carte d'une option se dessine en deux morceaux, `carteOption()` pour la
tete et `reglagesOption()` pour les champs. **Les deux ne se dessinent jamais
en meme temps** : les champs portent des identifiants, et deux copies en
casseraient la moitie. Quand le panneau tient les reglages, la carte de la
liste n'affiche que sa tete et un renvoi.

Les memes ecouteurs servent la liste et le panneau : `brancheOptions()` prend
son conteneur et s'attache aux deux. Un reglage se comporte pareil des deux
cotes parce que c'est le meme code qui le lit.

Pour une prestation a la seance, **ne rien avoir choisi veut dire aucun
jour**, pas tous les jours. Sans cette distinction les pastilles
s'allumaient toutes sous un texte qui disait le contraire.

Des que les jours sont marques, le champ unique *People each time* disparait :
chaque seance porte son effectif plus bas, et garder les deux affichait deux
comptes qui se contredisaient.

L'heure se choisit au quart, dans une liste de quatre-vingt-seize valeurs. Un
champ libre laissait saisir 08:07, et le selecteur natif demande trois gestes
sur un telephone.
