# Points a trancher

L'audit de l'ancien site relevait des informations qui se contredisent d'une page
a l'autre. Je n'ai rien invente. Voici ce que le nouveau site dit, pourquoi, et ce
qu'il faut verifier. Chaque correction tient en une ligne dans `data/`.

## Chambres

| Point | Ancien site | Ce que dit le nouveau | A verifier |
|---|---|---|---|
| Triple Room, lits | fiche : 1 King + 1 Bunk | 1 King + 1 Bunk | **Aucune des 5 photos ne montre de lit superpose.** Si le bunk n'existe plus, corriger `data/chambres.json`, cle `lits`. |
| Triple Room, capacite | 3 sur l'accueil, 2 sur la fiche | 3 | |
| Presidential Suite, capacite | 3 sur l'accueil, 2 sur la fiche | 2 | |
| Presidential Suite, lits | 1 King sur l'accueil, 1 King + 1 Bunk sur la fiche | 1 King | Les photos montrent un lit a baldaquin, pas de bunk. |
| Private Salah, lit | Queen sur l'accueil, King sur la fiche | 1 King | La photo montre bien un king. |
| Pool View, description | copiee de la Family Room, donc fausse | reecrite depuis les photos | |
| Family Room, lits | 1 King + 1 Twin | 1 King + 2 Singles | Les photos montrent un king et un second lit. A confirmer. |
| Triple Room, tableau | non mentionne | "a large elephant portrait" | Le grand portrait d'elephant au-dessus du lit n'est pas signe sur la photo. Je ne l'ai pas attribue a Anis Dargaa faute de certitude. C'est de lui ? |
| Gym Facility | present sur la seule fiche Family | **retire partout** | Il y a une salle de sport ou non ? |
| Prix | "from 4500 THB" sur les six, donc une valeur par defaut | **aucun prix affiche** | Les prix reels vivent dans le moteur de reservation. Si tu veux les afficher, donne-moi la grille. |

## Horaires et politiques

| Point | Ancien site | Ce que dit le nouveau |
|---|---|---|
| Check in | 3 PM a 8 PM dans la FAQ, 2 PM sur les fiches | **3 PM a 8 PM**, la FAQ est plus precise |
| Surfaces | "45 a 80 m2" dans la FAQ, 40 a 68 sur les fiches | **40 a 68 m2**, les fiches font foi |
| Age minimum | "adults only" mais 15 ans et plus | repris tel quel | C'est ta politique, pas a moi de la changer. Mais "adults only" avec une Family Room et une arrivee des 15 ans, un client peut tiquer. |

## Rattachement des photos

Les six series de photos que tu m'as envoyees ont ete rattachees comme ceci.
Si l'une est mal placee, c'est une ligne a bouger dans `outils/images.sh`.
Chaque texte alternatif a ete ecrit en regardant la photo, pas de memoire.

| Ta serie | Chambre |
|---|---|
| chambre 1 | Deluxe Junior Suite |
| chambre 2 | Deluxe Triple Room (tu as dit "triple room = 2") |
| family | Deluxe Family Room |
| king pool view | Deluxe King Room with Pool View |
| king private salah | Deluxe King Room with Private Salah |
| presidentielle | Presidential Suite |

## Ce qui a ete supprime de l'ancien site

- Les trois offres speciales en lorem ipsum avec des boutons vers `#`.
- Le bloc "Near Destinations" qui listait Big Ben et Buckingham Palace.
- Les trois faux avis clients avec des portraits de banque d'images.
- Le bouton "Retraites Couples Clara Morgane" du menu, qui renvoyait a l'accueil.
  La page est mise de cote, comme convenu. Quand tu auras le contenu, elle se
  rajoute en une fois.

## Ce qui reste a faire

1. **Page Clara Morgane.** En attente de contenu.
2. **Version francaise.** Le site est en anglais, comme l'ancien. Une vraie
   version FR vaut le coup pour la clientele francaise, ca ne se fait pas en
   traduction automatique. A decider.
3. **Les photos de Koh Phangan.** L'audit signale six images dont l'origine est
   douteuse. Je n'en ai repris aucune. La page Location n'utilise que tes photos.
4. **Vraies photos de la plage de Ban Tai.** Il n'y en a aucune dans le lot.
5. **Video du hero.** L'ancien site avait une vue aerienne YouTube (2SAt0HK6fgI).
   J'ai mis une photo a la place, qui charge plus vite. Dis si tu veux la video.
