# Jeu 23 · « Réflexes » (cyber-reflexes)
Application web statique (écran joueur, mode solo, tour de contrôle). Relais Cloudflare `cpro-relay` en voie principale, ntfy en secours des diapositives.
- Joueurs : `#/j?s=MELIA7K3Q9X` · Tour : `#/tour?s=MELIA7K3Q9X` · Solo : `#/solo` · Règles : `#/regles` · Manche 2 solo : `#/solo?m=2` · Boîte à outils web : `#/outils`
- Publication prévue : https://belmdeveloppement.github.io/cyber-reflexes/ (GitHub Pages, à publier : dépôt non créé depuis la session)
- Tests : `node tests/test_content.js` ; `node tests/e2e.js` (Playwright, relais local `wrangler dev` sur :8787 et `python3 -m http.server 8765`)
- Fonctions : boutons ◀ ▶ (joueur et tour), Règles fixe, Signaler (non anonyme, file hors ligne, sujet relais `g`, validation par l'animateur), compte collectif (`bareme.js`), imprévus par scène, manche 2 (S1b à S8b), scènes Mélia M1 et M2 (à valider avec leur direction), badges personnels sans classement, boîte à outils web (outils actifs verrouillés tant que l'accord de Mélia n'est pas coché).
- À retester le jour J : les adresses des outils externes (SSL Labs, MDN Observatory, Security Headers, MXToolbox) peuvent changer.
© 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés.
