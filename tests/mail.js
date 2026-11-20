// © 2026 SAS BELM DEVELOPPEMENT. Test du faux client de messagerie et du suivi animateur.
const { chromium } = require("playwright");
let bad = 0; const ok = (c, m) => { console.log((c ? "OK     " : "ÉCHEC  ") + m); if (!c) bad++; };
(async () => {
  const br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 390, height: 900 } }), p = await ctx.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://localhost:8765/#/solo?q=P1"); await p.waitForSelector(".mailwrap");
  ok(!(await p.locator(".mshort").isVisible()), "adresse de l'expéditeur masquée au départ");
  await p.click(".msender"); ok(await p.locator(".mshort").isVisible(), "adresse visible après appui sur le nom");
  ok((await p.locator(".mstatus").textContent()).includes("alerte@m365-support.verif-compte.net"), "barre d'état : adresse réelle");
  await p.click(".mlink.btn"); ok((await p.locator(".mstatus").textContent()).includes("https://m365-support.verif-compte.net/login"), "lien : adresse réelle sans navigation");
  ok(p.url().indexOf("#/solo") > 0, "aucune navigation");
  await p.screenshot({ path: "/tmp/claude-0/mail_p1.png" });
  for (const id of ["P3", "P4", "P5", "P6", "L1"]) { await p.goto("about:blank"); await p.goto("http://localhost:8765/#/solo?q=" + id); await p.waitForSelector(".mailwrap"); await p.screenshot({ path: "/tmp/claude-0/mail_" + id + ".png" }); }
  ok(errs.length === 0, "aucune erreur JavaScript " + errs.join("|"));
  await br.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log("ERREUR", e.message); process.exit(2); });
