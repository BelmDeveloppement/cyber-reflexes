// © 2026 SAS BELM DEVELOPPEMENT. Ouvre puis révèle CHAQUE question (tour + 1 joueur) : aucune erreur JS, jamais d'écran vide ; teste le bouton Retour du navigateur.
const { chromium } = require("playwright");
const fs = require("fs"), CODE = fs.readFileSync(__dirname + "/../private/code-audit.txt", "utf8").trim();
const C = require("../content.js"); const P = JSON.parse(fs.readFileSync(__dirname + "/../private/audit-pack.json", "utf8"));
const ids = C.tasks.map((t) => t.id).concat(P.tasks.map((t) => t.id));
const SID = "V" + Date.now().toString(36).toUpperCase(), ORI = "http://localhost:8765", q = "?s=" + SID + "&relay=" + encodeURIComponent("ws://localhost:8787");
let bad = 0; const ok = (c, m) => { console.log((c ? "OK     " : "ÉCHEC  ") + m); if (!c) bad++; };
(async () => {
  const br = await chromium.launch(), errs = [];
  const mk = async (n, w) => { const c = await br.newContext({ viewport: { width: w, height: 900 } }); await c.addInitScript((k) => sessionStorage.setItem("cr_ac", k), CODE); const p = await c.newPage(); p.on("pageerror", (e) => errs.push(n + " : " + e.message)); return p; };
  const tour = await mk("tour", 1300); await tour.goto(ORI + "/index.html#/tour" + q); await tour.waitForSelector("text=Relais OK", { timeout: 15000 });
  const pl = await mk("joueur", 1100); await pl.goto(ORI + "/index.html#/j" + q); await pl.fill("input[type=text]", "Test"); await pl.click("button:has-text('Équipe A')"); await pl.click("text=Rejoindre la part"); await tour.waitForSelector("text=Joueurs (1)");
  const vides = [];
  for (const id of ids) {
    if (!(await tour.locator("input[placeholder^='Plan B']").count())) { console.log("TOUR VIDE avant", id, errs.slice(-1)); break; } await tour.fill("input[placeholder^='Plan B']", id); await tour.click("button:has-text('Ouvrir')"); await tour.waitForTimeout(250);
    const b = tour.locator("button:has-text('Révéler la correction')"); if (await b.count()) { await b.click(); await tour.waitForTimeout(350); }
    const tl = ((await tour.textContent("body")) || "").length, pt = ((await pl.textContent("body")) || "").length;
    if (tl < 600 || pt < 200 || await tour.locator("text=n'a pas pu s'afficher").count() || await pl.locator("text=n'a pas pu s'afficher").count()) vides.push(id);
  }
  ok(vides.length === 0, ids.length + " questions ouvertes et révélées sans écran vide ni erreur" + (vides.length ? " : " + vides.join(",") : ""));
  // Retour du navigateur : reste dans le jeu
  await tour.goBack().catch(() => {}); await tour.waitForTimeout(500); ok(tour.url().includes("#/tour") && (await tour.textContent("body")).includes("Quitter le jeu"), "tour : Retour du navigateur reste dans le jeu");
  await pl.goBack().catch(() => {}); await pl.waitForTimeout(500); ok(pl.url().includes("#/j") && (await pl.textContent("body")).includes("Quitter le jeu"), "joueur : Retour du navigateur reste dans le jeu");
  await pl.click("button.tb:has-text('Quitter le jeu')"); await pl.waitForSelector("text=Voulez-vous vraiment quitter le jeu"); await pl.click("button:has-text('Rester dans le jeu')"); ok(pl.url().includes("#/j"), "joueur : « Rester » garde la partie");
  await pl.click("button.tb:has-text('Quitter le jeu')"); await pl.click("[role=dialog] >> button:has-text('Quitter le jeu')"); await pl.waitForTimeout(600); ok(!pl.url().includes("#/j"), "joueur : « Quitter » sort du jeu");
  ok(errs.length === 0, "aucune erreur JavaScript" + (errs.length ? " : " + errs.slice(0, 3).join(" | ") : ""));
  await br.close(); console.log(bad ? "ÉCHECS : " + bad : "Tout passe"); process.exit(bad ? 1 : 0);
})();
