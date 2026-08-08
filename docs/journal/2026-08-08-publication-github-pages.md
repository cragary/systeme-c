# 2026-08-08 — Publication du spécimen #C sur GitHub Pages

## Objectif

Rendre la page « Système #C — Pass 1 » accessible via une URL publique, partageable
sans envoyer un fichier HTML de 209 Ko par mail.

## Ce qui a été fait

| Étape | Détail |
|---|---|
| Source | `~/Downloads/Pass 1 - Système C.html` (modifié le 08/08/2026 à 04:59) |
| Dépôt local | `~/projects/systeme-c` |
| Dépôt distant | https://github.com/cragary/systeme-c (public) |
| URL publique | **https://cragary.github.io/systeme-c/** |
| Build Pages | `built`, 26 s, sans erreur |

### Commits

- `6c6a5e0` — Add #C design system specimen (Pass 1)

## Décisions

**Copie binaire, pas de réécriture.** Le fichier a été copié avec `Copy-Item`
(SHA-256 identique à la source) au lieu d'être lu/réécrit par PowerShell. Une
réécriture via le pipeline texte aurait pu corrompre l'encodage UTF-8 des accents
(SYSTÈME, SPÉCIMEN, DÉSACTIVÉ) selon la page de code de la console.

**Dépôt public — imposé, pas choisi.** GitHub Pages ne sert un site depuis un dépôt
privé qu'avec un compte Pro/Team/Enterprise. « URL publique » implique donc
nécessairement que le HTML source soit public et indexable. Vérifié avant
publication : aucun secret dans le bundle (les chaînes `eyJ…` détectées par le scan
sont des sous-chaînes aléatoires du blob base64 compressé, pas des JWT).

**Renommage en `index.html`.** Le nom d'origine contient une espace et un accent —
mauvais candidat pour une URL. Servi à la racine du site.

**`.nojekyll` ajouté.** Court-circuite le traitement Jekyll de GitHub Pages :
build plus rapide et garantie qu'aucun fichier ne sera filtré à l'avenir
(Jekyll ignore les fichiers préfixés par `_`).

## Vérifications effectuées

- `HTTP 200`, `Content-Length: 213830` — identique à l'octet près au fichier local
- `Content-Type: text/html; charset=utf-8` — accents corrects
- HTTPS forcé (`https_enforced: true`)
- Rendu réel contrôlé dans Chrome : le bundle se décompresse, le titre passe de
  « Bundled Page » à « #C — Système · Pass 1 », la police Switzer se charge, les
  échantillons de couleur s'affichent

## Problèmes / points ouverts

- **404 favicon (bénin).** Chrome demande `https://cragary.github.io/favicon.ico`
  — à la racine du domaine, hors de ce dépôt. Sans balise `<link rel="icon">` dans
  la page, ajouter un fichier au dépôt ne suffirait pas : il faut déclarer le lien
  dans le HTML. Sans impact sur le rendu.
- **Le bundle est opaque au diff.** Le contenu est un manifeste base64 gzippé :
  `git diff` ne dira jamais ce qui a changé entre deux passes. D'où ce journal.
- **Variante non publiée.** `Pass 1 - Système et CTA (standalone).html` (04:07)
  reste en local. À publier sous `/cta/` si besoin de comparer les deux passes.

## Actions équipe

- Convention de commits : `feat:` / `docs:` / `chore:` en anglais, journal en français.
- Pour mettre à jour la page en ligne : remplacer `index.html`, commit, `git push`.
  Pages redéploie tout seul en ~30 s.
