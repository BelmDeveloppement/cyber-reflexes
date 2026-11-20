// © 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés. Créé avec l'aide de Claude (Anthropic), relu par l'auteur.
// Jeu 23 · « Réflexes » : barème du compte collectif (version 3 du document « bareme-decouvertes-v3 » du projet).
// Un seul fichier à modifier pour changer les montants. Chaque élément est crédité une seule fois par équipe.
// Règles de crédit (src) :
//   { kind: "score", task }                  : moyenne de l'équipe sur la question >= 1,5 (sur 3)
//   { kind: "champ", task, champ, val }      : au moins la moitié de l'équipe a choisi cette valeur
//   { kind: "champNot", task, champ, val }   : au moins la moitié de l'équipe a choisi autre chose que cette valeur
//   null                                     : élément pas encore activé (aucun crédit)
(function (g) {
  var B = {
    mention: "Estimation pédagogique. Les aides dépendent de l'éligibilité et des conditions en vigueur.",
    seuil: 1.5,
    lignes: [{ id: "rg", n: "Ressources et gestes" }, { id: "ai", n: "Aides identifiées" }],
    items: [
      { id: "A1", l: "rg", n: "Fiches réflexes de Cybermalveillance.gouv.fr", v: 100, src: { kind: "champ", task: "T1", champ: "a1", val: "o" } },
      { id: "A2", l: "rg", n: "Diagnostic en ligne 17Cyber", v: 100, src: { kind: "champ", task: "T1", champ: "a2", val: "o" } },
      { id: "A3", l: "rg", n: "ANSSI : la cybersécurité pour les TPE/PME en douze questions", v: 150, src: { kind: "champ", task: "T1", champ: "a3", val: "o" } },
      { id: "A4", l: "rg", n: "ANSSI : maîtriser la relation fournisseurs", v: 150, src: { kind: "champ", task: "T1", champ: "a4", val: "o" } },
      { id: "A5", l: "rg", n: "ANSSI : guide d'hygiène informatique", v: 150, src: { kind: "champ", task: "T1", champ: "a5", val: "o" } },
      { id: "A6", l: "rg", n: "CNIL : mots de passe et violation de données", v: 50, src: { kind: "champ", task: "T1", champ: "a6", val: "o" } },
      { id: "A7", l: "rg", n: "Fiche réflexe d'une page", v: 50, src: { kind: "champ", task: "T1", champ: "a7", val: "o" } },
      { id: "B1", l: "rg", n: "VirusTotal : analyser un lien sans l'ouvrir", v: 25, src: { kind: "champ", task: "T1", champ: "b1", val: "o" } },
      { id: "B2", l: "rg", n: "Have I Been Pwned : adresse présente dans une fuite", v: 25, src: { kind: "champNot", task: "H1", champ: "n", val: "x" } },
      { id: "B3", l: "rg", n: "No More Ransom (Crypto Sheriff)", v: 50, src: { kind: "champ", task: "T1", champ: "b3", val: "o" } },
      { id: "B4", l: "rg", n: "Où signaler quoi : 33700, Signal Spam, PHAROS, 17Cyber", v: 50, src: { kind: "score", task: "R1" } },
      { id: "B5", l: "rg", n: "Petit audit du domaine (MXToolbox, crt.sh)", v: 100, src: { kind: "champ", task: "T1", champ: "b5", val: "o" } },
      { id: "B6", l: "rg", n: "Diagnostic gratuit de MesServicesCyber", v: 300, src: { kind: "champ", task: "T1", champ: "b6", val: "o" } },
      { id: "B7", l: "rg", n: "CSIRT Grand Est (assistance, scan de vulnérabilités)", v: 200, src: { kind: "champ", task: "T1", champ: "b7", val: "o" } },
      { id: "C1", l: "rg", n: "Geste : survoler le lien avant de cliquer", v: 200, src: { kind: "score", task: "L1" } },
      { id: "C2", l: "rg", n: "Geste : lire le domaine de l'expéditeur", v: 200, src: { kind: "score", task: "P1" } },
      { id: "C3", l: "rg", n: "Geste : activer le second facteur", v: 500, src: { kind: "score", task: "Q2" } },
      { id: "C4", l: "rg", n: "Geste : mot de passe long ou gestionnaire", v: 200, src: { kind: "score", task: "Q1" } },
      { id: "C5", l: "rg", n: "Geste : éviter le Wi-Fi public sans protection", v: 200, src: { kind: "score", task: "Q3" } },
      { id: "C6", l: "rg", n: "Geste : rien de confidentiel dans un assistant IA public", v: 500, src: { kind: "score", task: "Q5" } },
      { id: "C7", l: "rg", n: "Geste : badge et porte", v: 200, src: { kind: "score", task: "Q7" } },
      { id: "C8", l: "rg", n: "Geste : sauvegarde 3-2-1 et test de restauration", v: 1000, src: { kind: "score", task: "Q8" } },
      { id: "C9", l: "rg", n: "Geste : contre-vérifier un changement de RIB", v: 1000, src: { kind: "score", task: "S4" } },
      { id: "C10", l: "rg", n: "Geste : signaler vite à son référent", v: 200, src: { kind: "score", task: "S8" } },
      { id: "C11", l: "rg", n: "Geste : visio suspecte, vérifier par un second canal", v: 500, src: { kind: "score", task: "S6" } },
      { id: "D1", l: "ai", n: "Diag Cybersécurité (Bpifrance, France 2030) : subvention de 50 % sur 8 800 € HT", v: 4400, src: { kind: "champ", task: "D1", champ: "a", val: "e" } },
      { id: "D2", l: "ai", n: "Cyber PME (Bpifrance) : subvention de 30 000 à 80 000 € (bas de fourchette)", v: 30000, src: { kind: "champ", task: "D1", champ: "b", val: "e" } },
      { id: "D3", l: "ai", n: "Diagnostic Cyber, Région Grand Est : subvention de 50 %, plafond 5 000 €", v: 5000, src: { kind: "champ", task: "D1", champ: "c", val: "e" } }
    ]
  };
  g.BAREME = B;
  if (typeof module !== "undefined") module.exports = B;
})(typeof window !== "undefined" ? window : globalThis);
