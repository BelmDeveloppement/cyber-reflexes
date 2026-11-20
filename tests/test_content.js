// © 2026 SAS BELM DEVELOPPEMENT. Tests de contenu et de notation du jeu 23.
const C = require("../content.js"), K = require("../corriges.js"), E = require("../engine.js");
let bad = 0; const fail = (m) => { bad++; console.log("ÉCHEC :", m); };
const ids = new Set();
// Le relevé d'audit est chiffré dans le dépôt : on fusionne le paquet privé s'il est présent (poste de l'auteur).
const fs = require("fs"), pk = require("path").join(__dirname, "../private/audit-pack.json");
if (fs.existsSync(pk)) { const P = JSON.parse(fs.readFileSync(pk, "utf8")); const at = C.tasks.findIndex((t) => t.id === "F1"); C.tasks.splice(at, 0, ...P.tasks); Object.assign(K, P.keys); console.log("paquet d'audit privé fusionné :", P.tasks.length, "questions"); } else console.log("paquet d'audit absent : questions AU non testées");
C.tasks.forEach((t) => {
  if (ids.has(t.id)) fail("doublon " + t.id); ids.add(t.id);
  const k = K[t.id]; if (!k) return fail("pas de corrigé " + t.id);
  if (!t.but || !t.enonce || !t.titre) fail("but/énoncé/titre manquant " + t.id);
  if (!k.expl) fail("pas d'explication " + t.id);
  const opts = (t.options || []).map((o) => o.id);
  if (t.options) { if (new Set(opts).size !== opts.length) fail("options en double " + t.id); if (new Set(t.options.map((o) => o.t)).size !== opts.length) fail("textes d'options en double " + t.id); }
  if (t.sondage) return;
  if (t.type === "single") { if (!opts.includes(k.best)) fail("best invalide " + t.id); (k.ok || []).forEach((x) => { if (!opts.includes(x)) fail("ok invalide " + t.id); }); opts.forEach((o) => { if (!k.why[o]) fail("why manquant " + t.id + o); }); if (opts.length < 4) fail("moins de 4 options " + t.id); }
  if (t.type === "multi") { k.good.forEach((x) => { if (!opts.includes(x)) fail("good invalide " + t.id); }); opts.forEach((o) => { if (!k.why[o]) fail("why manquant " + t.id + o); }); if (t.max !== k.good.length) fail("max ≠ nombre de bonnes réponses " + t.id); }
  if (t.type === "order") { if ([...k.order].sort().join() !== [...opts].sort().join()) fail("ordre invalide " + t.id); opts.forEach((o) => { if (!k.why[o]) fail("why manquant " + t.id + o); }); }
  if (t.type === "form") t.champs.forEach((f) => { const fo = f.o.map((o) => o.id); if (!fo.includes(k.ans[f.id])) fail("réponse de champ invalide " + t.id + f.id); if (!k.why[f.id]) fail("why de champ manquant " + t.id + f.id); });
  if (t.jeu && !(t.jauges && t.jauges.length === 2)) fail("jauges de scène " + t.id);
  if (t.jeu && !k.bad) fail("message d'échec manquant " + t.id);
});
// Équilibre des bonnes réponses (avant mélange, l'ordre n'a pas d'importance : on vérifie le mélange déterministe et différent d'un joueur à l'autre)
const q = C.tasks.find((t) => t.id === "Q1"); const o1 = E.shuffle(q.options, "p1Q1").map((o) => o.id).join(""), o2 = E.shuffle(q.options, "p2Q1").map((o) => o.id).join("");
if (o1 === o2) fail("deux joueurs voient le même ordre (peu probable : revoir le mélange)");
if (E.shuffle(q.options, "p1Q1").map((o) => o.id).join("") !== o1) fail("mélange non déterministe");
// Notation
const eq = (a, b, m) => { if (a !== b) fail(m + " : attendu " + b + ", obtenu " + a); };
eq(E.score(C.tasks.find((t) => t.id === "S1"), K.S1, "c"), 3, "single parfait"); eq(E.score(C.tasks.find((t) => t.id === "S1"), K.S1, "b"), 1, "single partiel"); eq(E.score(C.tasks.find((t) => t.id === "S1"), K.S1, "a"), 0, "single faux");
const s5 = C.tasks.find((t) => t.id === "S5"); eq(E.score(s5, K.S5, ["b", "d"]), 3, "multi parfait"); eq(E.score(s5, K.S5, ["b"]), 2, "multi une bonne"); eq(E.score(s5, K.S5, ["a", "c"]), 0, "multi deux fausses"); eq(E.score(s5, K.S5, ["b", "a"]), 0, "multi une bonne une fausse");
const s7 = C.tasks.find((t) => t.id === "S7"); eq(E.score(s7, K.S7, ["a", "b", "c", "d"]), 3, "ordre parfait"); eq(E.score(s7, K.S7, ["b", "a", "c", "d"]), 2, "ordre 1 inversion"); eq(E.score(s7, K.S7, ["d", "c", "b", "a"]), 0, "ordre inversé");
const p1 = C.tasks.find((t) => t.id === "P1"); eq(E.score(p1, K.P1, { v: "piege", i: "a", a: "b" }), 3, "form parfait"); eq(E.score(p1, K.P1, { v: "piege", i: "b", a: "b" }), 2, "form 2/3"); eq(E.score(p1, K.P1, {}), 0, "form vide");
eq(E.score(C.tasks.find((t) => t.id === "O1"), K.O1, ["x"]), null, "sondage non noté");
eq(JSON.stringify(E.effet(3, ["d", "p"])), "{}", "effet nul"); eq(JSON.stringify(E.effet(2, ["d", "p"])), '{"d":-1}', "effet léger"); eq(JSON.stringify(E.effet(0.5, ["d", "p"])), '{"d":-2,"p":-1}', "effet fort");
// Compte collectif
const B = require("../bareme.js");
const itemIds = new Set(); B.items.forEach((it) => { if (itemIds.has(it.id)) fail("élément de barème en double " + it.id); itemIds.add(it.id); if (!(it.v > 0)) fail("valeur invalide " + it.id); if (!B.lignes.some((l) => l.id === it.l)) fail("ligne inconnue " + it.id); if (it.src) { const t = C.tasks.find((x) => x.id === it.src.task); if (!t) return fail("tâche inconnue pour " + it.id); if (it.src.champ && !t.champs.some((f) => f.id === it.src.champ && f.o.some((o) => o.id === it.src.val))) fail("champ ou valeur inconnu pour " + it.id); } });
eq((B.items.filter((i) => i.id === "B5")[0].src || {}).champ, "b5", "B5 crédité par le sondage T1");
eq(B.items.reduce((t, it) => t + it.v, 0), 45600, "total maximal du barème");
const pl = { p1: { tm: "A" }, p2: { tm: "A" }, p3: { tm: "B" } };
const res = { L1: { team: { A: 2, B: 1 } }, T1: { per: {} }, D1: { per: {} } };
const ans = { T1: { p1: { a3: "o" }, p2: { a3: "p" }, p3: { a3: "o" } }, D1: { p1: { a: "e", b: "e", c: "n" }, p2: { a: "e", b: "e", c: "e" } } };
const ca = E.compte(B, res, ans, pl, "A"), cb = E.compte(B, res, ans, pl, "B");
eq(ca.ids.join(), "A3,C1,D1,D2,D3", "équipe A : ressources, geste et aides crédités"); eq(ca.total, 150 + 200 + 4400 + 30000 + 5000, "total équipe A");
eq(cb.ids.join(), "A3", "équipe B : seule la ressource ouverte par sa moitié"); eq(E.compte(B, {}, {}, pl, "A").total, 0, "rien avant la révélation");
eq(E.compte(B, res, ans, pl, "A").ids.join(), ca.ids.join(), "crédit idempotent (une seule fois)");
// Durée estimée du jeu : 8 scènes
const sc = C.tasks.filter((t) => t.jeu && t.manche !== 2); if (sc.length !== 8) fail("le jeu doit compter 8 scènes en manche 1"); if (C.tasks.filter((t) => t.manche === 2).length !== 8) fail("la manche 2 doit compter 8 scènes"); C.tasks.forEach((t) => { if (!t.code) fail("code manquant " + t.id); });
console.log(bad ? bad + " échec(s)" : "OK : " + C.tasks.length + " tâches, corrigés complets, notation conforme");
process.exit(bad ? 1 : 0);
