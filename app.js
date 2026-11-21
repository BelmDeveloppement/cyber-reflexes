// © 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés. Créé avec l'aide de Claude (Anthropic), relu par l'auteur.
// Jeu 23 · « Réflexes » : écran joueur, mode solo et tour de contrôle. Bus du relais Cloudflare (principal), ntfy (secours des diapositives seulement).
(function () {
  "use strict";
  var C = window.CR, E = window.CRE, KEYS = null;
  var root = document.getElementById("app");
  function h(tag, attrs) { var e = document.createElement(tag); attrs = attrs || {}; Object.keys(attrs).forEach(function (k) { if (k === "class") e.className = attrs[k]; else if (k === "html") e.innerHTML = attrs[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]); }); for (var i = 2; i < arguments.length; i++) kid(e, arguments[i]); return e; }
  function kid(e, c) { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(function (x) { kid(e, x); }); else e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function task(id) { for (var i = 0; i < C.tasks.length; i++) if (C.tasks[i].id === id) return C.tasks[i]; return null; }
  function sidFrom(q) { var m = /[?&]s=([A-Za-z0-9]{6,12})/.exec(location.hash + location.search); return (m ? m[1] : q || C.sid).toUpperCase(); }
  function topic(sid, s) { return C.prefixe + sid + s; }
  function relayBase() { var m = /[?&]relay=([^&]+)/.exec(location.hash + location.search); return m ? decodeURIComponent(m[1]) : C.relais; }
  function loadKeys() { function mix(K) { var P = window.CR_PACK_KEYS; if (P) Object.keys(P).forEach(function (k) { K[k] = P[k]; }); return K; } if (window.CR_KEYS) return Promise.resolve(mix(window.CR_KEYS)); return new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = "corriges.js"; s.onload = function () { ok(mix(window.CR_KEYS)); }; s.onerror = ko; document.head.appendChild(s); }); }
  // ───────── Relevé de l'audit : paquet chiffré (AES-GCM), déverrouillé par un code donné à l'oral. Contenu gardé en mémoire seulement.
  function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function unlockPack(code) {
    var norm = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error("nocrypto"));
    return fetch("audit-melia.enc.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("fetch"); return r.json(); }).then(function (p) {
      return crypto.subtle.importKey("raw", new TextEncoder().encode(norm), "PBKDF2", false, ["deriveKey"]).then(function (km) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(p.salt), iterations: p.it, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      }).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(p.iv) }, k, b64(p.ct)); });
    }).then(function (buf) {
      var d = JSON.parse(new TextDecoder().decode(buf));
      if (!task("AU1")) { [["F1", /^AU/], ["P1", /^OS/]].forEach(function (z) { var at = -1; C.tasks.forEach(function (t, i) { if (at < 0 && t.id === z[0]) at = i; }); var args = [at < 0 ? C.tasks.length : at, 0].concat(d.tasks.filter(function (t) { return z[1].test(t.id); })); Array.prototype.splice.apply(C.tasks, args); }); }
      window.CR_PACK_KEYS = d.keys; if (window.CR_KEYS) Object.keys(d.keys).forEach(function (k) { window.CR_KEYS[k] = d.keys[k]; });
      window.AUDIT = d.audit; return true;
    });
  }
  function lockPack() { try { sessionStorage.removeItem("cr_ac"); } catch (e) {} location.reload(); }
  function unlockCard(why) {
    var inp = h("input", { type: "text", placeholder: "XXXXX-XXXXX", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", "aria-label": "Code audit" }), msg = h("p", { class: "small", role: "status" }), b = h("button", { class: "pri" }, "Déverrouiller l'audit");
    function go() { msg.textContent = "Vérification…"; unlockPack(inp.value).then(function () { try { sessionStorage.setItem("cr_ac", inp.value.trim()); } catch (e) {} location.reload(); }, function (e) { msg.textContent = e && e.message === "nocrypto" ? "Ce navigateur ne permet pas le déchiffrement (il faut une page https)." : "Code incorrect ou relevé indisponible. Redemandez le code à l'animateur."; }); }
    b.onclick = go; inp.onkeydown = function (e) { if (e.key === "Enter") go(); };
    return h("div", { class: "card" }, h("h3", {}, "🔒 Relevé de l'audit verrouillé"), h("p", {}, why || "Le relevé de l'audit de melia.green n'est pas public. L'animateur donne le code à l'oral ou dans le chat Teams, au moment de l'audit."), h("p", {}, inp, " ", b), msg);
  }
  function lockBtn() { return h("button", { class: "tb", onclick: lockPack }, "Verrouiller"); }

  // ───────── Bus : WebSocket du relais, une salle par séance
  function Bus(sid, onStatus) {
    var me = this; me.sid = sid; me.subs = {}; me.since = {}; me.pend = {}; me.queue = []; me.ws = null; me.st = "coupée"; me.last = 0; me.retry = 0; me.onStatus = onStatus || function () {}; me.dead = false;
    me.connect = function () {
      if (me.dead) return;
      var ws; try { ws = new WebSocket(relayBase() + "/ps?room=" + me.sid); } catch (e) { return me.sched(); }
      me.ws = ws;
      ws.onopen = function () { me.retry = 0; me.st = "relais"; me.last = Date.now(); Object.keys(me.subs).forEach(function (t) { ws.send(JSON.stringify({ a: "sub", t: t, since: me.since[t] || 0 })); }); var q = me.queue; me.queue = []; q.forEach(function (x) { ws.send(JSON.stringify(x)); }); me.onStatus(); me.hb = setInterval(function () { try { ws.send("ping"); } catch (e) {} if (Date.now() - me.last > 60000) { try { ws.close(); } catch (e) {} } }, 25000); };
      ws.onmessage = function (ev) { me.last = Date.now(); if (ev.data === "pong") return; var o; try { o = JSON.parse(ev.data); } catch (e) { return; } if (o.a === "msg") { if (o.id > (me.since[o.t] || 0)) me.since[o.t] = o.id; (me.subs[o.t] || []).forEach(function (f) { f(o); }); } else if (o.a === "ack" && me.pend[o.u]) { me.pend[o.u](o.n); delete me.pend[o.u]; } };
      ws.onclose = ws.onerror = function () { clearInterval(me.hb); if (me.ws === ws) { me.st = "coupée"; me.onStatus(); me.sched(); } };
    };
    me.sched = function () { if (me.dead) return; me.retry++; setTimeout(me.connect, Math.min(15000, 800 * me.retry)); };
    me.sub = function (t, cb, since) { (me.subs[t] = me.subs[t] || []).push(cb); if (since != null) me.since[t] = since; if (me.ws && me.ws.readyState === 1) me.ws.send(JSON.stringify({ a: "sub", t: t, since: me.since[t] || 0 })); };
    me.pub = function (t, obj) { var u = uid(), pkt = { a: "pub", t: t, m: JSON.stringify(obj), u: u }; return new Promise(function (ok) { me.pend[u] = ok; if (me.ws && me.ws.readyState === 1) me.ws.send(JSON.stringify(pkt)); else me.queue.push(pkt); }); };
    me.resync = function () { Object.keys(me.subs).forEach(function (t) { me.since[t] = 0; }); try { me.ws.close(); } catch (e) { me.connect(); } };
    me.close = function () { me.dead = true; clearInterval(me.hb); try { me.ws.close(); } catch (e) {} };
    me.age = function () { return me.last ? Math.round((Date.now() - me.last) / 1000) : null; };
    me.connect();
  }
  function syncBadge(bus, extra) { var st = bus.st, age = bus.age(); var cls = st === "relais" ? "sync" : "sync off"; var txt = st === "relais" ? "● Relais OK" : "▲ Liaison coupée"; if (extra) txt += " · " + extra; return h("span", { class: cls, title: age == null ? "" : "dernier signal il y a " + age + " s" }, txt + (age != null ? " (" + age + " s)" : "")); }

  // ───────── Saisies guidées : un composant par type, avec mélange propre à chaque joueur
  function opts(t, seed, list) { return E.shuffle(list, seed + ":" + t.id); }
  function Input(t, seed, onChange, init) {
    var val = init == null ? null : init, box = h("div");
    function emit() { onChange(val); }
    if (t.type === "single") {
      val = init || null; opts(t, seed, t.options).forEach(function (o) { var b = h("button", { class: "opt" + (val === o.id ? " sel" : ""), onclick: function () { val = o.id; box.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); emit(); } }, o.t); box.appendChild(b); });
    } else if (t.type === "multi") {
      val = Array.isArray(init) ? init.slice() : []; var btns = [];
      var refresh = function () { btns.forEach(function (x) { var on = val.indexOf(x.o.id) >= 0; x.b.classList.toggle("sel", on); x.b.disabled = !on && val.length >= t.max; }); cnt.textContent = val.length + " / " + t.max + " cochée(s)"; };
      var cnt = h("p", { class: "small" });
      opts(t, seed, t.options).forEach(function (o) { var b = h("button", { class: "opt", onclick: function () { var i = val.indexOf(o.id); if (i >= 0) val.splice(i, 1); else if (val.length < t.max) val.push(o.id); refresh(); emit(); } }, o.t); btns.push({ o: o, b: b }); box.appendChild(b); });
      box.appendChild(cnt); refresh();
    } else if (t.type === "order") {
      var ord = Array.isArray(init) && init.length === t.options.length ? init.slice() : opts(t, seed, t.options).map(function (o) { return o.id; }); val = ord;
      var txt = {}; t.options.forEach(function (o) { txt[o.id] = o.t; });
      var ul = h("ol", { class: "ol" }); box.appendChild(ul); box.appendChild(h("p", { class: "small" }, "Utilisez ▲ et ▼ pour remettre dans l'ordre (la première action en haut)."));
      var draw = function () { clear(ul); ord.forEach(function (id, i) { ul.appendChild(h("li", {}, h("span", {}, txt[id]), h("button", { "aria-label": "Monter", disabled: i === 0, onclick: function () { var x = ord[i]; ord[i] = ord[i - 1]; ord[i - 1] = x; draw(); emit(); } }, "▲"), h("button", { "aria-label": "Descendre", disabled: i === ord.length - 1, onclick: function () { var x = ord[i]; ord[i] = ord[i + 1]; ord[i + 1] = x; draw(); emit(); } }, "▼"))); }); }; draw(); setTimeout(emit, 0);
    } else if (t.type === "form") {
      val = init && typeof init === "object" ? Object.assign({}, init) : {};
      t.champs.forEach(function (f) {
        var fo = E.shuffle(f.o, seed + ":" + t.id + ":" + f.id), wrap = h("div", { class: "card" }), lab = h("h3", {}, f.l); wrap.appendChild(lab);
        if (f.o.length <= 4) { var g = h("div", { class: "grp" }); fo.forEach(function (o) { var b = h("button", { class: val[f.id] === o.id ? "sel" : "", onclick: function () { val[f.id] = o.id; g.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); emit(); } }, o.t); g.appendChild(b); }); wrap.appendChild(g); }
        else { var s = h("select", { "aria-label": f.l, onchange: function () { if (s.value) val[f.id] = s.value; else delete val[f.id]; emit(); } }, h("option", { value: "" }, "Choisir…")); fo.forEach(function (o) { s.appendChild(h("option", { value: o.id }, o.t)); }); if (val[f.id]) s.value = val[f.id]; wrap.appendChild(s); }
        box.appendChild(wrap);
      });
    } else if (t.type === "cloud") {
      val = Array.isArray(init) ? init.slice() : []; var ins = [];
      for (var i = 0; i < t.max; i++) (function (i) { var inp = h("input", { type: "text", maxlength: "30", placeholder: "Mot " + (i + 1), "aria-label": "Mot " + (i + 1), value: val[i] || "" }); inp.addEventListener("input", function () { val = ins.map(function (x) { return x.value.trim(); }).filter(Boolean); emit(); }); ins.push(inp); box.appendChild(h("p", {}, inp)); })(i);
    }
    return { el: box, get: function () { return val; }, valid: function () { if (t.type === "single") return !!val; if (t.type === "multi") return val.length > 0; if (t.type === "order") return true; if (t.type === "cloud") return val.length > 0; if (t.type === "form") return t.champs.every(function (f) { return val[f.id]; }); return false; } };
  }


  // ───────── Faux clients de messagerie (e-mail, SMS, Teams, courrier) : l'adresse réelle apparaît au survol ou à l'appui
  function parseDe(de) { var m = /^(.*?)\s*<([^>]+)>\s*$/.exec(de || ""); return m ? { nom: m[1], adr: m[2] } : { nom: de || "", adr: "" }; }
  function Mail(c, rec) {
    rec = rec || function () {};
    var st = h("div", { class: "mstatus", "aria-live": "polite" }, "Survolez ou appuyez sur un élément pour voir son adresse réelle."), root2 = h("div", { class: "mailwrap" });
    function show(txt, kind) { st.textContent = txt; st.classList.add("on"); rec(kind); }
    function inspectable(el, txt, kind) { el.addEventListener("mouseenter", function () { show(txt, kind); }); el.addEventListener("focus", function () { show(txt, kind); }); el.addEventListener("click", function (e) { e.preventDefault(); show(txt, kind); }); return el; }
    var p = parseDe(c.de), canal = c.canal || "", body;
    function linkBtn(l, cls) { var a = h("a", { href: "#", class: cls || "mlink", role: "button", tabindex: "0" }, l.texte); inspectable(a, "Adresse réelle du lien : " + l.url + "  (rien ne s'ouvre dans le jeu)", "lien"); return a; }
    if (canal === "SMS") {
      body = h("div", { class: "sms" }, h("div", { class: "smshead" }, h("span", { class: "av" }, "?"), h("b", {}, p.nom)), h("div", { class: "bubble" }, c.corps, c.lien ? h("div", {}, linkBtn(c.lien, "mlink u")) : null), h("div", { class: "small" }, "Message reçu · aujourd'hui"));
    } else if (canal.indexOf("Teams") >= 0) {
      var tb = h("button", { class: "tsender", type: "button" }, p.nom); inspectable(tb, "Organisateur : " + p.nom + " · le lien d'une invitation Teams se lit comme tout autre lien", "exp");
      body = h("div", { class: "teams" }, h("div", { class: "thead" }, "Microsoft Teams · Calendrier"), h("div", { class: "tbody" }, h("h3", {}, c.objet), h("p", { class: "small" }, "Organisateur : "), tb, h("p", {}, c.corps), c.lien ? linkBtn(c.lien, "mlink btn") : null));
    } else if (canal.indexOf("papier") >= 0) {
      var q = h("div", { class: "qrfake", role: "button", tabindex: "0", "aria-label": "QR code (simulé)" }); for (var i = 0; i < 49; i++) q.appendChild(h("i", { class: ((i * 7 + (i >> 2)) % 3 === 0 || i % 8 === 0) ? "k" : "" }));
      inspectable(q, "Un lecteur de QR code affiche l'adresse avant d'ouvrir : ici, " + (c.lien ? c.lien.url : "adresse cachée"), "lien");
      body = h("div", { class: "papier" }, h("div", { class: "small" }, c.de), h("h3", {}, c.objet), h("p", {}, c.corps), q, h("div", { class: "small" }, "Appuyez sur le QR code pour simuler le scan."));
    } else {
      var nameBtn = h("button", { class: "msender", type: "button" }, p.nom || c.de), pop = h("div", { class: "mpop" }, p.adr ? "Adresse réelle : " + p.adr : "Aucune adresse affichée");
      inspectable(nameBtn, p.adr ? "Adresse réelle de l'expéditeur : " + p.adr : "Expéditeur sans adresse affichée", "exp");
      var addr = h("span", { class: "mshort" }, p.adr ? "<" + p.adr + ">" : "");
      var tools = h("div", { class: "mtools" }, ["Répondre", "Supprimer", "Signaler"].map(function (b) { return h("button", { type: "button", class: "mt", onclick: function () { show("« " + b + " » : fonction simulée. Vous choisirez votre réaction dans les questions ci-dessous.", "act"); } }, b); }));
      var att = c.pj ? h("button", { type: "button", class: "matt" }, "Pièce jointe : " + c.pj) : null; if (att) inspectable(att, "Pièce jointe « " + c.pj + " » : jamais ouverte dans le jeu. En vrai, le nom ne prouve pas le contenu.", "pj");
      body = h("div", { class: "mail" }, tools, h("div", { class: "mhead" }, h("span", { class: "av" }, (p.nom || "?").charAt(0).toUpperCase()), h("div", {}, h("div", {}, nameBtn, " ", addr), h("div", { class: "small" }, "À : moi · aujourd'hui"))), h("h3", { class: "msubj" }, c.objet), h("p", { class: "mbody" }, c.corps), c.lien ? h("div", {}, linkBtn(c.lien, "mlink btn")) : null, att);
      addr.style.display = "none";
      nameBtn.addEventListener("mouseenter", function () { addr.style.display = "inline"; }); nameBtn.addEventListener("click", function () { addr.style.display = "inline"; });
    }
    root2.appendChild(h("div", { class: "mchan" }, canal)); root2.appendChild(body); root2.appendChild(st);
    return root2;
  }

  function Enonce(t, rec) {
    var d = h("div", { class: "card" });
    if (t.jeu) d.appendChild(h("p", { class: "small" }, "Scène " + t.id.slice(1) + " / 8 · " + t.heure + " · " + t.titre));
    else d.appendChild(h("p", { class: "small" }, (C.blocs[t.bloc] || "") + " · " + t.titre));
    d.appendChild(h("div", { class: "but" }, h("b", {}, "But de l'exercice : "), t.but));
    if (t.carte) d.appendChild(Mail(t.carte, rec));
    d.appendChild(h("p", {}, t.enonce));
    if (t.liens) { var lw = h("div", { class: "mailwrap" }), ls = h("div", { class: "mstatus" }, "Survolez ou appuyez sur un lien pour voir son adresse réelle."); t.liens.forEach(function (l, i) { var a = h("a", { href: "#", class: "mlink", role: "button", tabindex: "0" }, l.texte); function sh(e) { if (e) e.preventDefault(); ls.textContent = "Lien " + "ABCDE"[i] + " : " + l.url; ls.classList.add("on"); if (rec) rec("lien" + i); } a.addEventListener("mouseenter", sh); a.addEventListener("focus", sh); a.addEventListener("click", sh); lw.appendChild(h("p", {}, h("b", {}, "Lien " + "ABCDE"[i] + " : "), a)); }); lw.appendChild(ls); d.appendChild(lw); }
    return d;
  }

  // ───────── Correction détaillée (même rendu pour le joueur, la tour et le mode solo)
  function optLabel(t, id) { var o = (t.options || []).filter(function (x) { return x.id === id; })[0]; return o ? o.t : id; }
  function fieldOpt(f, id) { var o = f.o.filter(function (x) { return x.id === id; })[0]; return o ? o.t : "—"; }
  function Correction(t, k, ans, noScore) {
    var box = h("div"), pts = E.score(t, k, ans);
    if (pts !== null && !noScore) box.appendChild(h("div", { class: "card " + (pts >= 2 ? "good" : "bad") }, h("div", { class: "pts" }, (pts >= 2 ? "✓ " : "✗ ") + pts + " / 3 points"), pts >= 2 ? "Bien joué." : "À retenir : lisez la correction ci-dessous."));
    function row(good, mine, label, why) { return h("div", { class: "row " + (good ? "good" : mine ? "bad" : "neu") }, h("b", {}, (good ? "✓ " : mine ? "✗ " : "○ ") + label), mine ? h("span", {}, "  ◀ votre choix") : null, why ? h("div", { class: "small" }, why) : null); }
    if (!t.sondage && t.type === "single") (t.options).forEach(function (o) { box.appendChild(row(o.id === k.best, ans === o.id, o.t + (k.ok && k.ok.indexOf(o.id) >= 0 ? " (partiellement acceptable, 1 point)" : ""), k.why[o.id])); });
    if (!t.sondage && t.type === "multi") (t.options).forEach(function (o) { box.appendChild(row(k.good.indexOf(o.id) >= 0, Array.isArray(ans) && ans.indexOf(o.id) >= 0, o.t, k.why[o.id])); });
    if (!t.sondage && t.type === "order") { box.appendChild(h("h3", {}, "Ordre attendu")); k.order.forEach(function (id, i) { box.appendChild(h("div", { class: "row good" }, h("b", {}, (i + 1) + ". " + optLabel(t, id)), h("div", { class: "small" }, k.why[id]))); }); if (Array.isArray(ans)) box.appendChild(h("p", { class: "small" }, "Votre ordre : " + ans.map(function (id) { return optLabel(t, id); }).join(" → "))); }
    if (t.type === "form" && k.ans) t.champs.forEach(function (f) { var ok = ans && ans[f.id] === k.ans[f.id]; box.appendChild(h("div", { class: "row " + (ok ? "good" : "bad") }, h("b", {}, (ok ? "✓ " : "✗ ") + f.l), h("div", {}, "Réponse attendue : " + fieldOpt(f, k.ans[f.id]) + (ok ? "" : " · la vôtre : " + (ans && ans[f.id] ? fieldOpt(f, ans[f.id]) : "—"))), h("div", { class: "small" }, k.why[f.id]))); });
    if (t.liens) { box.appendChild(h("h3", {}, "Adresses réelles")); t.liens.forEach(function (l, i) { box.appendChild(h("p", { class: "small" }, "Lien " + "ABCDE"[i] + " : ", h("span", { class: "url" }, l.url))); }); }
    box.appendChild(h("div", { class: "card" }, h("h3", {}, "À retenir"), h("p", {}, k.expl), k.src && k.src.length ? h("p", { class: "small" }, "Source : ", k.src.map(function (s, i) { return [i ? " · " : "", s.u ? h("a", { href: s.u, target: "_blank", rel: "noopener" }, s.t) : s.t]; })) : null));
    return box;
  }
  function euro(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") + "\u00a0€"; }
  var MENTION = "Estimation pédagogique. Les aides dépendent de l'éligibilité et des conditions en vigueur.";
  function Compte(acc, titre) { acc = acc || { rg: 0, ai: 0, total: 0 }; var box = h("div", { class: "card compte" }, h("h3", {}, titre || "Compte de l'équipe"));
    [["Ressources et gestes", acc.rg], ["Aides identifiées", acc.ai]].forEach(function (r) { box.appendChild(h("div", { class: "jauge" }, h("span", { style: "flex:1" }, r[0]), h("b", {}, euro(r[1])))); });
    box.appendChild(h("div", { class: "jauge" }, h("span", { style: "flex:1" }, h("b", {}, "Total")), h("b", {}, euro(acc.total)))); box.appendChild(h("p", { class: "small" }, MENTION)); return box; }
  function Jauges(j, small) { var box = h("div"); C.jauges.forEach(function (g) { var v = j ? j[g.id] : 10; box.appendChild(h("div", { class: "jauge " + (v <= 3 ? "low" : v <= 6 ? "mid" : "") }, h("span", { class: "dot" }, g.s), h("span", { style: "min-width:6.5em" }, g.n), h("div", { class: "bar2" }, h("i", { style: "width:" + Math.max(0, v) * 10 + "%" })), h("b", {}, v + "/10"))); }); return box; }
  function Classement(teams, mine) { var rows = (teams || []).slice().sort(function (a, b) { return b.pts - a.pts; }); var tb = h("table", {}, h("tr", {}, h("th", {}, "Équipe"), h("th", {}, "Points"), h("th", {}, "Membres"))); rows.forEach(function (t) { var eq = C.equipes.filter(function (x) { return x.id === t.id; })[0]; tb.appendChild(h("tr", {}, h("td", {}, eq.s + " " + eq.n + (mine === t.id ? " (la vôtre)" : "")), h("td", {}, t.pts.toFixed(1)), h("td", {}, t.n))); }); return tb; }

  // ───────── Joueur

  var CODES = { R: "Reconnaître", A: "Accéder", P: "Protéger", I: "Incident", V: "Vérifier", C: "Cadre" };
  function reglesBody() { return h("div", {}, h("h1", {}, "Lundi chez Granuval"), h("p", {}, "Vous êtes les salariés de Granuval, une entreprise fictive de granulés. Chaque équipe protège sa propre entreprise pendant une journée de 8 scènes (07 h 42 à 16 h 40)."), h("div", { class: "card" }, h("h3", {}, "Déroulement d'une scène"), h("ol", {}, h("li", {}, "L'animateur ouvre la scène : elle s'affiche sur votre écran (PC de préférence ; le téléphone sert de secours)."), h("li", {}, "Vous répondez seul(e) : boutons, listes ou remise en ordre. Vous pouvez modifier avant la correction."), h("li", {}, "L'animateur révèle la correction : vous voyez vos points (0 à 3) et l'explication de chaque réponse."), h("li", {}, "La moyenne de votre équipe fait varier 4 jauges : ● Argent, ▲ Production, ■ Données, ◆ Confiance."))), h("div", { class: "card" }, h("h3", {}, "Points et jauges"), h("p", {}, "Moyenne d'équipe de 2,4 ou plus : aucune perte. De 1,5 à 2,4 : −1 sur la jauge principale. Moins de 1,5 : −2 sur la jauge principale et −1 sur la seconde. Les équipes sont classées par points cumulés."), h("p", {}, "Tous les joueurs sont égaux : pas de rôle particulier dans l'équipe.")), h("div", { class: "card" }, h("h3", {}, "Règles d'or"), h("ul", {}, h("li", {}, "Ne saisissez jamais un vrai mot de passe, une vraie adresse ou une donnée réelle dans cette application."), h("li", {}, "Si l'application se fige, rechargez la page : vos réponses sont conservées.")))); }
  // Retour du navigateur = question précédente dans la partie (jamais une sortie) ; « Quitter le jeu » demande confirmation.
  var quitting = false;
  function guard(onBack, warn) {
    var hash0 = location.hash; try { history.pushState({ cr: 1 }, "", location.href); } catch (e) {}
    window.addEventListener("popstate", function () { if (location.hash !== hash0 || quitting) return; try { onBack(); } catch (e) {} try { history.pushState({ cr: 1 }, "", location.href); } catch (e) {} });
    if (warn) window.addEventListener("beforeunload", function (e) { if (quitting) return; e.preventDefault(); e.returnValue = ""; });
  }
  function quitBtn() {
    return h("button", { class: "tb", onclick: function () { var close; close = modal("Quitter le jeu ?", h("div", {}, h("p", {}, "Voulez-vous vraiment quitter le jeu ? La partie reste enregistrée dans ce navigateur : vous pourrez la retrouver en rouvrant la même adresse."), h("p", {}, h("button", { class: "pri", onclick: function () { close(); } }, "Rester dans le jeu"), " ", h("button", { onclick: function () { quitting = true; location.hash = "#/"; } }, "Quitter le jeu")))); } }, "Quitter le jeu");
  }
  function oops(host, retry, next) {
    clear(host); host.appendChild(h("div", { class: "card bad", role: "alert" }, h("h3", {}, "Cette question n'a pas pu s'afficher"), h("p", {}, "Le jeu continue. Essayez de nouveau, ou passez à la suite."), h("p", {}, h("button", { class: "pri", onclick: retry }, "Réessayer"), " ", next ? h("button", { onclick: next }, "Question suivante") : null)));
  }
  function teamsOf(S) { return C.equipes.map(function (e) { var mem = Object.keys(S.pl).filter(function (p) { return S.pl[p].tm === e.id; }), pts = 0, j = { a: 10, p: 10, d: 10, c: 10 }; Object.keys(S.res).forEach(function (tid) { var r = S.res[tid], t = task(tid); if (r.team && r.team[e.id] != null) { pts += r.team[e.id]; if (t.jeu) { var ef = E.effet(r.team[e.id], t.jauges); Object.keys(ef).forEach(function (g) { j[g] = Math.max(0, j[g] + ef[g]); }); } } }); var cp = CRE.compte(BAREME, S.res, S.ans, S.pl, e.id); return { id: e.id, pts: Math.round(pts * 10) / 10, n: mem.length, j: j, acc: { rg: cp.tot.rg, ai: cp.tot.ai, total: cp.total, ids: cp.ids } }; }); }
  function distOf(S, t, proj) { var a = S.ans[t.id] || {}, ids = Object.keys(a), box = h("div"); box.appendChild(h("p", {}, ids.length + " réponse(s) sur " + Object.keys(S.pl).length + " joueur(s)"));
      if (t.type === "single" || t.type === "multi") (t.options).forEach(function (o) { var n = ids.filter(function (p) { return t.type === "single" ? a[p] === o.id : (a[p] || []).indexOf(o.id) >= 0; }).length; box.appendChild(h("div", { class: "jauge" }, h("span", { style: "flex:0 0 55%" }, o.t), h("div", { class: "bar2" }, h("i", { style: "width:" + (ids.length ? n * 100 / ids.length : 0) + "%" })), h("b", {}, n))); });
      if (t.type === "form") t.champs.forEach(function (f) { var line = f.o.map(function (o) { return o.t + " : " + ids.filter(function (p) { return a[p] && a[p][f.id] === o.id; }).length; }).join(" · "); box.appendChild(h("p", { class: "small" }, h("b", {}, f.l + " — "), line)); });
      if (t.type === "order") { var c = {}; ids.forEach(function (p) { var s = (a[p] || []).join(""); c[s] = (c[s] || 0) + 1; }); Object.keys(c).sort(function (x, y) { return c[y] - c[x]; }).slice(0, 4).forEach(function (s) { box.appendChild(h("p", { class: "small" }, c[s] + " × " + s.split("").map(function (id) { return optLabel(t, id); }).join(" → "))); }); }
      if (t.type === "cloud") { var w = {}; ids.forEach(function (p) { (a[p] || []).forEach(function (x) { var k = x.toLowerCase(); w[k] = (w[k] || 0) + 1; }); }); var ks = Object.keys(w).sort(function (x, y) { return w[y] - w[x]; }), mx = ks.length ? w[ks[0]] : 1; box.appendChild(h("p", { class: "nuage" + (proj ? " proj" : "") }, ks.map(function (k) { return h("span", { style: "font-size:" + (1 + 1.6 * w[k] / mx).toFixed(2) + "em" }, k + (w[k] > 1 ? " (" + w[k] + ")" : "") + " "); }))); }
      if (t.carte || t.liens) { var ii = (S.ins && S.ins[t.id]) || {}, ps = Object.keys(ii), cnt = function (k) { return ps.filter(function (p) { return (ii[p] || []).some(function (x) { return x.indexOf(k) === 0; }); }).length; };
        box.appendChild(h("p", { class: "small" }, "Ont regardé l'adresse réelle : " + (t.carte ? "expéditeur " + cnt("exp") + " · lien " + cnt("lien") + " · pièce jointe " + cnt("pj") : "au moins un lien " + cnt("lien")) + " (sur " + ids.length + " réponse(s))")); }
      return box; }
  function modal(titre, node) {
    var ov = h("div", { class: "ovl", role: "dialog", "aria-modal": "true", "aria-label": titre }), box = h("div", { class: "mbox" });
    function close() { ov.remove(); }
    box.appendChild(h("div", { class: "mhd" }, h("b", {}, titre), h("button", { class: "tb", onclick: close, "aria-label": "Fermer" }, "✕ Fermer")));
    box.appendChild(node); ov.appendChild(box); ov.addEventListener("click", function (e) { if (e.target === ov) close(); }); document.body.appendChild(ov); return close;
  }
  var SIGT = [["err", "Erreur ou faute"], ["amb", "Question ambiguë"], ["cont", "Réponse contestable"], ["idee", "Idée ou suggestion"], ["bug", "Bug de l'application"]];
  var inflight = {};
  function flushSig(bus, sid) {
    var q = lsGet("cr_sigq_" + sid, []);
    q.forEach(function (r) { if (r.sent || inflight[r.id]) return; inflight[r.id] = 1; setTimeout(function () { delete inflight[r.id]; }, 8000); bus.pub(topic(sid, "g"), { k: "G", rec: r }).then(function () { var q2 = lsGet("cr_sigq_" + sid, []); q2.forEach(function (x) { if (x.id === r.id) x.sent = true; }); lsSet("cr_sigq_" + sid, q2); delete inflight[r.id]; }); });
  }
  function sigForm(bus, sid, prof, ctx, after) {
    var sc = ctx ? "q" : "g", ty = "err", box = h("div"), ta = h("textarea", { rows: "4", maxlength: "500", placeholder: "Décrivez en une ou deux phrases (500 caractères max)", "aria-label": "Votre remarque" }), send = h("button", { class: "pri", disabled: true }, "Envoyer"), msg = h("p", { class: "small" }, "");
    function grp(items, get, set) { var g = h("div", { class: "grp" }); items.forEach(function (it) { var b = h("button", { class: get() === it[0] ? "sel" : "", onclick: function () { set(it[0]); g.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); } }, it[1]); g.appendChild(b); }); return g; }
    box.appendChild(h("p", { class: "small" }, "Votre remarque est transmise à l'animateur avec votre prénom (elle n'est pas anonyme). Elle n'a aucun effet sur vos points. Elle n'est jamais projetée."));
    box.appendChild(h("h3", {}, "Concerne"));
    box.appendChild(grp(ctx ? [["q", "Cette question (" + ctx + ")"], ["g", "Le jeu en général"]] : [["g", "Le jeu en général"]], function () { return sc; }, function (v) { sc = v; }));
    box.appendChild(h("h3", {}, "Type")); box.appendChild(grp(SIGT, function () { return ty; }, function (v) { ty = v; }));
    ta.addEventListener("input", function () { send.disabled = ta.value.trim().length < 3; });
    box.appendChild(ta); box.appendChild(h("p", {}, send)); box.appendChild(msg);
    send.onclick = function () { var q = lsGet("cr_sigq_" + sid, []); q.push({ id: uid(), p: prof.pid, n: prof.name, tm: prof.team, sc: sc === "q" ? ctx : "général", ty: ty, x: ta.value.trim(), ts: Date.now(), sent: false }); lsSet("cr_sigq_" + sid, q); flushSig(bus, sid); ta.value = ""; send.disabled = true; msg.textContent = "✓ Remarque enregistrée" + (bus.st === "relais" ? " et envoyée." : " ; elle partira dès que la connexion reviendra."); if (after) after(); };
    return box;
  }
  function badgesFrom(byCode, nSig, nDone) {
    var out = []; Object.keys(byCode).forEach(function (c) { var b = byCode[c]; if (b.n >= 2 && b.s / (b.n * 3) >= 0.8) out.push("Vigie « " + CODES[c] + " » : au moins 80 % des points"); });
    if (nSig > 0) out.push("Œil critique : a signalé une amélioration"); if (nDone >= 8) out.push("Régulier : a joué au moins 8 questions"); return out;
  }
  function badgeCard(byCode, nSig, nDone) {
    var bs = badgesFrom(byCode, nSig, nDone), weak = Object.keys(byCode).filter(function (c) { return byCode[c].n >= 1 && byCode[c].s / (byCode[c].n * 3) < 0.6; });
    var box = h("div", { class: "card" }, h("h3", {}, "Vos badges (personnels, sans classement)"));
    box.appendChild(bs.length ? h("ul", {}, bs.map(function (b) { return h("li", {}, "🏅 " + b); })) : h("p", { class: "small" }, "Pas encore de badge : ils s'obtiennent avec des réponses régulières."));
    if (weak.length) box.appendChild(h("p", {}, h("b", {}, "À retravailler : "), weak.map(function (c) { return CODES[c]; }).join(", ") + ". Relisez la fiche réflexe sur ces points."));
    return box;
  }
  function byCodeOf(entries) { var b = {}; entries.forEach(function (e) { if (!e.c) return; b[e.c] = b[e.c] || { s: 0, n: 0 }; b[e.c].s += e.p; b[e.c].n++; }); return b; }

  function viewPlayer() {
    var sid = sidFrom(), prof = lsGet("cr_profil", null);
    if (!prof || prof.sid !== sid) return joinForm(sid);
    var st = null, ans = lsGet("cr_rep_" + sid, {}), insp = lsGet("cr_ins_" + sid, {}), curInput = null, shown = null, bus;
    var bar = h("div", { class: "bar" }, h("b", {}, "Jeu 23 · " + C.titre), h("span", {}, ""));
    var main = h("main"), nv = h("div", { class: "nav" }); root.appendChild(bar); root.appendChild(main); root.appendChild(nv);
    var cache = lsGet("cr_cache_" + sid, {}), nav = null;
    function played() { return C.tasks.filter(function (x) { return cache[x.id]; }).map(function (x) { return x.id; }); }
    function curId() { return nav != null ? nav : (st && st.task) || null; }
    function status() { clear(bar); var eq = C.equipes.filter(function (x) { return x.id === prof.team; })[0]; bar.appendChild(h("b", {}, eq.s + " " + prof.name + " · " + eq.n)); bar.appendChild(syncBadge(bus)); bar.appendChild(h("span", {}, h("button", { class: "tb", onclick: openAudit }, "Audit"), " ", h("button", { class: "tb", onclick: function () { modal("Règles du jeu", reglesBody()); } }, "Règles"), " ", h("button", { class: "tb", onclick: function () { var id = curId(); modal("Signaler", sigForm(bus, sid, prof, id ? id : null)); } }, "Signaler"), " ", quitBtn())); }
    function join() { bus.pub(topic(sid, "r"), { k: "J", p: prof.pid, n: prof.name, tm: prof.team, u: uid() }); var cur = st && st.phase === "open" ? st.task : null; if (cur && ans[cur]) sendAns(cur); }
    function sendAns(id) { bus.pub(topic(sid, "r"), { k: "A", p: prof.pid, n: prof.name, tm: prof.team, t: id, a: ans[id], i: insp[id] || [], u: uid() }); }
    bus = new Bus(sid, function () { status(); if (bus.st === "relais") { join(); flushSig(bus, sid); } });
    bus.sub(topic(sid, "h"), function (o) { var m; try { m = JSON.parse(o.m); } catch (e) { return; } if (st && m.v < st.v) return; st = m; if (st.phase === "revealed" && st.reveal && st.reveal.t) { cache[st.reveal.t] = { key: st.reveal.key, avg: st.reveal.avg }; lsSet("cr_cache_" + sid, cache); } render(); });
    setInterval(status, 5000); status(); guard(function () { step(-1); }, false);
    function step(d) { var l = played(), live = st && st.phase === "revealed" && cache[st.task] ? l.indexOf(st.task) : l.length, cur = nav != null ? l.indexOf(nav) : live, n = cur + d; nav = (n < 0 || n >= l.length) ? (n < 0 ? l[0] || null : null) : l[n]; if (nav && st && st.phase === "revealed" && nav === st.task) nav = null; shown = null; render(); window.scrollTo(0, 0); }
    function updNav() { clear(nv); var l = played(); if (!l.length) return; var live = st && st.phase === "open" ? st.task : null; if (nav) nv.appendChild(h("p", { class: "small" }, "Vous relisez la question " + nav + (live ? " · une nouvelle question est ouverte" : ""))); nv.appendChild(h("button", { onclick: function () { step(-1); } }, "◀ Précédente")); nv.appendChild(h("button", { disabled: nav == null, onclick: function () { step(1); } }, "Suivante ▶")); if (nav) nv.appendChild(h("button", { class: "pri", onclick: function () { nav = null; shown = null; render(); } }, live ? "Revenir à la question en cours" : "Revenir à l'écran actuel")); }
    function render() { try { render0(); updNav(); } catch (e) { if (window.console) console.error(e); shown = null; oops(main, function () { shown = null; render(); }, function () { if (nav) step(1); else { shown = null; wait(); } }); } }
    function hist(id) { var t = task(id); if (shown === "h" + id) return; shown = "h" + id; clear(main); main.appendChild(h("h1", {}, t.titre)); main.appendChild(h("p", {}, t.enonce)); main.appendChild(Correction(t, cache[id].key, ans[id])); if (t.imp) main.appendChild(h("div", { class: "card" }, h("h3", {}, "Imprévu"), h("p", {}, t.imp.t), h("p", { class: "small" }, t.imp.q))); }
    function render0() {
      if (nav && cache[nav]) return hist(nav); nav = null;
      var key = st ? st.phase + ":" + st.task + ":" + st.v : "";
      if (!st || st.phase === "idle" || !st.task) { shown = null; return wait(); }
      var t = task(st.task); if (!t) { if (/^AU/.test(st.task)) { if (shown === "L" + st.task) return; shown = "L" + st.task; clear(main); main.appendChild(h("h1", {}, "Question d'audit")); main.appendChild(unlockCard("Cette question s'appuie sur le relevé de l'audit. Saisissez le code donné par l'animateur.")); return; } return wait(); }
      if (st.phase === "open") {
        if (shown === "o" + t.id) return; shown = "o" + t.id; clear(main); main.appendChild(Enonce(t, function (k) { var l = insp[t.id] = insp[t.id] || []; if (l.indexOf(k) < 0) { l.push(k); lsSet("cr_ins_" + sid, insp); } }));
        if (t.bloc === "B8" || t.bloc === "B9") main.appendChild(h("p", {}, h("button", { onclick: function () { openAudit(t.bloc === "B9" ? "oi" : null); } }, t.bloc === "B9" ? "📄 Voir le repérage public" : "📄 Voir le relevé de l'audit")));
        var btn = h("button", { class: "pri", disabled: true }, "Envoyer ma réponse"), okmsg = h("p", { class: "small" }, ans[t.id] ? "✓ Réponse envoyée. Vous pouvez la modifier avant la correction." : "");
        curInput = Input(t, prof.pid, function (v) { ans[t.id] = v; lsSet("cr_rep_" + sid, ans); btn.disabled = !curInput.valid(); okmsg.textContent = ""; }, ans[t.id]);
        btn.disabled = !curInput.valid();
        btn.onclick = function () { ans[t.id] = curInput.get(); lsSet("cr_rep_" + sid, ans); sendAns(t.id); okmsg.textContent = "✓ Réponse envoyée. Vous pouvez la modifier avant la correction."; };
        main.appendChild(curInput.el); main.appendChild(btn); main.appendChild(okmsg);
      } else if (st.phase === "revealed" && st.reveal && st.reveal.t === t.id) {
        if (shown === "r" + t.id) return; shown = "r" + t.id; clear(main);
        main.appendChild(h("h1", {}, t.titre)); main.appendChild(h("p", {}, t.enonce)); main.appendChild(Correction(t, st.reveal.key, ans[t.id]));
        if (t.imp) main.appendChild(h("div", { class: "card" }, h("h3", {}, "Imprévu"), h("p", {}, t.imp.t), h("p", { class: "small" }, t.imp.q)));
        if (t.jeu) { var my = st.teams.filter(function (x) { return x.id === prof.team; })[0]; if (my) { main.appendChild(h("div", { class: "card" }, h("h3", {}, "Votre entreprise après cette scène"), Jauges(my.j))); if (st.reveal.key.bad && st.reveal.avg < 2.4) main.appendChild(h("p", { class: "msg" }, "⚠ Conséquence : " + st.reveal.key.bad)); } }
        main.appendChild(h("div", { class: "card" }, h("h3", {}, "Classement des équipes"), Classement(st.teams, prof.team)));
        var myc = st.teams.filter(function (x) { return x.id === prof.team; })[0]; if (myc && myc.acc) main.appendChild(Compte(myc.acc));
      } else wait();
    }
    function wait() { if (shown === "w" + (st ? st.v : 0)) return; shown = "w" + (st ? st.v : 0); clear(main); main.appendChild(h("h1", {}, "Audit de départ · en attente de la prochaine question")); main.appendChild(AuditLaunch()); main.appendChild(h("p", {}, st ? "Votre animateur va ouvrir la suite. Gardez cette page ouverte." : "Connexion à la séance " + sid + "… Si rien n'apparaît, vérifiez que l'animateur a ouvert la tour de contrôle.")); if (st && st.teams) { main.appendChild(h("div", { class: "card" }, h("h3", {}, "Classement"), Classement(st.teams, prof.team))); var my = st.teams.filter(function (x) { return x.id === prof.team; })[0]; if (my) main.appendChild(h("div", { class: "card" }, h("h3", {}, "Votre entreprise Granuval"), Jauges(my.j))); if (my && my.acc) main.appendChild(Compte(my.acc)); var ent = []; Object.keys(cache).forEach(function (id) { var tt2 = task(id); if (!tt2 || tt2.sondage || ans[id] === undefined) return; var p = E.score(tt2, cache[id].key, ans[id]); if (p !== null) ent.push({ c: tt2.code, p: p }); }); if (ent.length) main.appendChild(badgeCard(byCodeOf(ent), lsGet("cr_sigq_" + sid, []).length, ent.length)); } main.appendChild(h("p", { class: "small" }, h("a", { href: "#/j?s=" + sid, onclick: function () { lsSet("cr_profil", null); } }, "Changer de nom ou d'équipe"))); }
    wait(); updNav(); flushSig(bus, sid);
  }
  function joinForm(sid) {
    var name = h("input", { type: "text", maxlength: "20", placeholder: "Votre prénom", "aria-label": "Votre prénom" }), team = null, tb = h("div", { class: "grp" }), go = h("button", { class: "pri", disabled: true }, "Rejoindre la partie");
    var check = function () { go.disabled = !(name.value.trim() && team); };
    C.equipes.forEach(function (e) { var b = h("button", { onclick: function () { team = e.id; tb.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); check(); } }, e.s + " " + e.n); tb.appendChild(b); });
    name.addEventListener("input", check);
    go.onclick = function () { lsSet("cr_profil", { pid: lsGet("cr_pid", null) || (function () { var p = uid(); lsSet("cr_pid", p); return p; })(), name: name.value.trim(), team: team, sid: sid }); route(); };
    root.appendChild(h("main", {}, h("h1", {}, "Jeu 23 · " + C.titre), h("p", {}, C.sousTitre + " : 8 scènes, une équipe, une entreprise à protéger."), h("div", { class: "card" }, h("h3", {}, "Séance " + sid), h("p", {}, name), h("p", {}, "Choisissez votre équipe :"), tb, h("p", {}, go)), h("p", { class: "small" }, "Aucun mot de passe ni donnée réelle n'est demandé. ", h("a", { href: "#/regles" }, "Règles du jeu"))));
  }

  // ───────── Mode solo (entraînement, sans relais)
  function viewSolo() {
    var m2 = /[?&]m=2/.test(location.hash);
    root.appendChild(h("div", { class: "bar" }, h("b", {}, "Jeu 23 · Entraînement seul" + (m2 ? " · manche 2" : "")), h("a", { href: "#/" }, "Accueil")));
    var main = h("main"); root.appendChild(main); main.appendChild(h("p", {}, "Chargement des corrigés…"));
    loadKeys().then(function (K) {
      var list = C.tasks.filter(function (t) { return !t.sondage && t.bloc !== "B7" && (m2 ? t.manche === 2 : t.manche !== 2); }), i = 0, total = 0, scored = 0, ent = [], mq = /[?&]q=([A-Z0-9a-z]+)/.exec(location.hash);
      if (mq) list.forEach(function (t, n) { if (t.id === mq[1]) i = n; });
      var intro = !mq && !m2;
      (function step() {
        clear(main);
        if (intro) { main.appendChild(h("h1", {}, "D'abord, lisez le relevé de l'audit")); main.appendChild(h("p", {}, "Les premières questions s'appuient sur ce relevé réel de melia.green. Parcourez les onglets, puis commencez.")); var go0 = function () { intro = false; step(); window.scrollTo(0, 0); }; main.appendChild(AuditLaunch()); main.appendChild(h("p", {}, h("button", { class: "pri", onclick: go0 }, window.AUDIT ? "Commencer les questions" : "Passer sans l'audit"))); return; }
        if (i >= list.length) {
          main.appendChild(h("h1", {}, "Terminé : " + total + " / " + scored * 3 + " points"));
          var bc = byCodeOf(ent), box = h("div", { class: "card" }, h("h3", {}, "Vos points par compétence"));
          Object.keys(CODES).forEach(function (c) { if (!bc[c]) return; var pc = Math.round(bc[c].s * 100 / (bc[c].n * 3)); box.appendChild(h("div", { class: "jauge " + (pc < 50 ? "low" : pc < 75 ? "mid" : "") }, h("span", { style: "min-width:7.5em" }, CODES[c]), h("div", { class: "bar2" }, h("i", { style: "width:" + pc + "%" })), h("b", {}, pc + " %"))); });
          main.appendChild(box); main.appendChild(badgeCard(bc, 0, ent.length));
          var ratees = ent.filter(function (e) { return e.p < 2; }); if (ratees.length) main.appendChild(h("div", { class: "card" }, h("h3", {}, "Questions à revoir"), h("ul", {}, ratees.map(function (e) { return h("li", {}, e.id + " · " + e.titre); }))));
          main.appendChild(h("p", {}, h("button", { class: "pri", onclick: function () { location.reload(); } }, "Recommencer"), " ", h("a", { class: "btn", href: m2 ? "#/solo" : "#/solo?m=2" }, m2 ? "Manche 1" : "Manche 2 (variantes piégées)")));
          return;
        }
        var t = list[i]; main.appendChild(h("p", { class: "small" }, "Question " + (i + 1) + " / " + list.length)); main.appendChild(Enonce(t));
        var inp = Input(t, "solo", function () { go.disabled = !inp.valid(); }), go = h("button", { class: "pri", disabled: true }, "Valider");
        main.appendChild(inp.el); main.appendChild(go);
        go.onclick = function () { var a = inp.get(), p = E.score(t, K[t.id], a); if (p !== null) { total += p; scored++; ent.push({ id: t.id, titre: t.titre, c: t.code, p: p }); } clear(main); main.appendChild(h("h1", {}, t.titre)); if (p !== null) main.appendChild(h("p", { class: "pts" }, p + " / 3")); main.appendChild(Correction(t, K[t.id], a)); if (t.imp) main.appendChild(h("div", { class: "card" }, h("h3", {}, "Imprévu"), h("p", {}, t.imp.t), h("p", { class: "small" }, t.imp.q))); main.appendChild(h("button", { class: "pri", onclick: function () { i++; step(); } }, "Suite")); window.scrollTo(0, 0); };
      })();
    });
  }

  // ───────── Tour de contrôle (animateur)
  function viewTour() {
    var sid = sidFrom(), key = "cr_hote_" + sid;
    var S = lsGet(key, null) || { v: 0, cur: null, phase: "idle", rev: {}, ans: {}, pl: {}, res: {}, auto: true, al: {} };
    var slide = { last: null, at: 0, ntfy: false, pending: null, tests: 0 }, bus, proj = false, t0 = Date.now();
    var root2 = h("div"); root.appendChild(root2);
    function save() { lsSet(key, S); }
    function teams() { return teamsOf(S); }
    function pubState() { S.v++; var t = S.cur ? task(S.cur) : null; var m = { v: S.v, i: uid(), task: S.cur, phase: S.phase, teams: teams().map(function (x) { return { id: x.id, pts: x.pts, n: x.n, j: x.j, acc: { rg: x.acc.rg, ai: x.acc.ai, total: x.acc.total } }; }), reveal: S.phase === "revealed" && S.cur && S.res[S.cur] ? { t: S.cur, key: S.res[S.cur].key, avg: S.res[S.cur].avg } : null, ts: Date.now() }; save(); bus.pub(topic(sid, "h"), m); }
    function canon(p, n, tm) { S.al = S.al || {}; if (S.al[p]) return S.al[p]; var key = String(n || "").trim().toLowerCase() + "|" + tm; for (var q in S.pl) if (q !== p && String(S.pl[q].n || "").trim().toLowerCase() + "|" + S.pl[q].tm === key) { S.al[p] = q; return q; } return p; }
    function onR(o) { var m; try { m = JSON.parse(o.m); } catch (e) { return; } if (!m || !m.p) return; m.p = canon(m.p, m.n, m.tm); var ch = false; if (!S.pl[m.p] || S.pl[m.p].n !== m.n || S.pl[m.p].tm !== m.tm) { S.pl[m.p] = { n: m.n, tm: m.tm }; ch = true; } if (m.k === "A" && m.t && !S.res[m.t]) { S.ans[m.t] = S.ans[m.t] || {}; S.ans[m.t][m.p] = m.a; S.ins = S.ins || {}; S.ins[m.t] = S.ins[m.t] || {}; S.ins[m.t][m.p] = m.i || []; ch = true; } if (ch) { save(); draw(); } }
    function applySlide(g) {
      g = String(g || ""); var rev = /:c$/.test(g), id = g.replace(/:c$/, ""), t = id ? task(id) : null;
      if (S.phase === "open" && S.cur && S.cur !== id) { var c0 = task(S.cur); if (c0 && c0.sondage && !S.res[S.cur]) reveal(); }
      if (t) { if (rev) { if (!S.res[id]) { S.cur = id; S.phase = "open"; reveal(); } else openTask(id); } else openTask(id); slide.pending = null; }
      else if (S.phase === "revealed") { S.phase = "idle"; S.cur = null; slide.pending = null; pubState(); }
      draw();
    }
    function onS(o) { var m; try { m = JSON.parse(o.m); } catch (e) { return; } if (!m) return; if (m._u && slide.seen === m._u) return; slide.seen = m._u; if (m.k === "T") { slide.tests++; slide.at = Date.now(); draw(); return; } if (m.k !== "S") return; if (o.ts && o.ts < t0 - 1500 && !slide.allowOld) { slide.last = m; slide.at = o.ts; draw(); return; } slide.allowOld = false; slide.last = m; slide.at = Date.now(); var g = m.g ? String(m.g) : "", t = g ? task(g.replace(/:c$/, "")) : null; if (S.auto) applySlide(g); else if (t) slide.pending = g; draw(); }
    function onG(o) { var m; try { m = JSON.parse(o.m); } catch (e) { return; } if (!m || m.k !== "G" || !m.rec || !m.rec.id) return; S.sig = S.sig || {}; if (S.sig[m.rec.id]) return; var r = m.rec; r.statut = "à approuver"; r.tous = false; S.sig[r.id] = r; save(); draw(); }
    function go(d) { var ix = S.cur ? C.tasks.map(function (x) { return x.id; }).indexOf(S.cur) : -1, n = ix + d; if (ix < 0 && d < 0) n = 0; if (n >= 0 && n < C.tasks.length) openTask(C.tasks[n].id); }
    function sigList() { var arr = Object.keys(S.sig || {}).map(function (k) { return S.sig[k]; }).sort(function (a, b) { return a.ts - b.ts; }), box = h("div"); if (!arr.length) { box.appendChild(h("p", { class: "small" }, "Aucune remarque pour l'instant.")); return box; }
      var tn = {}; SIGT.forEach(function (x) { tn[x[0]] = x[1]; });
      arr.forEach(function (r) { var line = "[" + r.sc + "] " + (tn[r.ty] || r.ty) + " — " + r.n + " : " + r.x; box.appendChild(h("div", { class: "row " + (r.statut === "approuvé" ? "good" : r.statut === "rejeté" ? "neu" : "bad") }, h("div", { class: "small" }, h("b", {}, r.statut.toUpperCase()), " · " + r.sc + " · " + (tn[r.ty] || r.ty) + " · " + r.n), h("div", {}, r.x), h("div", {}, h("button", { onclick: function () { r.statut = "approuvé"; save(); draw(); } }, "Approuver"), " ", h("button", { onclick: function () { r.statut = "rejeté"; save(); draw(); } }, "Rejeter"), " ", h("label", { class: "small" }, h("input", { type: "checkbox", checked: r.tous ? true : false, onchange: function (e) { r.tous = e.target.checked; save(); } }), " À tous les JEUX"), " ", h("button", { onclick: function () { try { navigator.clipboard.writeText(line); } catch (e) {} } }, "Copier")))); });
      box.appendChild(h("p", {}, h("button", { onclick: function () { var tx = arr.filter(function (r) { return r.statut === "approuvé"; }).map(function (r) { return "[" + r.sc + "] " + (tn[r.ty] || r.ty) + (r.tous ? " · À tous les JEUX" : "") + " — " + r.n + " : " + r.x; }).join("\n") || "(aucune remarque approuvée)"; var b = new Blob([tx], { type: "text/plain" }), a = h("a", { href: URL.createObjectURL(b), download: "signalements-" + sid + ".txt" }); document.body.appendChild(a); a.click(); a.remove(); } }, "Exporter les approuvés (.txt)"))); return box; }
    function openTask(id) { S.cur = id; S.phase = S.res[id] ? "revealed" : "open"; slide.pending = null; pubState(); draw(); }
    function reveal() { var t = task(S.cur), k = KEYS[t.id], a = S.ans[t.id] || {}, per = {}, tm = {}, sum = 0, cnt = 0; Object.keys(S.pl).forEach(function (p) { var pts = E.score(t, k, a[p]); if (pts === null) return; per[p] = pts; }); C.equipes.forEach(function (e) { var mem = Object.keys(S.pl).filter(function (p) { return S.pl[p].tm === e.id; }); if (mem.length && !t.sondage) { var s = 0; mem.forEach(function (p) { s += per[p] || 0; }); tm[e.id] = s / mem.length; sum += tm[e.id]; cnt++; } }); S.res[t.id] = { per: per, team: tm, avg: cnt ? sum / cnt : 0, key: k }; S.phase = "revealed"; pubState(); draw(); }
    function connect() { bus = new Bus(sid, function () { draw(); if (bus.st === "relais") pubState(); }); bus.sub(topic(sid, "r"), onR, 0); bus.sub(topic(sid, "s"), onS, 0); bus.sub(topic(sid, "g"), onG, 0); try { var es = new EventSource(C.ntfy + "/" + topic(sid, "s") + "/sse"); es.onmessage = function (ev) { try { var d = JSON.parse(ev.data); if (d && d.message) { slide.ntfy = true; onS({ m: d.message }); } } catch (e) {} }; } catch (e) {} }
    function dist(t) { return distOf(S, t, proj); }
    function suivi() { var pls = Object.keys(S.pl), done = Object.keys(S.res).filter(function (id) { return !(task(id) || {}).sondage && Object.keys(S.res[id].per || {}).length; }); if (!pls.length) return h("p", { class: "small" }, "Aucun joueur.");
      var rows = pls.map(function (p) { var tot = 0; done.forEach(function (id) { tot += S.res[id].per[p] || 0; }); return { p: p, tot: tot }; }).sort(function (a, b) { return b.tot - a.tot; });
      var tb = h("table", { class: "small" }, h("tr", {}, h("th", {}, "Joueur"), h("th", {}, "Total"), done.map(function (id) { return h("th", {}, id); })));
      rows.forEach(function (r) { var e = C.equipes.filter(function (q) { return q.id === S.pl[r.p].tm; })[0]; tb.appendChild(h("tr", {}, h("td", {}, e.s + " " + S.pl[r.p].n), h("td", {}, h("b", {}, r.tot + " / " + done.length * 3)), done.map(function (id) { var v = S.res[id].per[r.p]; return h("td", {}, v === undefined ? "–" : String(v)); }))); });
      return h("div", {}, h("p", { class: "small" }, "Réservé à l'animateur : ne pas projeter. « – » : pas de réponse."), tb); }
    function detailCompte(tt) { var box = h("div"); var any = false;
      tt.forEach(function (x) { if (!x.n) return; any = true; var e = C.equipes.filter(function (q) { return q.id === x.id; })[0], ids = x.acc.ids, got = BAREME.items.filter(function (it) { return ids.indexOf(it.id) >= 0; }), left = BAREME.items.filter(function (it) { return ids.indexOf(it.id) < 0 && it.src; }).length;
        box.appendChild(h("p", { class: "small" }, h("b", {}, e.s + " " + e.n + " : " + euro(x.acc.total) + " — " + got.length + " crédité(s), " + left + " à découvrir"))); if (got.length) box.appendChild(h("ul", { class: "small" }, got.map(function (it) { return h("li", {}, it.n + " : " + euro(it.v)); }))); });
      if (!any) box.appendChild(h("p", { class: "small" }, "Aucune équipe pour l'instant."));
      box.appendChild(h("p", { class: "small" }, "Réservé à l'animateur : ne pas projeter. Chaque élément n'est crédité qu'une fois par équipe, après action de la moitié de l'équipe (ou moyenne de 1,5 sur 3 pour un geste)."));
      return box; }
    function draw() { try { draw0(); } catch (e) { if (window.console) console.error(e); oops(root2, draw, function () { try { go(1); } catch (e2) { draw(); } }); } }
    function draw0() {
      if (!bus) return; clear(root2);
      var bar = h("div", { class: "bar" }, h("b", {}, "Tour · Jeu 23 · séance " + sid), h("span", {}, syncBadge(bus, slide.last ? "diapo " + slide.last.n + " il y a " + Math.round((Date.now() - slide.at) / 1000) + " s" : "aucune diapo reçue"), " ", h("button", { onclick: function () { slide.allowOld = true; bus.resync(); pubState(); } }, "Resynchroniser"), " ", h("button", { onclick: openAudit }, "Relevé de l'audit"), " ", h("button", { onclick: function () { window.open(location.href.split("#")[0] + "#/ecran?s=" + sid, "_blank"); } }, "Écran projeté (nouvel onglet)"), " ", quitBtn()));
      root2.appendChild(bar);
      var tt = teams();
      if (proj) { var pm = h("main", { class: "wide proj" }); pm.appendChild(h("h1", {}, "Classement des équipes")); pm.appendChild(Classement(tt)); tt.forEach(function (x) { var e = C.equipes.filter(function (q) { return q.id === x.id; })[0]; if (x.n) pm.appendChild(h("div", { class: "card" }, h("h3", {}, e.s + " " + e.n), Jauges(x.j), h("p", {}, "Compte : " + euro(x.acc.total)))); }); root2.appendChild(pm); return; }
      var m = h("main", { class: "wide" }), cols = h("div", { class: "cols" }), L = h("div", { class: "card tl" }), M = h("div"), R = h("div");
      L.appendChild(h("h3", {}, "Questions")); var last = ""; C.tasks.forEach(function (t) { if (t.bloc !== last) { last = t.bloc; L.appendChild(h("p", { class: "small" }, h("b", {}, C.blocs[t.bloc]))); } var mark = S.res[t.id] ? "✓ " : S.cur === t.id && S.phase === "open" ? "● " : "○ "; L.appendChild(h("button", { class: S.cur === t.id ? "cur" : "", onclick: function () { openTask(t.id); } }, mark + t.id + " · " + t.titre)); });
      if (slide.pending) M.appendChild(h("div", { class: "msg" }, h("b", {}, "Diapositive reçue : " + slide.pending.replace(":c", " (corrigé)") + " "), h("button", { class: "pri", onclick: function () { applySlide(slide.pending); } }, (/:c$/.test(slide.pending) ? "Révéler le corrigé de " : "Ouvrir la question ") + slide.pending.replace(":c", ""))));
      var manual = h("input", { type: "text", placeholder: "Plan B : identifiant (ex. S3)", "aria-label": "Identifiant manuel" }); M.appendChild(h("div", { class: "card" }, h("label", {}, h("input", { type: "checkbox", checked: S.auto ? true : false, onchange: function (e) { S.auto = e.target.checked; save(); } }), " Synchro PowerPoint automatique : ouvre la question et révèle le corrigé quand la diapositive arrive (décochez pour bloquer : un bouton de confirmation apparaît)"), h("p", {}, manual, h("button", { onclick: function () { var v = manual.value.trim().toUpperCase(), t = C.tasks.filter(function (x) { return x.id.toUpperCase() === v; })[0]; if (t) openTask(t.id); } }, "Ouvrir"))));
      if (!window.AUDIT) M.appendChild(unlockCard("Animateur : saisissez le code audit pour activer les questions AU1 à AU6 et le relevé."));
      var cur = S.cur ? task(S.cur) : null;
      if (cur) { M.appendChild(h("div", { class: "nav" }, h("button", { onclick: function () { go(-1); } }, "◀ Précédente"), h("button", { onclick: function () { go(1); } }, "Suivante ▶"))); M.appendChild(h("h2", {}, cur.id + " · " + cur.titre + (S.phase === "revealed" ? " (corrigé affiché)" : S.phase === "open" ? " (ouverte)" : ""))); M.appendChild(Enonce(cur));
        if (S.phase === "open") { M.appendChild(h("div", { class: "card" }, h("h3", {}, "Réponses en direct"), dist(cur))); M.appendChild(h("button", { class: "pri", onclick: reveal }, "Révéler la correction")); }
        else if (S.phase === "revealed" && S.res[cur.id]) { M.appendChild(h("div", { class: "card" }, h("h3", {}, "Réponses reçues"), dist(cur))); M.appendChild(Correction(cur, KEYS[cur.id], null, true)); if (cur.imp) M.appendChild(h("div", { class: "card" }, h("h3", {}, "Imprévu à lancer à l'oral"), h("p", {}, cur.imp.t), h("p", { class: "small" }, "Question à poser : " + cur.imp.q))); M.appendChild(h("button", { onclick: function () { S.phase = "idle"; S.cur = null; pubState(); draw(); } }, "Fermer la question")); } }
      else { M.appendChild(h("div", { class: "nav" }, h("button", { onclick: function () { go(1); } }, "Première question ▶"))); M.appendChild(h("p", {}, "Choisissez une question à gauche, ou laissez la diapositive la proposer.")); }
      R.appendChild(h("div", { class: "card" }, h("h3", {}, "Équipes"), Classement(tt))); tt.forEach(function (x) { var e = C.equipes.filter(function (q) { return q.id === x.id; })[0]; if (x.n) R.appendChild(h("div", { class: "card" }, h("b", {}, e.s + " " + e.n), Jauges(x.j), h("p", { class: "small" }, "Compte : " + euro(x.acc.total) + " (ressources et gestes " + euro(x.acc.rg) + ", aides " + euro(x.acc.ai) + ")"))); });
      R.appendChild(h("div", { class: "card" }, h("h3", {}, "Signalements (" + Object.keys(S.sig || {}).length + ")"), sigList())); R.appendChild(h("div", { class: "card" }, h("h3", {}, "Détail du compte (animateur)"), detailCompte(tt)));
      R.appendChild(h("div", { class: "card" }, h("h3", {}, "Suivi des joueurs (animateur)"), suivi())); R.appendChild(h("div", { class: "card" }, h("h3", {}, "Joueurs (" + Object.keys(S.pl).length + ")"), h("p", { class: "small" }, Object.keys(S.pl).map(function (p) { return C.equipes.filter(function (q) { return q.id === S.pl[p].tm; })[0].s + " " + S.pl[p].n; }).join(" · ") || "Personne pour l'instant."), h("p", {}, h("a", { href: "qr-j.svg", target: "_blank" }, "QR code pour rejoindre"), " · ", h("button", { onclick: function () { var b = new Blob([JSON.stringify({ sid: sid, res: S.res, ans: S.ans, pl: S.pl }, null, 1)], { type: "application/json" }), a = h("a", { href: URL.createObjectURL(b), download: "jeu23-" + sid + ".json" }); document.body.appendChild(a); a.click(); a.remove(); } }, "Exporter"), " ", h("button", { onclick: function () { if (confirm("Effacer toute la partie ?")) { S = { v: S.v, cur: null, phase: "idle", rev: {}, ans: {}, pl: {}, res: {}, sig: S.sig, auto: S.auto }; pubState(); draw(); } } }, "Nouvelle partie"))));
      cols.appendChild(L); cols.appendChild(M); cols.appendChild(R); m.appendChild(cols); root2.appendChild(m);
    }
    root2.appendChild(h("main", {}, h("p", {}, "Chargement des corrigés (tour seulement)…")));
    loadKeys().then(function (K) { KEYS = K; guard(function () { go(-1); }, true); connect(); draw(); setInterval(function () { if (!proj) draw(); }, 15000); });
  }

  function viewRegles() {
    root.appendChild(h("div", { class: "bar" }, h("b", {}, "Jeu 23 · Règles"), h("a", { href: "#/" }, "Accueil")));
    root.appendChild(h("main", {}, reglesBody(), h("p", {}, h("a", { href: "#/" }, "Retour"))));
  }
  // ───────── Boîte à outils web : outils passifs d'abord, outils actifs verrouillés tant que l'accord de Mélia n'est pas obtenu
  var DOMS = [{ id: "example.com", n: "example.com (démonstration, domaine réservé à la documentation)", melia: false }, { id: "melia.green", n: "melia.green (nécessite l'accord de Mélia)", melia: true }];
  var OUTILS = [
    { id: "crt", k: "p", n: "crt.sh : certificats émis", u: function (d) { return "https://crt.sh/?q=" + encodeURIComponent("%." + d); }, lire: "La liste des certificats publics émis pour le domaine. Cherchez les noms inattendus (sous-domaines oubliés, tests) et les dates : un sous-domaine que personne ne connaît est un point d'attention." },
    { id: "dns", k: "p", n: "DNS public (Google) : enregistrements TXT", u: function (d) { return "https://dns.google/resolve?name=" + encodeURIComponent(d) + "&type=TXT"; }, lire: "Cherchez une ligne commençant par v=spf1 (qui a le droit d'envoyer des e-mails au nom du domaine). Pas de ligne : n'importe qui peut plus facilement se faire passer pour le domaine." },
    { id: "dmarc", k: "p", n: "DMARC du domaine (MXToolbox)", u: function (d) { return "https://mxtoolbox.com/SuperTool.aspx?action=" + encodeURIComponent("dmarc:" + d) + "&run=toolpage"; }, lire: "Regardez la politique (p=). « none » : les faux messages ne sont que surveillés. « quarantine » ou « reject » : ils sont mis de côté ou refusés. Une politique absente est un signal à signaler." },
    { id: "spf", k: "p", n: "SPF du domaine (MXToolbox)", u: function (d) { return "https://mxtoolbox.com/SuperTool.aspx?action=" + encodeURIComponent("spf:" + d) + "&run=toolpage"; }, lire: "Vérifiez que l'enregistrement existe, qu'il ne dépasse pas 10 recherches DNS et qu'il se termine par ~all ou -all." },
    { id: "vt", k: "p", n: "VirusTotal : réputation du domaine", u: function (d) { return "https://www.virustotal.com/gui/domain/" + encodeURIComponent(d); }, lire: "Combien de moteurs signalent le domaine ? Zéro est rassurant mais ne prouve rien. Ne téléversez jamais de document confidentiel." },
    { id: "shodan", k: "p", n: "Shodan : services visibles depuis Internet", u: function (d) { return "https://www.shodan.io/search?query=" + encodeURIComponent("hostname:" + d); }, lire: "Les services déjà visibles publiquement (ports, versions). Une base de données ou un accès à distance exposé est à signaler à l'informatique." },
    { id: "hibp", k: "p", n: "Have I Been Pwned : ma propre adresse est-elle dans une fuite ?", u: function () { return "https://haveibeenpwned.com/"; }, lire: "Saisissez uniquement votre propre adresse personnelle ou professionnelle. Une fuite signifie : changer le mot de passe correspondant et activer le second facteur.", seul: true },
    { id: "ssl", k: "a", n: "SSL Labs : qualité de la connexion chiffrée", u: function (d) { return "https://www.ssllabs.com/ssltest/analyze.html?d=" + encodeURIComponent(d) + "&hideResults=on&ignoreMismatch=on"; }, lire: "Une note de A+ à F. Visez A ou plus. L'analyse dure 1 à 3 minutes. Le résultat n'est pas affiché sur le tableau public (hideResults) : à vérifier sur la page avant de lancer." },
    { id: "obs", k: "a", n: "MDN HTTP Observatory : en-têtes de sécurité du site", u: function (d) { return "https://developer.mozilla.org/en-US/observatory/analyze?host=" + encodeURIComponent(d); }, lire: "Une note de A+ à F sur les protections envoyées par le site. Les corrections sont souvent de simples réglages de l'hébergeur." },
    { id: "sh", k: "a", n: "Security Headers : en-têtes HTTP", u: function (d) { return "https://securityheaders.com/?q=" + encodeURIComponent(d) + "&hide=on&followRedirects=on"; }, lire: "Une note de A+ à F ; l'option hide masque le résultat du tableau public. Les en-têtes manquants sont listés avec leur rôle." }
  ];
  function viewOutils() {
    root.appendChild(h("div", { class: "bar" }, h("b", {}, "Jeu 23 · Boîte à outils web"), h("a", { href: "#/" }, "Accueil")));
    var main = h("main"); root.appendChild(main);
    var dom = DOMS[0].id, accord = lsGet("cr_accord_melia", false), box = h("div");
    function draw() {
      clear(box); var d = DOMS.filter(function (x) { return x.id === dom; })[0];
      var sel = h("select", { "aria-label": "Domaine à examiner", onchange: function (e) { dom = e.target.value; draw(); } }); DOMS.forEach(function (x) { var o = h("option", { value: x.id }, x.n); if (x.melia && !accord) o.disabled = true; if (x.id === dom) o.selected = true; sel.appendChild(o); });
      box.appendChild(h("div", { class: "card" }, h("h3", {}, "Domaine"), h("p", {}, sel), h("label", { class: "small" }, h("input", { type: "checkbox", checked: accord ? true : false, onchange: function (e) { accord = e.target.checked; lsSet("cr_accord_melia", accord); if (!accord && DOMS.filter(function (x) { return x.id === dom; })[0].melia) dom = DOMS[0].id; draw(); } }), " Animateur : l'accord de Mélia a été obtenu (analyse de melia.green et outils actifs)"), h("p", { class: "small" }, "Sans cet accord : seul example.com est analysable. Aucune donnée personnelle n'est transmise par cette page ; les outils s'ouvrent dans un nouvel onglet.")));
      [["p", "Outils passifs : ils lisent des données déjà publiques", "Aucune requête n'est envoyée au site examiné par vous."], ["a", "Outils actifs : ils interrogent le site lui-même", "Ils envoient des requêtes au serveur examiné. À n'utiliser que sur un domaine dont le propriétaire a donné son accord (ou sur example.com en démonstration)."]].forEach(function (g) {
        var card = h("div", { class: "card" }, h("h3", {}, g[1]), h("p", { class: "small" }, g[2]));
        OUTILS.filter(function (o) { return o.k === g[0]; }).forEach(function (o) {
          var bloque = o.k === "a" && d.melia && !accord;
          card.appendChild(h("div", { class: "row neu" }, h("b", {}, o.n), h("p", { class: "small" }, h("b", {}, "Que lire ? "), o.lire), bloque ? h("p", { class: "small" }, "🔒 Verrouillé : accord de Mélia requis.") : h("a", { class: "btn pri", href: o.u(dom), target: "_blank", rel: "noopener noreferrer" }, "Ouvrir pour " + (o.seul ? "mon adresse" : dom))));
        });
        box.appendChild(card);
      });
      box.appendChild(h("p", { class: "small" }, "Gardez une trace : capture d'écran de ce que vous trouvez, puis répondez au sondage de la question T1 (« petit audit du domaine : fait »)."));
    }
    draw(); main.appendChild(h("h1", {}, "Boîte à outils web")); main.appendChild(h("p", {}, "Des outils gratuits pour examiner un nom de domaine, comme le ferait un petit audit. Commencez par les outils passifs.")); main.appendChild(box);
  }
  // Lancement de l'audit : code, puis déroulé des contrôles, puis résultats présentés en onglets
  var launched = false, launchTab = null;
  function AuditLaunch() {
    var box = h("div", { class: "card" });
    if (!window.AUDIT) { box.appendChild(h("h2", {}, "🔎 Lancer l'audit de melia.green")); box.appendChild(unlockCard()); return box; }
    if (launched || launchTab) { box.appendChild(AuditView(launchTab)); box.appendChild(h("p", {}, lockBtn())); return box; }
    box.appendChild(h("h2", {}, "🔎 Audit de melia.green"));
    box.appendChild(h("p", {}, "Contrôles passifs et actifs, réalisés avec l'accord de Mélia. Lancez l'audit : les résultats s'affichent à la fin."));
    var list = h("ul", { class: "small", "aria-live": "polite" }), go = h("button", { class: "pri" }, "▶ Lancer l'audit");
    var steps = ["Messagerie : SPF, DKIM, DMARC", "DNS : CAA, MTA-STS, hébergeur", "Certificat et chiffrement (SSL Labs)", "En-têtes de sécurité du site (MDN Observatory)", "Synthèse et plan d'action"];
    go.onclick = function () { go.disabled = true; var i = 0; (function nx() { if (i < steps.length) { list.appendChild(h("li", {}, "✓ " + steps[i])); i++; setTimeout(nx, 700); } else { launched = true; clear(box); box.appendChild(h("h2", {}, "🔎 Résultats de l'audit")); box.appendChild(AuditView()); box.appendChild(h("p", {}, lockBtn())); } })(); };
    box.appendChild(list); box.appendChild(go); return box;
  }
  function viewAudit() {
    root.appendChild(h("div", { class: "bar" }, h("b", {}, "Jeu 23 · Relevé de l'audit"), h("a", { href: "#/" }, "Accueil")));
    root.appendChild(h("main", { class: "wide" }, h("h1", {}, "Audit en direct de melia.green"), AuditLaunch(), h("p", {}, h("button", { onclick: function () { openAudit("oi"); } }, "🔎 Repérage public (OSINT)"))));
  }
  function openAudit(tab) { launchTab = typeof tab === "string" ? tab : null; modal("Audit de melia.green", AuditLaunch()); }
  // ───────── Code animateur : protège la tour et l'écran projeté (empreinte PBKDF2 dans animateur.json, jamais le code)
  function animOk() { try { return sessionStorage.getItem("cr_an") === "1"; } catch (e) { return false; } }
  function animGate(next) {
    if (animOk()) return next();
    var inp = h("input", { type: "password", placeholder: "Code animateur", autocomplete: "off", "aria-label": "Code animateur" }), msg = h("p", { class: "small", role: "status" }), b = h("button", { class: "pri" }, "Entrer");
    function go() { msg.textContent = "Vérification…"; var norm = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      fetch("animateur.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (p) { return crypto.subtle.importKey("raw", new TextEncoder().encode(norm), "PBKDF2", false, ["deriveBits"]).then(function (km) { return crypto.subtle.deriveBits({ name: "PBKDF2", salt: b64(p.salt), iterations: p.it, hash: "SHA-256" }, km, 256); }).then(function (bits) { var x = Array.prototype.map.call(new Uint8Array(bits), function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); if (x !== p.h) throw new Error("bad"); }); })
        .then(function () { try { sessionStorage.setItem("cr_an", "1"); } catch (e) {} clear(root); next(); }, function () { msg.textContent = "Code incorrect."; }); }
    b.onclick = go; inp.onkeydown = function (e) { if (e.key === "Enter") go(); };
    root.appendChild(h("main", {}, h("h1", {}, "Espace animateur"), h("div", { class: "card" }, h("p", {}, "Cette page est réservée à l'animateur. Saisissez le code animateur."), h("p", {}, inp, " ", b), msg), h("p", { class: "small" }, h("a", { href: "#/j" }, "Je suis joueur : rejoindre la séance"))));
  }
  function viewEcran() {
    var sid = sidFrom(), key = "cr_hote_" + sid, box = h("div"); root.appendChild(box);
    function draw() {
      var S = lsGet(key, null); clear(box);
      box.appendChild(h("div", { class: "bar" }, h("b", {}, "Écran projeté · séance " + sid), h("span", { class: "small" }, "Lecture seule · à partager dans Teams")));
      var m = h("main", { class: "wide proj ecran" }); box.appendChild(m);
      if (!S) { m.appendChild(h("h1", {}, "En attente de la partie")); m.appendChild(h("p", {}, "Ouvrez la tour dans ce même navigateur, puis revenez sur cet onglet.")); return; }
      var t = S.cur ? task(S.cur) : null, tt = teamsOf(S);
      if (t) {
        m.appendChild(h("p", { class: "small" }, t.id + (S.phase === "open" ? " · question en cours" : " · corrigé"))); m.appendChild(h("h1", {}, t.titre));
        if (t.enonce && !t.carte && !t.liens) m.appendChild(h("p", { class: "lead" }, t.enonce));
        var a = S.ans[t.id] || {}, n = Object.keys(a).length, np = Object.keys(S.pl).length;
        if (S.phase === "open" && !t.sondage) m.appendChild(h("div", { class: "card" }, h("h2", {}, n + " réponse(s) sur " + np + " joueur(s)"), h("p", { class: "small" }, "Les résultats s'affichent à la correction.")));
        else m.appendChild(h("div", { class: "card" }, distOf(S, t, true)));
      } else m.appendChild(h("h1", {}, "Jeu 23 · Réflexes"));
      if (S.phase !== "open" || !t) { m.appendChild(h("h2", {}, "Classement des équipes")); m.appendChild(Classement(tt)); tt.forEach(function (x) { var e = C.equipes.filter(function (q) { return q.id === x.id; })[0]; if (x.n) m.appendChild(h("div", { class: "card" }, h("h3", {}, e.s + " " + e.n), Jauges(x.j), h("p", {}, "Compte : " + euro(x.acc.total)))); }); }
    }
    loadKeys().then(function () { draw(); window.addEventListener("storage", draw); setInterval(draw, 1500); });
  }
  function viewHome() {
    root.appendChild(h("main", {}, h("h1", {}, "Jeu 23 · " + C.titre), h("p", {}, "Cybersécurité du quotidien : phishing, urgences, bons réflexes. " + C.sousTitre + "."), h("div", { class: "card" }, h("p", {}, h("a", { class: "btn pri", href: "#/j" }, "Je rejoins la séance depuis mon PC")), h("p", { class: "small" }, "PC d\u0027abord. Le téléphone ne sert qu\u0027en secours."), h("p", {}, h("a", { class: "btn", href: "#/solo" }, "M'entraîner seul(e)")), h("p", {}, h("a", { class: "btn", href: "#/regles" }, "Règles du jeu")), h("p", {}, h("a", { class: "btn", href: "#/audit" }, "Relevé de l'audit de melia.green")), h("p", {}, h("a", { class: "btn", href: "#/outils" }, "Boîte à outils web"))), h("p", { class: "small" }, "Animateur : ", h("a", { href: "#/tour" }, "ouvrir la tour de contrôle"), " · © 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés.")));
  }
  // ───────── Configuration de séance (durée variable, 3h à 7h) : ?config=<nom> charge sessions/<nom>.json
  // Sans ce paramètre, comportement inchangé (toutes les tâches restent présentes, comme avant cette fonctionnalité).
  function applyConfig() {
    var m = /[?&]config=([^&]+)/.exec(location.hash + location.search);
    if (!m) return Promise.resolve();
    return fetch("sessions/" + decodeURIComponent(m[1]) + ".json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
      if (!cfg) return;
      var comp = cfg.complements || ["B2b", "B4", "B5", "B7"];
      var n1 = cfg.scenario1 == null ? 8 : cfg.scenario1, n2 = cfg.scenario2 == null ? 8 : cfg.scenario2;
      var ordre1 = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].slice(0, n1);
      var ordre2 = ["S1b", "S2b", "S3b", "S4b", "S5b", "S6b", "S7b", "S8b"].slice(0, n2);
      C.tasks = C.tasks.filter(function (t) {
        if (t.jeu && t.manche !== 2) return ordre1.indexOf(t.id) !== -1;
        if (t.manche === 2) return ordre2.indexOf(t.id) !== -1;
        if (t.bloc === "B2b" || t.bloc === "B4" || t.bloc === "B5" || t.bloc === "B7") return comp.indexOf(t.bloc) !== -1;
        return true;
      });
    }).catch(function () {});
  }
  var cleanup = [];
  function route() {
    clear(root); var r = (location.hash || "#/").replace(/\?.*$/, ""); var TT = { "#/j": "Réflexes · ÉCRAN JOUEUR", "#/tour": "Réflexes · TOUR DE CONTRÔLE", "#/ecran": "Réflexes · ÉCRAN PROJETÉ", "#/solo": "Réflexes · Entraînement seul", "#/audit": "Réflexes · Audit", "#/regles": "Réflexes · Règles", "#/outils": "Réflexes · Boîte à outils" }; document.title = TT[r] || "Jeu 23 · Réflexes";
    if (r === "#/j") viewPlayer(); else if (r === "#/tour") animGate(viewTour); else if (r === "#/ecran") animGate(viewEcran); else if (r === "#/solo") viewSolo(); else if (r === "#/regles") viewRegles(); else if (r === "#/outils") viewOutils(); else if (r === "#/audit") viewAudit(); else viewHome();
  }
  window.addEventListener("hashchange", function () { location.reload(); });
  var ac = null; try { ac = sessionStorage.getItem("cr_ac"); } catch (e) {}
  function afterUnlock() { applyConfig().then(route); }
  if (ac) unlockPack(ac).then(afterUnlock, function () { try { sessionStorage.removeItem("cr_ac"); } catch (e) {} afterUnlock(); }); else afterUnlock();
})();
