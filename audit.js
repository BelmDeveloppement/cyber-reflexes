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
    } else {
      p.appendChild(el("div", { class: "cl" }, A.plan.map(function (a) { return el("div", { class: "st" }, [tag(a[3], a[0] + " · " + (a[3] === "bad" ? "Prioritaire" : a[3] === "warn" ? "Ensuite" : "Plus tard")), el("h3", {}, [a[1]]), el("p", {}, [a[2]])]); })));
      p.appendChild(el("div", { class: "lec" }, ["À valider avec le prestataire de messagerie de Mélia. Ces actions ne coûtent en général rien d'autre que du temps."]));
    }
    return p;
  }
  g.AuditView = function () {
    var A = g.AUDIT, root = el("div", { class: "audit" });
    if (!A) { root.appendChild(el("p", {}, ["Le relevé de l'audit n'est pas disponible dans cette version."])); return root; }
    root.appendChild(el("p", { class: "au-ban" }, ["Relevé du " + A.date + " pour " + A.domaine + ", réalisé avec l'accord de Mélia. Des réglages à améliorer, pas des fautes. Ne pas partager hors de la séance."]));
    var nav = el("div", { class: "aut-nav", role: "tablist" }), body = el("div");
    function show(id) { while (body.firstChild) body.removeChild(body.firstChild); body.appendChild(panel(id, A)); Array.prototype.forEach.call(nav.children, function (b) { b.setAttribute("aria-selected", b.getAttribute("data-t") === id ? "true" : "false"); }); }
    TAB.forEach(function (t) { var b = el("button", { role: "tab", "data-t": t[0], "aria-selected": "false" }, [t[1]]); b.onclick = function () { show(t[0]); }; nav.appendChild(b); });
    root.appendChild(nav); root.appendChild(body); root.appendChild(el("p", { class: "small" }, [A.sources])); show("syn"); return root;
  };
})(window);
