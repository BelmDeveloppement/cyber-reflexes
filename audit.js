/* © 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés. Relevé d'audit : panneau à onglets (lecture seule). */
(function (g) {
  var TAB = [["syn", "Synthèse"], ["mail", "E-mail"], ["dns", "DNS"], ["site", "Site et connexion"], ["plan", "Plan d'action"]];
  var LAB = { ok: "✓ Conforme", warn: "▲ À confirmer", bad: "✗ Manque" };
  function el(t, a, kids) { var e = document.createElement(t); if (a) Object.keys(a).forEach(function (k) { if (k === "class") e.className = a[k]; else e.setAttribute(k, a[k]); }); (kids || []).forEach(function (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }
  function tag(k, t) { return el("span", { class: "tg " + k }, [t || LAB[k]]); }
  function table(head, rows) { var t = el("table", { class: "aut" }); t.appendChild(el("thead", {}, [el("tr", {}, head.map(function (x) { return el("th", {}, [x]); }))])); var b = el("tbody"); rows.forEach(function (r) { b.appendChild(el("tr", {}, r.map(function (c, i) { return el("td", { "data-l": head[i] || "" }, [typeof c === "string" ? c : c]); }))); }); t.appendChild(b); return el("div", { class: "tw" }, [t]); }
  function stat(n, l, k) { return el("div", { class: "st" }, [el("div", { class: "n " + (k || "") }, [String(n)]), el("div", { class: "l" }, [l])]); }
  function code(t) { return el("code", {}, [t]); }
  function panel(id, A) {
    var p = el("div", { class: "aup" });
    if (id === "syn") {
      var c = { ok: 0, warn: 0, bad: 0 }; A.syn.forEach(function (r) { c[r[1]]++; });
      p.appendChild(el("div", { class: "stats" }, [stat(c.ok, "conformes", "ok"), stat(c.warn, "à confirmer", "warn"), stat(c.bad, "manque important", "bad"), stat("A+ / F", "SSL Labs / en-têtes")]));
      p.appendChild(table(["Contrôle", "État", "Constat"], A.syn.map(function (r) { return [el("b", {}, [r[0]]), tag(r[1]), r[2]]; })));
      p.appendChild(el("div", { class: "lec" }, [el("b", {}, ["Lecture en une phrase : "]), A.phrase]));
    } else if (id === "mail") {
      p.appendChild(el("div", { class: "cl" }, A.mail.map(function (m) { var k = [tag(m[1], (m[1] === "ok" ? "✓ " : m[1] === "warn" ? "▲ " : "✗ ") + m[2]), el("h3", {}, [m[0]]), el("p", {}, [m[3]])]; if (m[4]) k.push(code(m[4])); return el("div", { class: "st" }, k); })));
      p.appendChild(el("div", { class: "lec" }, [el("b", {}, ["Pourquoi c'est parlant : "]), el("ul", {}, A.mailPourquoi.map(function (x) { return el("li", {}, [x]); }))]));
    } else if (id === "dns") {
      p.appendChild(table(["Nom", "Type", "Valeur", "Lecture"], A.dns.map(function (r) { return [code(r[0]), r[1], code(r[2]), r[3]]; })));
    } else if (id === "site") {
      p.appendChild(el("h3", {}, ["Connexion chiffrée (SSL Labs)"])); p.appendChild(table(["Point", "Constat"], A.ssl.map(function (r) { return [el("b", {}, [r[0]]), r[1]]; })));
      p.appendChild(el("h3", {}, ["En-têtes du site (MDN Observatory)"])); p.appendChild(table(["Test", "État", "Constat"], A.obs.map(function (r) { return [el("b", {}, [r[1]]), tag(r[0], r[0] === "ok" ? "✓ Réussi" : "▲ À améliorer"), r[2]]; })));
      p.appendChild(el("div", { class: "lec" }, [A.obsNote]));
    } else if (id === "osyn") {
      var O0 = A.osint, cc = { ok: 0, warn: 0 }, dataTabs = O0.tabs.filter(function (x) { return x.id !== "ou"; });
      dataTabs.forEach(function (t) { t.rows.forEach(function (r) { var s = r[2] || ""; if (/^✓/.test(s)) cc.ok++; else if (/^▲/.test(s)) cc.warn++; }); });
      p.appendChild(el("p", { class: "au-ban" }, [O0.intro]));
      p.appendChild(el("div", { class: "stats" }, [stat(cc.ok, "relevé(s)", "ok"), stat(cc.warn, "à surveiller", "warn"), stat(cc.ok + cc.warn, "informations repérées"), stat(dataTabs.length, "sources publiques explorées")]));
      p.appendChild(table(["Thème", "✓ Relevé", "▲ À surveiller"], dataTabs.map(function (t) { var n = { ok: 0, warn: 0 }; t.rows.forEach(function (r) { if (/^✓/.test(r[2] || "")) n.ok++; else if (/^▲/.test(r[2] || "")) n.warn++; }); return [el("b", {}, [t.label]), String(n.ok), String(n.warn)]; })));
      p.appendChild(el("div", { class: "lec" }, [el("b", {}, ["Lecture en une phrase : "]), cc.ok + cc.warn + " informations publiques repérées sur " + A.domaine + ", dont " + cc.ok + " déjà bien maîtrisées et " + cc.warn + " à surveiller de plus près — voir le détail par thème ci-contre, et « Plan d'action » pour ce qu'un attaquant en ferait."]));
      p.appendChild(el("p", { class: "small" }, [O0.sources]));
    } else if (/^o[a-z]$/.test(id) && id !== "oplan") {
      var O = A.osint, tb = O.tabs.filter(function (x) { return x.id === id; })[0];
      var n2 = { ok: 0, warn: 0 }; tb.rows.forEach(function (r) { if (/^✓/.test(r[2] || "")) n2.ok++; else if (/^▲/.test(r[2] || "")) n2.warn++; });
      p.appendChild(el("p", { class: "au-ban" }, [O.intro]));
      p.appendChild(el("div", { class: "stats" }, [stat(n2.ok, "relevé(s)", "ok"), stat(n2.warn, "à surveiller", "warn"), stat(n2.ok + n2.warn, "au total")]));
      p.appendChild(table(tb.head, tb.rows.map(function (r) { return r.map(function (c, i) { return i === 2 && /^[✓▲]/.test(c) ? tag(c.charAt(0) === "✓" ? "ok" : "warn", c) : i === 0 ? el("b", {}, [c]) : c; }); })));
      p.appendChild(el("div", { class: "lec" }, [el("b", {}, ["Lecture en une phrase : "]), n2.ok + n2.warn + " information(s) publique(s) repérée(s) dans « " + tb.label + " », dont " + n2.warn + " à surveiller de plus près."]));
      p.appendChild(el("div", { class: "lec" }, [O.masque])); p.appendChild(el("p", { class: "small" }, [O.sources]));
    } else if (id === "oplan") {
      var O2 = A.osint, ou = O2.tabs.filter(function (x) { return x.id === "ou"; })[0];
      p.appendChild(el("p", { class: "au-ban" }, [O2.intro]));
      p.appendChild(el("div", { class: "cl" }, ou.rows.map(function (r) { return el("div", { class: "st" }, [tag("warn", "Scénario d'attaquant"), el("h3", {}, [r[0]]), el("p", {}, [el("b", {}, ["Informations utilisées : "]), r[1]]), el("p", {}, [el("b", {}, ["Parade : "]), r[2]]), el("p", {}, [el("b", {}, ["Exercice : "]), r[3]])]); })));
      p.appendChild(el("div", { class: "lec" }, [el("b", {}, ["Publier moins : "]), el("ul", {}, O2.parades.map(function (x) { return el("li", {}, [x]); }))]));
      p.appendChild(el("div", { class: "lec" }, [O2.masque])); p.appendChild(el("p", { class: "small" }, [O2.sources]));
    } else {
      p.appendChild(el("div", { class: "cl" }, A.plan.map(function (a) { return el("div", { class: "st" }, [tag(a[3], a[0] + " · " + (a[3] === "bad" ? "Prioritaire" : a[3] === "warn" ? "Ensuite" : "Plus tard")), el("h3", {}, [a[1]]), el("p", {}, [a[2]])]); })));
      p.appendChild(el("div", { class: "lec" }, ["À valider avec le prestataire de messagerie de Mélia. Ces actions ne coûtent en général rien d'autre que du temps."]));
    }
    return p;
  }
  g.AuditView = function (start) {
    var A = g.AUDIT, root = el("div", { class: "audit" });
    if (!A) { root.appendChild(el("p", {}, ["Le relevé de l'audit n'est pas disponible dans cette version."])); return root; }
    var isOs = !!(A.osint && start && /^o(syn|plan|[a-z])$/.test(start));
    root.appendChild(el("p", { class: "au-ban" }, [isOs ? "Repérage public du " + A.osint.date + " pour " + A.domaine + ", réalisé avec l'accord de Mélia. Des informations déjà publiques, pas des failles. Ne pas partager hors de la séance." : "Relevé du " + A.date + " pour " + A.domaine + ", réalisé avec l'accord de Mélia. Des réglages à améliorer, pas des fautes. Ne pas partager hors de la séance."]));
    var nav = el("div", { class: "aut-nav", role: "tablist" }), body = el("div");
    function show(id) { while (body.firstChild) body.removeChild(body.firstChild); body.appendChild(panel(id, A)); Array.prototype.forEach.call(nav.children, function (b) { b.setAttribute("aria-selected", b.getAttribute("data-t") === id ? "true" : "false"); }); }
    var TABS = isOs ? [["osyn", "Synthèse"]].concat(A.osint.tabs.filter(function (x) { return x.id !== "ou"; }).map(function (x) { return [x.id, x.label]; })).concat([["oplan", "Plan d'action"]]) : TAB;
    TABS.forEach(function (t) { var b = el("button", { role: "tab", "data-t": t[0], "aria-selected": "false" }, [t[1]]); b.onclick = function () { show(t[0]); }; nav.appendChild(b); });
    root.appendChild(nav); root.appendChild(body); root.appendChild(el("p", { class: "small" }, [A.sources])); show((start === "oi" ? "osyn" : start) || "syn"); return root;
  };
})(window);
