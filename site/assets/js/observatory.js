/* SINTESIS Observatory — behaviour. No dependencies, no network requests, no storage:
   all data is embedded in the page at build time (tools/build.py). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("data").textContent);
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "cls") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var m = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10) - 1] + " " + p[0];
  }
  function f3(x) { return x === null || x === undefined ? "—" : x.toFixed(3); }

  /* ── Ledger scorecard ─────────────────────────────────────────── */
  (function () {
    var o = D.scorecard.overall, box = document.getElementById("score");
    var nxt = o.next_resolution;
    var cols = [
      ["Open forecasts", String(o.open), o.overdue ? o.overdue + " awaiting resolution data" : "all within their dates", false],
      ["Resolved", String(o.resolved), o.annulled + " annulled under the method", false],
      ["Brier score", f3(o.brier), o.resolved ? "skill vs a permanent 50%: " + (o.skill_vs_50pct === null ? "—" : o.skill_vs_50pct.toFixed(2)) : (nxt ? "first resolution due " + fmtDate(nxt) : "no forecast resolved yet"), true],
      ["Calibration", o.calibration ? "live" : "pending", o.calibration ? "log score " + f3(o.log_score) : "shown from " + D.scorecard.calibration_min_resolved + " resolved", false]
    ];
    cols.forEach(function (c) {
      var lab = el("p", { cls: "lab" });
      if (c[3]) lab.appendChild(el("span", { cls: "dot", "aria-hidden": "true" }));
      lab.appendChild(document.createTextNode(c[0]));
      var word = !/[0-9—]/.test(c[1]);
      box.appendChild(el("div", null, [lab, el("p", { cls: "v" + (word ? " word" : ""), text: c[1] }), el("p", { cls: "s", text: c[2] })]));
    });
    document.getElementById("score-asof").textContent = "As of " + fmtDate(D.scorecard.as_of) + " (UTC) · Brier score: 0 is perfect, 0.25 is a permanent 50%";
  })();

  /* ── Atlas ────────────────────────────────────────────────────── */
  (function () {
    var nodes = D.atlas, meta = D.atlas_meta, phases = {}, order = [];
    nodes.forEach(function (n) { if (!phases[n.phase]) { phases[n.phase] = []; order.push(n.phase); } phases[n.phase].push(n); });
    var wrap = document.getElementById("phases"), panel = document.getElementById("panel"), buttons = [];
    function projects(id) { return D.collection.filter(function (e) { return e.layer === id; }); }
    function questions(id) { return D.trainer.questions.filter(function (q) { return q.layer === id; }); }
    function show(n, btn) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      panel.innerHTML = "";
      var m = meta[n.id] || { note: "", indicators: [] };
      panel.appendChild(el("p", { cls: "lab", text: n.phase + " · layer" }));
      panel.appendChild(el("h3", { text: n.label }));
      panel.appendChild(el("p", { cls: "muted", text: m.note }));
      panel.appendChild(el("h4", { cls: "lab", text: "Forecasts" }));
      panel.appendChild(el("p", { text: n.becoming === null && n.returning === null ? "No open forecast yet. Scores appear here as forecasts on this layer open." : "Becoming " + n.becoming + " · Returning " + n.returning }));
      panel.appendChild(el("h4", { cls: "lab", text: "Public indicators" }));
      var ul = el("ul");
      if (m.indicators.length) m.indicators.forEach(function (i) { ul.appendChild(el("li", null, [el("a", { href: i[1], text: i[0] })])); });
      else ul.appendChild(el("li", { cls: "muted", text: "Named with the first forecasts on this layer." }));
      panel.appendChild(ul);
      var qs = questions(n.id);
      if (qs.length) {
        panel.appendChild(el("h4", { cls: "lab", text: "Practice questions" }));
        var qu = el("ul");
        qs.forEach(function (q) { var a = el("a", { href: "#trainer", text: q.question }); a.addEventListener("click", function () { window.SINTESIS_jump && window.SINTESIS_jump(q.id); }); qu.appendChild(el("li", null, [a])); });
        panel.appendChild(qu);
      }
      var ps = projects(n.id);
      panel.appendChild(el("h4", { cls: "lab", text: "Open-source projects" }));
      var pu = el("ul");
      if (!ps.length) pu.appendChild(el("li", { cls: "muted", text: "None collected yet." }));
      ps.forEach(function (p) {
        var li = el("li", null, [el("a", { href: p.url, text: p.name })]);
        li.appendChild(el("small", { text: p.reading ? p.reading.charAt(0).toUpperCase() + p.reading.slice(1) + " — " + p.reason : "Facts only (company-owned) · " + p.licence }));
        pu.appendChild(li);
      });
      panel.appendChild(pu);
    }
    order.forEach(function (ph) {
      var col = el("div", { cls: "phase" }, [el("p", { cls: "lab", text: ph })]);
      phases[ph].forEach(function (n) {
        var b = el("button", { cls: "node", type: "button", "aria-pressed": "false" });
        b.appendChild(document.createTextNode(n.label));
        var bars = el("span", { cls: "bars", "aria-hidden": "true" });
        var bb = el("span", { cls: "bar" }, [el("i")]), br = el("span", { cls: "bar ret" }, [el("i")]);
        bb.firstChild.style.width = ((n.becoming || 0) * 100) + "%";
        br.firstChild.style.width = ((n.returning || 0) * 100) + "%";
        bars.appendChild(bb); bars.appendChild(br); b.appendChild(bars);
        var c = projects(n.id).length, q = questions(n.id).length;
        b.appendChild(el("span", { cls: "count", text: c + " projects · " + q + " practice questions" }));
        b.addEventListener("click", function () { show(n, b); });
        buttons.push(b); col.appendChild(b);
      });
      wrap.appendChild(col);
    });
    if (nodes.length) show(nodes[0], buttons[0]);
  })();

  /* ── Calibration Trainer ──────────────────────────────────────── */
  (function () {
    var Q = D.trainer.questions, i = 0, answers = [];
    var card = document.getElementById("card"), tally = document.getElementById("tally");
    var layerLabel = {}; D.atlas.forEach(function (n) { layerLabel[n.id] = n.label; }); layerLabel.replication = "AI-finance replication";
    function brier(p, o) { return Math.pow(p - (o ? 1 : 0), 2); }
    function renderTally() {
      tally.innerHTML = "";
      tally.appendChild(el("p", { cls: "lab", text: "Your score" }));
      if (!answers.length) {
        tally.appendChild(el("p", { cls: "big", text: "—" }));
        tally.appendChild(el("p", { cls: "muted", text: "Mean Brier score across your answers. 0 is perfect; 0.25 is what a permanent 50% earns." }));
        return;
      }
      var m = answers.reduce(function (s, a) { return s + a.b; }, 0) / answers.length;
      tally.appendChild(el("p", { cls: "big", text: m.toFixed(3) }));
      var skill = 1 - m / 0.25;
      tally.appendChild(el("p", { cls: "muted", text: answers.length + " of " + Q.length + " answered · skill vs a permanent 50%: " + skill.toFixed(2) + (skill > 0 ? " (better than a coin)" : " (no better than a coin)") }));
      var t = el("table"), head = el("tr", null, [el("th", { text: "Question" }), el("th", { text: "You" }), el("th", { text: "Outcome" }), el("th", { text: "Brier" })]);
      t.appendChild(head);
      answers.forEach(function (a) {
        t.appendChild(el("tr", null, [el("td", { text: a.id }), el("td", { cls: "r", text: Math.round(a.p * 100) + "%" }), el("td", { text: a.o ? "Yes" : "No" }), el("td", { cls: "r", text: a.b.toFixed(3) })]));
      });
      tally.appendChild(t);
      if (answers.length === Q.length) {
        var hi = answers.filter(function (a) { return a.p >= 0.7; }), lo = answers.filter(function (a) { return a.p <= 0.3; });
        var hr = hi.length ? hi.filter(function (a) { return a.o; }).length / hi.length : null;
        var lr = lo.length ? lo.filter(function (a) { return a.o; }).length / lo.length : null;
        var msg = "Calibration check: ";
        msg += hr === null ? "no answers at 70% or more; " : "at 70% or more, " + Math.round(hr * 100) + "% happened; ";
        msg += lr === null ? "no answers at 30% or less." : "at 30% or less, " + Math.round(lr * 100) + "% happened.";
        tally.appendChild(el("p", { cls: "muted", text: msg, style: "margin-top:14px" }));
        tally.appendChild(el("p", { cls: "muted", text: "The Guild scores live questions under the same rule. It opens with the Ledger's first questions.", style: "margin-top:8px" }));
      }
    }
    function render() {
      card.innerHTML = "";
      if (i >= Q.length) {
        card.appendChild(el("p", { cls: "lab", text: "Complete" }));
        card.appendChild(el("p", { cls: "q", text: "That was all fourteen. Your score is on the right." }));
        var again = el("button", { cls: "btn", type: "button", text: "Start again" });
        again.addEventListener("click", function () { i = 0; answers = []; render(); renderTally(); });
        card.appendChild(again);
        return;
      }
      var q = Q[i];
      card.appendChild(el("p", { cls: "lab", text: "Question " + (i + 1) + " of " + Q.length + " · " + (layerLabel[q.layer] || q.layer) + " · asked as of " + fmtDate(q.asked_as_of) }));
      card.appendChild(el("p", { cls: "q", id: "q-text", text: q.question }));
      var out = el("output", { "for": "p", text: "50%" });
      var range = el("input", { type: "range", id: "p", min: "3", max: "97", step: "1", value: "50", "aria-labelledby": "q-text", "aria-valuetext": "50 percent" });
      range.addEventListener("input", function () { out.textContent = range.value + "%"; range.setAttribute("aria-valuetext", range.value + " percent"); });
      card.appendChild(el("div", { cls: "prob" }, [el("div", null, [range, el("div", { cls: "scale lab" }, [el("span", { text: "3% · surely not" }), el("span", { text: "97% · surely yes" })])]), out]));
      var go = el("button", { cls: "btn btn-decide", type: "button", text: "Commit my probability" });
      card.appendChild(go);
      var rev = el("div", { cls: "reveal", hidden: "hidden", "aria-live": "polite" });
      card.appendChild(rev);
      go.addEventListener("click", function () {
        var p = parseInt(range.value, 10) / 100, b = brier(p, q.answer);
        answers.push({ id: q.id, p: p, o: q.answer, b: b });
        range.disabled = true; go.disabled = true;
        rev.hidden = false;
        rev.appendChild(el("p", { cls: "verdict", text: (q.answer ? "It happened." : "It did not happen.") + " Your Brier score: " + b.toFixed(3) }));
        var dl = el("dl");
        [["What happened", q.value], ["Source", null], ["Context", q.note]].forEach(function (r) {
          dl.appendChild(el("dt", { text: r[0] }));
          if (r[1] === null) dl.appendChild(el("dd", null, [el("a", { href: q.url, text: q.source })]));
          else dl.appendChild(el("dd", { text: r[1] }));
        });
        rev.appendChild(dl);
        var next = el("button", { cls: "btn", type: "button", text: i + 1 < Q.length ? "Next question" : "See my score" });
        next.addEventListener("click", function () { i += 1; render(); card.scrollIntoView({ block: "start" }); });
        rev.appendChild(next);
        next.focus();
        renderTally();
      });
    }
    window.SINTESIS_jump = function (id) {
      for (var k = 0; k < Q.length; k++) if (Q[k].id === id && !answers.some(function (a) { return a.id === id; })) { i = k; render(); return; }
    };
    render(); renderTally();
  })();

  /* ── Collection ───────────────────────────────────────────────── */
  (function () {
    var C = D.collection, box = document.getElementById("coll"), f = document.getElementById("filters");
    var label = {}; D.atlas.forEach(function (n) { label[n.id] = n.label; });
    var modes = [["all", "All " + C.length], ["becoming", "Becoming"], ["returning", "Returning"], ["facts", "Facts only"]], btns = [];
    function draw(mode) {
      box.innerHTML = "";
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false"); });
      C.filter(function (e) { return mode === "all" || (mode === "facts" ? !e.reading : e.reading === mode); }).forEach(function (e) {
        var tag = e.reading ? el("p", { cls: "tag" + (e.reading === "returning" ? " ret" : ""), text: e.reading + " — " + e.reason }) : el("p", { cls: "tag fact", text: "Facts only · company-owned" });
        box.appendChild(el("div", { cls: "item" }, [el("p", { cls: "lab", text: (label[e.layer] || e.layer) + " · " + e.licence }), el("a", { href: e.url, text: e.name }), el("p", { text: e.does }), tag]));
      });
    }
    modes.forEach(function (m) {
      var b = el("button", { type: "button", "aria-pressed": "false", text: m[1] }); b.dataset.mode = m[0];
      b.addEventListener("click", function () { draw(m[0]); }); btns.push(b); f.appendChild(b);
    });
    draw("all");
  })();

  /* ── Canon ────────────────────────────────────────────────────── */
  (function () {
    var K = D.canon, NS = "http://www.w3.org/2000/svg", W = 724, rowH = 46;
    var rings = K.rings, rules = K.rules, people = K.thinkers;
    var H = Math.max(people.length, rules.length) * rowH + 90;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("role", "group"); svg.setAttribute("aria-label", "Map of thinkers and the Ledger rules they shaped");
    function s(tag, a) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); return n; }
    var pos = {}, rpos = {}, y = 60;
    var gEdges = s("g", {}), gNodes = s("g", {});
    svg.appendChild(gEdges); svg.appendChild(gNodes);
    var lab1 = s("text", { x: 0, y: 34, "class": "ring-lab" }); lab1.textContent = "THINKERS"; svg.appendChild(lab1);
    var lab2 = s("text", { x: 470, y: 34, "class": "ring-lab" }); lab2.textContent = "LEDGER RULES"; svg.appendChild(lab2);
    rings.forEach(function (r) {
      var rl = s("text", { x: 0, y: y + 4, "class": "ring-lab" }); rl.textContent = r.label.toUpperCase(); gNodes.appendChild(rl); y += 14;
      people.filter(function (p) { return p.ring === r.id; }).forEach(function (p) { pos[p.id] = y; y += rowH - 8; });
      y += 14;
    });
    var ry = 60, step = (H - 90) / rules.length;
    rules.forEach(function (r) { rpos[r.id] = ry + 6; ry += step; });
    var nodesById = {}, edges = [], rnodes = {};
    people.forEach(function (p) {
      p.rules.forEach(function (rid) {
        var x1 = 250, y1 = pos[p.id] + 15, x2 = 470, y2 = rpos[rid] + 15;
        var path = s("path", { d: "M" + x1 + " " + y1 + " C " + (x1 + 110) + " " + y1 + ", " + (x2 - 110) + " " + y2 + ", " + x2 + " " + y2, "class": "edge" });
        path.dataset.p = p.id; path.dataset.r = rid; gEdges.appendChild(path); edges.push(path);
      });
    });
    var card = document.getElementById("canon-card");
    function select(p) {
      Object.keys(nodesById).forEach(function (k) { nodesById[k].classList.toggle("on", k === p.id); nodesById[k].setAttribute("aria-pressed", k === p.id ? "true" : "false"); });
      edges.forEach(function (e) { e.classList.toggle("on", e.dataset.p === p.id); });
      Object.keys(rnodes).forEach(function (k) { rnodes[k].classList.toggle("on", p.rules.indexOf(k) >= 0); });
      card.innerHTML = "";
      var ring = rings.filter(function (r) { return r.id === p.ring; })[0];
      card.appendChild(el("p", { cls: "lab", text: ring.label + (p.voice ? " · the " + p.voice + " voice" : "") }));
      card.appendChild(el("h3", { text: p.name }));
      card.appendChild(el("p", { cls: "muted", text: p.work + (String(p.work).indexOf(String(p.year)) >= 0 ? "" : " (" + p.year + ")") }));
      card.appendChild(el("p", { text: p.idea, style: "margin-top:12px" }));
      card.appendChild(el("h4", { cls: "lab", text: "The rule it shaped" }));
      var ul = el("ul");
      p.rules.forEach(function (rid) { var r = rules.filter(function (x) { return x.id === rid; })[0]; var li = el("li", null, [el("b", { text: r.label })]); li.appendChild(el("small", { text: r.text + " (" + r.where + ")" })); ul.appendChild(li); });
      card.appendChild(ul);
    }
    people.forEach(function (p) {
      var g = s("g", { "class": "cnode", tabindex: "0", role: "button", "aria-pressed": "false", "aria-label": p.name });
      g.appendChild(s("rect", { x: 0, y: pos[p.id], width: 250, height: 30 }));
      var t = s("text", { x: 12, y: pos[p.id] + 20 }); t.textContent = p.short || p.name; g.appendChild(t);
      g.addEventListener("click", function () { select(p); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(p); } });
      nodesById[p.id] = g; gNodes.appendChild(g);
    });
    rules.forEach(function (r) {
      var g = s("g", { "class": "rnode" });
      g.appendChild(s("rect", { x: 470, y: rpos[r.id], width: 250, height: 30 }));
      var t = s("text", { x: 482, y: rpos[r.id] + 20 }); t.textContent = r.label; g.appendChild(t);
      rnodes[r.id] = g; gNodes.appendChild(g);
    });
    document.getElementById("canon-map").appendChild(svg);
    select(people[0]);
  })();

  /* ── Guild wall ───────────────────────────────────────────────── */
  (function () {
    var w = document.getElementById("wall");
    for (var k = 0; k < 16; k++) w.appendChild(el("div", { cls: "seat", "aria-hidden": "true" }, [el("span", { text: "open seat" })]));
  })();
})();
