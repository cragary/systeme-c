# 2026-08-09 — Portail des propositions #C

## Objectif

Donner une seule URL à partager pour la revue de design : un portail qui ouvre les
six propositions **A à F** et les deux pages internes — et faire en sorte que chaque
page renvoie vers **Communauté** et **Rejoindre**, ce qu'aucune ne faisait jusqu'ici.

## Ce qui a été fait

| Étape | Détail |
|---|---|
| Sources | `d:\Projects\gray-matter\#c\pages\*.html` (8 exports groupés) |
| Build | `tools/build-site.mjs` — sources jamais modifiées, sortie dans `./site` |
| URL publique | **https://cragary.github.io/systeme-c/** |
| Poids | 53,3 Mo (dont 24,6 Mo pour la proposition B) |

### Arborescence publiée

```
index.html            portail
proposition-a.html    Le Système complet     ← Systeme C - Page complete
proposition-b.html    Hors ligne             ← Systeme C - Page (hors ligne)
proposition-c.html    Le Landing             ← C - Landing (standalone)
proposition-d.html    Le Journal             ← Variante A
proposition-e.html    Le Plein écran         ← Variante B
proposition-f.html    Le Studio              ← Variante C
rejoindre.html        formulaire de candidature
carte-partage.html    OG-01
assets/fonts/         5 woff2 + fonts.css
legacy/pass-1.html    ancien index.html, conservé
```

Les lettres sont dérivées de la position dans `PAGES` : réordonner la liste
renomme tout d'un coup, rien ne peut se désynchroniser.

## Décisions

**Injection dans le `template`, pas dans le fichier extérieur.** Chaque export est
un bundle auto-extractible : la vraie page est une chaîne JSON dans
`<script type="__bundler/template">`, et l'amorce termine par
`document.documentElement.replaceWith(...)`. Tout ce qui est ajouté au fichier
extérieur est donc détruit au déballage. La navigation est insérée **dans** la
chaîne du template, avant `</body>`.

**Ré-échappement `</` → `\u002F` obligatoire.** La navigation injectée contient un
`<script>`. Sans ré-échapper, son `</script>` fermerait prématurément la balise
`__bundler/template` et la page ne se déballerait jamais. `\u002F` se reparse en
`/`, donc le template est identique après `JSON.parse` — c'est l'échappement que le
producteur du bundle applique déjà (visible dans les `<\u002Ftitle>` des sources).

**`scrollIntoView`, pas `href="#id"`.** Les pages ne sont pas d'accord sur ce qui
défile : le document pour l'une, un conteneur imbriqué `#pe-scroll` pour la
proposition E, `<body overflow-y:auto>` pour la D. Un saut d'ancre classique fait
défiler le *document* — sans effet sur la E. Le même raisonnement vaut pour
l'auto-masquage de la barre, qui lit le `scrollTop` de la cible de l'événement
plutôt que `window.pageYOffset` (bloqué à 0 sur deux pages sur six).

**Décalage d'en-tête mesuré, pas constant.** `scrollIntoView({block:'start'})` cale
la cible en haut du viewport sans savoir qu'un en-tête collant la recouvre. B et C
en ont un, les autres non. La barre mesure donc le *bas* de l'élément
`fixed`/`sticky` réellement épinglé en haut — pas sa hauteur, et avec du jeu au
sommet, car ces en-têtes sont des pilules flottantes en retrait du bord. Résultat :
86 px sur C, 0 sur E, dont les sections plein écran (`scroll-snap-type: y mandatory`)
doivent rester à fleur.

**Communauté : ancre interne, pas page séparée.** « Communauté » n'existe pas comme
fichier — c'est une section de chaque page (`t-com`, `jr-t-com`, `pe-07`, `st-07`).
B et C n'ont pas d'`id` : la barre y retrouve la section par son libellé — d'abord
un intitulé exact (« Communauté », B), sinon un titre court qui contient le mot
(« Une communauté », `h3` de C). Restreint aux `h1`–`h4` de 40 caractères maximum,
pour qu'un paragraphe qui mentionne le mot ne puisse pas gagner — C en compte trois
en corps de texte, dont un qui aurait gagné en ordre du document. Le lien se masque
si rien ne correspond. Depuis `rejoindre.html` et `carte-partage.html`, il pointe
vers `proposition-a.html#pn-com`, résolu au chargement.

**Polices extraites du bundle.** Instrument Serif et Switzer sont dans le manifeste
en base64 (`font/woff2`, non compressées). Elles sont écrites dans `assets/fonts/`
plutôt que chargées depuis Google Fonts / Fontshare : rendu identique aux pages,
aucune requête externe. Un woff2 par uuid — une famille réapparaît dans plusieurs
blocs `@font-face` qui ne diffèrent que par `unicode-range`.

**Titres d'onglet réécrits en `#C / <lettre> — <nom>`.** Deux exports n'avaient pas
de `<title>` du tout, et les autres portaient des titres quasi identiques —
indistinguables une fois six onglets ouverts côte à côte.

**Ancien `index.html` conservé.** Déplacé en `legacy/pass-1.html` et accessible
depuis le pied du portail. La racine sert désormais le portail.

## Publication — un commit par proposition

Le lien montant du poste plafonne autour de 25 Ko/s au moment du test (3 Mo en
2 min 04 s). Un push atomique de 53 Mo n'a donc aucune chance d'aboutir, et
`git push` ne reprend pas : deux tentatives ont tourné 1 h et 1 h 40 sans rien
transférer, puis ont été abandonnées — le dépôt distant n'avait pas bougé d'un
octet.

Découpage retenu : d'abord la charge légère (portail, polices, pages internes,
`legacy/`, `tools/` — 980 Ko), puis **une proposition par commit, de la plus petite
à la plus grosse**, poussée immédiatement. Chaque push abouti est acquis. Le débit
réel s'est révélé bien meilleur que le test (~120 Ko/s) et l'ensemble est passé en
quelques minutes.

Une fausse piste au passage : `core.compression 0`, posé en pensant que du base64
d'images est incompressible. C'est vrai des charges binaires, mais pas du HTML/CSS/JS
qui les entoure — le réglage grossissait le pack qu'il devait alléger. Retiré.

## Vérification

Servi en local sur `:4173` et ouvert dans Chrome — les huit pages se déballent, la
barre survit au remplacement du document, aucune erreur console. Communauté vérifiée
page par page : `t-com` → « TU NE SERAS PAS SEUL(E). » ; `pe-07` passe de 4407 px à
0 via `#pe-scroll` ; `st-07` de 7571 px à 0 ; B atteint « 04 Communauté » ; C
atteint « Une communauté » à 86 px, dégagé de son en-tête (`elementFromPoint` sur le
coin du titre ne renvoie que le titre lui-même). Lien profond
`proposition-a.html#pn-com` : atterrit à 0 px.
