// © 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés. Créé avec l'aide de Claude (Anthropic), relu par l'auteur.
// Jeu 23 · « Réflexes » : logique pure (mélange, notation, jauges). Utilisable dans le navigateur et sous Node (tests).
(function (g) {
  function hash(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function rng(seed) { var a = hash(String(seed)); return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, seed) { var a = arr.slice(), r = rng(seed); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function inversions(given, correct) { var pos = {}; correct.forEach(function (x, i) { pos[x] = i; }); var n = 0; for (var i = 0; i < given.length; i++) for (var j = i + 1; j < given.length; j++) if (pos[given[i]] > pos[given[j]]) n++; return n; }
  function clamp(x) { return Math.max(0, Math.min(3, x)); }
  // Note d'une réponse : 0 à 3, ou null pour un sondage. `a` = réponse du joueur, `k` = corrigé.
  function score(task, k, a) {
    if (task.sondage || !k) return null;
    if (a == null) return 0;
    if (task.type === "single") return a === k.best ? 3 : (k.ok && k.ok.indexOf(a) >= 0 ? 1 : 0);
    if (task.type === "multi") { var good = k.good, sel = Array.isArray(a) ? a : [], hits = 0, wrong = 0; sel.forEach(function (x) { if (good.indexOf(x) >= 0) hits++; else wrong++; }); return clamp(Math.round(3 * (hits - wrong) / good.length)); }
    if (task.type === "order") { if (!Array.isArray(a) || a.length !== k.order.length) return 0; var inv = inversions(a, k.order); return inv === 0 ? 3 : inv === 1 ? 2 : inv === 2 ? 1 : 0; }
    if (task.type === "form") { var ids = Object.keys(k.ans), c = 0; ids.forEach(function (f) { if (a && a[f] === k.ans[f]) c++; }); return Math.round(3 * c / ids.length); }
    return 0;
  }
  // Effet d'une scène sur les jauges d'une équipe, d'après la moyenne des notes (0 à 3).
  function effet(avg, jauges) { if (avg >= 2.4) return {}; var e = {}; if (avg >= 1.5) e[jauges[0]] = -1; else { e[jauges[0]] = -2; e[jauges[1]] = -1; } return e; }
  // Compte collectif d'une équipe : crédite chaque élément du barème une seule fois, après action de l'équipe.
  // res = résultats des questions révélées, ans = réponses par question et par joueur, pl = joueurs {pid:{tm}}.
  function compte(bareme, res, ans, pl, team) {
    var mem = Object.keys(pl || {}).filter(function (p) { return pl[p].tm === team; }), out = { tot: {}, ids: [] };
    bareme.lignes.forEach(function (l) { out.tot[l.id] = 0; });
    bareme.items.forEach(function (it) {
      var s = it.src; if (!s || !res[s.task]) return;
      var ok = false;
      if (s.kind === "score") { var r = res[s.task].team; ok = !!r && r[team] != null && r[team] >= bareme.seuil; }
      else if (mem.length) {
        var a = (ans && ans[s.task]) || {}, n = 0;
        mem.forEach(function (p) { var x = a[p]; if (x == null) return; var v = x[s.champ]; if (v == null) return; if (s.kind === "champ" ? v === s.val : v !== s.val) n++; });
        ok = n > 0 && n * 2 >= mem.length;
      }
      if (ok) { out.ids.push(it.id); out.tot[it.l] += it.v; }
    });
    out.total = bareme.lignes.reduce(function (t, l) { return t + out.tot[l.id]; }, 0);
    return out;
  }
  g.CRE = { compte: compte, hash: hash, rng: rng, shuffle: shuffle, inversions: inversions, score: score, effet: effet };
  if (typeof module !== "undefined") module.exports = g.CRE;
})(typeof window !== "undefined" ? window : globalThis);
