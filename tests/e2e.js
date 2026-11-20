// © 2026 SAS BELM DEVELOPPEMENT. Test de bout en bout : relais local (wrangler dev, port 8787), tour + 3 joueurs simulés.
const { chromium } = require("playwright");
const SID = "T" + Date.now().toString(36).toUpperCase(), ORI = "http://localhost:8765", RLY = "ws://localhost:8787", HTTP = "http://localhost:8787";
let bad = 0; const ok = (c, m) => { console.log((c ? "OK     " : "ÉCHEC  ") + m); if (!c) bad++; };
const CODE = require("fs").readFileSync(__dirname + "/../private/code-audit.txt", "utf8").trim();
const q = "?s=" + SID + "&relay=" + encodeURIComponent(RLY);
(async () => {
  const br = await chromium.launch(); const errs = [];
  const mk = async (name) => { const c = await br.newContext({ viewport: { width: 390, height: 800 } }); if (name !== "verrou") await c.addInitScript((k) => { try { sessionStorage.setItem("cr_ac", k); } catch (e) {} }, CODE); const p = await c.newPage(); p.on("pageerror", (e) => errs.push(name + " : " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/ERR_TUNNEL|ntfy/.test(m.text())) errs.push(name + " console : " + m.text()); }); return p; };
  const tour = await mk("tour"); await tour.setViewportSize({ width: 1300, height: 900 });
  await tour.goto(ORI + "/index.html#/tour" + q); await tour.waitForSelector("text=Relais OK", { timeout: 15000 }); ok(true, "tour connectée au relais");
  const joueurs = [["Alice", "Équipe A"], ["Bruno", "Équipe A"], ["Chloé", "Équipe B"]]; const P = [];
  for (const [n, t] of joueurs) { const p = await mk(n); await p.goto(ORI + "/index.html#/j" + q); await p.fill("input[type=text]", n); await p.click("button:has-text('" + t + "')"); await p.click("text=Rejoindre la partie"); await p.waitForSelector("text=En attente", { timeout: 10000 }); P.push(p); }
  await tour.waitForSelector("text=Joueurs (3)", { timeout: 10000 }); ok(true, "3 joueurs vus par la tour");
  // Scène 1 (choix unique) ouverte à la main
  await tour.fill("input[placeholder^='Plan B']", "S1"); await tour.click("button:has-text('Ouvrir')");
  for (const p of P) await p.waitForSelector("text=La facture de copeaux", { timeout: 10000 }); ok(true, "S1 affichée chez les 3 joueurs");
  const rep = ["Ne pas l'ouvrir et appeler le fournisseur au numéro de votre base", "Ne pas l'ouvrir et appeler le fournisseur au numéro de votre base", "Activer les macros, c'est le fournisseur habituel"];
  for (let i = 0; i < 3; i++) { await P[i].click("button.opt:has-text(" + JSON.stringify(rep[i]) + ")"); await P[i].click("text=Envoyer ma réponse"); }
  await tour.waitForSelector("text=3 réponse(s) sur 3", { timeout: 10000 }); ok(true, "tour : 3 réponses reçues");
  await tour.click("text=Révéler la correction");
  for (const p of P) await p.waitForSelector("text=À retenir", { timeout: 10000 });
  ok((await P[0].textContent("body")).includes("3 / 3 points"), "Alice : 3 / 3 points");
  ok((await P[2].textContent("body")).includes("0 / 3 points"), "Chloé : 0 / 3 points");
  ok((await P[2].textContent("body")).includes("Conséquence"), "Chloé : conséquence de la scène affichée (moyenne d'équipe basse)");
  ok((await P[0].textContent("body")).includes("Classement des équipes"), "classement affiché");
  // Signal de diapositive : le complément publie sur le sujet « s » (POST /pub), la tour propose la scène
  const r = await fetch(HTTP + "/pub?room=" + SID + "&t=ac" + SID + "s", { method: "POST", body: JSON.stringify({ k: "S", n: 41, g: "S2", _u: "u" + Date.now() }) }); ok(r.ok, "publication HTTP du complément acceptée");
  await tour.waitForSelector("button:has-text('Ouvrir la question S2')", { timeout: 10000 }); ok(true, "tour : bouton de confirmation pour la diapo S2");
  await tour.click("button:has-text('Ouvrir la question S2')");
  for (const p of P) await p.waitForSelector("text=Le faux support informatique", { timeout: 10000 });
  // Ordre : on remet l'ordre attendu en cliquant sur les boutons ▲
  const attendu = ["Ne rien donner et raccrocher", "Noter l'heure, le numéro et ce qui a été demandé", "Prévenir l'informatique ou la direction par le canal habituel", "Si un code a été reçu sans l'avoir demandé, changer le mot de passe du compte"];
  async function ordonner(p) { for (let cible = 0; cible < attendu.length; cible++) { for (let k = 0; k < 8; k++) { const items = await p.$$eval("ol.ol li span", (e) => e.map((x) => x.textContent)); const i = items.indexOf(attendu[cible]); if (i <= cible) break; await p.click("ol.ol li:nth-child(" + (i + 1) + ") button:has-text('▲')"); } } }
  await ordonner(P[0]); await P[0].click("text=Envoyer ma réponse");
  await P[1].click("text=Envoyer ma réponse"); await P[2].click("text=Envoyer ma réponse");
  await tour.waitForSelector("text=3 réponse(s) sur 3"); await tour.click("text=Révéler la correction"); await P[0].waitForSelector("text=Ordre attendu");
  ok((await P[0].textContent("body")).includes("3 / 3 points"), "ordre parfait : 3 / 3");
  // Formulaire : carte P1
  await tour.fill("input[placeholder^='Plan B']", "P1"); await tour.click("button:has-text('Ouvrir')"); await P[0].waitForSelector("text=Mot de passe qui expire");
  const grp = await P[0].$$("div.card .grp"); ok(grp.length >= 2, "carte P1 : saisies guidées par boutons");
  await P[0].click("button:has-text('Piège')"); await P[0].click("button:has-text('Le domaine de l')"); await P[0].click("button:has-text('Ne pas cliquer, signaler')"); await P[0].click("text=Envoyer ma réponse");
  await tour.waitForSelector("text=1 réponse(s) sur 3"); ok(true, "tour : réponse de formulaire reçue");
  // Compte collectif : question sur les aides (D1), 2 joueurs de l'équipe A répondent
  const norm = (t) => t.replace(/[\u202f\u00a0]/g, " ");
  await tour.fill("input[placeholder^='Plan B']", "D1"); await tour.click("button:has-text('Ouvrir')");
  for (const p of P) await p.waitForSelector("text=Quelles aides s'appliquent", { timeout: 10000 });
  for (const i of [0, 1]) { const g = await P[i].$$("div.card .grp"); for (let k = 0; k < 6; k++) { await (await g[k].$(k < 3 ? "button:text-is(\"Éligible\")" : "button:text-is(\"Non éligible\")")).click(); } await P[i].click("text=Envoyer ma réponse"); }
  await tour.waitForSelector("text=2 réponse(s) sur 3"); await tour.click("text=Révéler la correction"); await P[0].waitForSelector("text=Compte de l'équipe", { timeout: 10000 });
  ok(norm(await P[0].textContent("body")).includes("39 400 €"), "Alice : compte de l'équipe A = 39 400 € (3 aides)");
  ok(norm(await P[2].textContent("body")).includes("0 €"), "Chloé : compte de l'équipe B = 0 €");
  ok(norm(await tour.textContent("body")).includes("Détail du compte") && norm(await tour.textContent("body")).includes("Diagnostic Cyber, Région Grand Est"), "tour : détail du compte réservé à l'animateur");
  ok(!(await P[0].textContent("body")).includes("Diagnostic Cyber, Région Grand Est : "), "joueur : pas de détail élément par élément");
  await tour.fill("input[placeholder^='Plan B']", "P1"); await tour.click("button:has-text('Ouvrir')"); await P[0].waitForSelector("text=Mot de passe qui expire", { timeout: 10000 });
  // Rechargement d'un joueur : le profil et les réponses sont conservés
  await P[0].reload(); await P[0].waitForSelector("text=Mot de passe qui expire", { timeout: 10000 }); ok(true, "rechargement du joueur : la question ouverte revient");
  // Rechargement de la tour : l'état est retrouvé
  await tour.reload(); await tour.waitForSelector("text=Joueurs (3)", { timeout: 15000 }); ok(true, "rechargement de la tour : joueurs retrouvés");
  ok((await tour.textContent("body")).includes("✓ S1"), "rechargement de la tour : scène S1 marquée corrigée");
  // Navigation, Règles, Signaler (joueur) ; ◀ ▶ et signalements (tour)
  await P[0].click("button:has-text('◀ Précédente')"); await P[0].waitForSelector("text=Vous relisez la question", { timeout: 8000 }); ok((await P[0].textContent("body")).includes("À retenir"), "joueur : retour sur une question déjà jouée avec sa correction");
  await P[0].click("button:has-text('Revenir à la question en cours')"); await P[0].waitForSelector("text=Mot de passe qui expire", { timeout: 8000 }); ok(true, "joueur : retour à la question en cours");
  await P[0].click("button.tb:has-text('Règles')"); await P[0].waitForSelector("[role=dialog] >> text=Lundi chez Granuval"); ok(true, "joueur : bouton Règles fixe ouvre les règles"); await P[0].click("button:has-text('Fermer')");
  await P[0].click("button.tb:has-text('Signaler')"); await P[0].fill("textarea", "Test : l'option B de P1 est ambiguë"); await P[0].click("[role=dialog] button:has-text('Envoyer')"); await P[0].waitForSelector("text=Remarque enregistrée");
  await tour.waitForSelector("text=Signalements (1)", { timeout: 10000 }); ok((await tour.textContent("body")).includes("ambiguë") && (await tour.textContent("body")).includes("À APPROUVER"), "tour : signalement reçu, statut à approuver");
  await tour.click("button:has-text('Approuver')"); await tour.waitForSelector("text=APPROUVÉ"); ok(true, "tour : signalement approuvé");
  const avant = await tour.textContent("h2"); await tour.click("button:has-text('Suivante ▶')"); await tour.waitForFunction((a) => document.querySelector("h2") && document.querySelector("h2").textContent !== a, avant); ok(true, "tour : bouton Suivante change de question");
  await tour.click("button:has-text('◀ Précédente')"); await tour.waitForFunction((a) => document.querySelector("h2").textContent === a, avant); ok(true, "tour : bouton Précédente revient");
  await tour.click("button:has-text('Vue projetable')"); ok(!(await tour.textContent("body")).includes("Signalements"), "vue projetable : aucun signalement affiché"); await tour.click("button:has-text('Vue complète')");
  // Mode solo
  const solo = await mk("solo"); await solo.goto(ORI + "/index.html#/solo?q=F1"); await solo.waitForSelector("text=/Question [0-9]+ \\//", { timeout: 10000 }); ok(true, "mode solo démarré");
  await solo.waitForSelector("ol.ol"); await solo.click("text=Valider"); await solo.waitForSelector("text=À retenir"); ok(true, "mode solo : correction affichée");
  const ou = await mk("outils"); await ou.goto(ORI + "/index.html#/outils"); await ou.waitForSelector("text=Outils passifs");
  ok(await ou.$eval("option[value='melia.green']", (o) => o.disabled), "outils : melia.green verrouillé sans accord");
  await ou.selectOption("select", "example.com"); ok((await ou.$$("a:has-text('Ouvrir pour')")).length === 10, "outils : 10 liens avec example.com (actifs permis en démonstration)");
  await ou.check("input[type=checkbox]"); await ou.selectOption("select", "melia.green"); ok((await ou.$$("a:has-text('Ouvrir pour')")).length === 10, "outils : accord coché, melia.green analysable");
  await ou.uncheck("input[type=checkbox]"); ok((await ou.textContent("body")).includes("example.com (démonstration"), "outils : retour sur example.com sans accord");
  await ou.check("input[type=checkbox]"); await ou.selectOption("select", "melia.green"); ok((await ou.$$("a[href*='ssllabs']")).length === 1 && (await ou.$eval("a[href*='ssllabs']", (a) => a.href)).includes("hideResults=on"), "outils : SSL Labs avec résultats masqués");
  const au = await mk("audit"); await au.goto(ORI + "/index.html#/audit"); await au.click("button:has-text(\"Lancer l'audit\")"); await au.waitForSelector("text=Résultats de l'audit", { timeout: 8000 }); ok((await au.textContent("body")).includes("DMARC") && (await au.textContent("body")).includes("A+"), "audit : synthèse affichée");
  for (const t of ["E-mail", "DNS", "Site et connexion", "Plan"]) { await au.click("button[role=tab]:has-text('" + t + "')"); }
  ok((await au.textContent("body")).includes("Publier un DMARC"), "audit : onglets parcourus jusqu'au plan d'action");
  const lk = await mk("verrou"); await lk.goto(ORI + "/index.html#/audit"); await lk.waitForSelector("text=Relevé de l'audit verrouillé"); ok(!(await lk.textContent("body")).includes("DMARC"), "verrou : aucune donnée sans code");
  await lk.fill("input[aria-label='Code audit']", "AAAAA-AAAAA"); await lk.click("button:has-text('Déverrouiller')"); await lk.waitForSelector("text=Code incorrect"); ok(true, "verrou : mauvais code refusé");
  await lk.fill("input[aria-label='Code audit']", CODE); await lk.click("button:has-text('Déverrouiller')"); await lk.click("button:has-text(\"Lancer l'audit\")"); await lk.waitForSelector("button[role=tab]", { timeout: 8000 }); ok((await lk.textContent("body")).includes("DMARC"), "verrou : bon code, relevé affiché");
  await lk.click("button:has-text('Verrouiller')"); await lk.waitForSelector("text=Relevé de l'audit verrouillé"); ok(true, "verrou : bouton Verrouiller efface le relevé");
  const so = await mk("solo3"); await so.goto(ORI + "/index.html#/solo"); await so.waitForSelector("text=D'abord, lisez le relevé"); await so.click("button:has-text(\"Lancer l'audit\")"); await so.waitForSelector("text=Résultats de l'audit", { timeout: 8000 }); await so.click("button:has-text('Commencer les questions')"); await so.waitForSelector("text=Lire le SPF"); ok(true, "solo : relevé d'abord, puis AU1");
  await P[0].click("button:has-text('Fermer')").catch(() => {}); await P[0].click("button.tb:has-text('Audit')"); await P[0].click("[role=dialog] >> button:has-text(\"Lancer l'audit\")").catch(() => {}); await P[0].waitForSelector("[role=dialog] >> text=Relevé du 20/11/2026", { timeout: 8000 }); ok(true, "joueur : bouton Audit ouvre le relevé"); await P[0].click("button:has-text('Fermer')");
  const s2 = await mk("solo2"); await s2.goto(ORI + "/index.html#/solo?m=2"); await s2.waitForSelector("text=manche 2", { timeout: 8000 }); await s2.waitForSelector("text=Question 1 / 8"); ok(true, "solo manche 2 : 8 questions");
  ok(errs.length === 0, "aucune erreur JavaScript" + (errs.length ? " : " + errs.slice(0, 4).join(" | ") : ""));
  await br.close(); console.log(bad ? bad + " échec(s)" : "Tous les tests de bout en bout passent"); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log("ERREUR", e.message); process.exit(2); });
