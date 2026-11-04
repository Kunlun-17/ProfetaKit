/* Kitboard Admin – a ProfetaKit template. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Theme ---------- */
  var saved = store.get("kb-theme");
  if (saved) root.setAttribute("data-theme", saved);
  else if (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next); store.set("kb-theme", next);
      drawAll();
    });
  });

  /* ---------- Mobile nav ---------- */
  document.querySelectorAll("[data-menu]").forEach(function (b) {
    b.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  });
  document.addEventListener("click", function (e) {
    if (document.body.classList.contains("nav-open") && !e.target.closest(".sidebar") && !e.target.closest("[data-menu]")) document.body.classList.remove("nav-open");
  });

  /* ---------- Helpers ---------- */
  function css(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function money(n, cur) { return (cur || "$") + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
  var tip = document.createElement("div"); tip.className = "chart-tip"; document.body.appendChild(tip);
  function showTip(e, text) { tip.textContent = text; tip.style.left = (e.clientX + 12) + "px"; tip.style.top = (e.clientY - 34) + "px"; tip.style.opacity = 1; }
  function hideTip() { tip.style.opacity = 0; }
  function colorOf(name) { return css("--" + name) || name; }
  function niceMax(v) { var p = Math.pow(10, Math.floor(Math.log10(v || 1))); return Math.ceil(v / p) * p; }

  /* ---------- Charts ---------- */
  function lineChart(svg, cfg) {
    var W = svg.clientWidth || 600, H = svg.clientHeight || 260, pad = { l: 44, r: 12, t: 12, b: 26 };
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.innerHTML = "";
    var all = []; cfg.series.forEach(function (s) { all = all.concat(s.data); });
    var max = niceMax(Math.max.apply(null, all)), n = cfg.labels.length;
    var x = function (i) { return pad.l + (W - pad.l - pad.r) * (n === 1 ? 0.5 : i / (n - 1)); };
    var y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - v / max); };
    for (var g = 0; g <= 4; g++) {
      var gv = max * g / 4;
      el("line", { x1: pad.l, x2: W - pad.r, y1: y(gv), y2: y(gv), "class": "gridline" }, svg);
      el("text", { x: pad.l - 8, y: y(gv) + 4, "text-anchor": "end" }, svg).textContent = cfg.short ? (gv >= 1000 ? (gv / 1000) + "k" : gv) : gv;
    }
    var step = Math.ceil(n / 8);
    cfg.labels.forEach(function (lab, i) { if (i % step === 0) el("text", { x: x(i), y: H - 6, "text-anchor": "middle" }, svg).textContent = lab; });
    cfg.series.forEach(function (s, si) {
      var c = colorOf(s.color || "brand");
      var d = s.data.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v); }).join(" ");
      if (si === 0 && cfg.area !== false) {
        var grad = el("linearGradient", { id: "g" + svg.id, x1: 0, x2: 0, y1: 0, y2: 1 }, el("defs", {}, svg));
        el("stop", { offset: "0%", "stop-color": c, "stop-opacity": .22 }, grad);
        el("stop", { offset: "100%", "stop-color": c, "stop-opacity": 0 }, grad);
        el("path", { d: d + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z", fill: "url(#g" + svg.id + ")" }, svg);
      }
      el("path", { d: d, fill: "none", stroke: c, "stroke-width": 2.4, "stroke-linejoin": "round", "stroke-dasharray": s.dash ? "5 5" : "" }, svg);
    });
    // hover targets
    var guide = el("line", { y1: pad.t, y2: H - pad.b, stroke: css("--muted"), "stroke-dasharray": "3 3", opacity: 0 }, svg);
    cfg.labels.forEach(function (lab, i) {
      var w = (W - pad.l - pad.r) / Math.max(1, n - 1);
      var r = el("rect", { x: x(i) - w / 2, y: pad.t, width: w, height: H - pad.t - pad.b, fill: "transparent" }, svg);
      r.addEventListener("mousemove", function (e) {
        guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("opacity", .6);
        showTip(e, lab + ": " + cfg.series.map(function (s) { return s.name + " " + (cfg.money ? money(s.data[i], cfg.currency) : s.data[i]); }).join(" · "));
      });
      r.addEventListener("mouseleave", function () { guide.setAttribute("opacity", 0); hideTip(); });
    });
  }

  function barChart(svg, cfg) {
    var W = svg.clientWidth || 600, H = svg.clientHeight || 260, pad = { l: 40, r: 8, t: 10, b: 26 };
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.innerHTML = "";
    var max = niceMax(Math.max.apply(null, cfg.data)), n = cfg.data.length;
    var bw = (W - pad.l - pad.r) / n;
    var y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - v / max); };
    for (var g = 0; g <= 4; g++) {
      el("line", { x1: pad.l, x2: W - pad.r, y1: y(max * g / 4), y2: y(max * g / 4), "class": "gridline" }, svg);
      el("text", { x: pad.l - 8, y: y(max * g / 4) + 4, "text-anchor": "end" }, svg).textContent = max * g / 4;
    }
    cfg.data.forEach(function (v, i) {
      var bx = pad.l + i * bw + bw * 0.2, w = bw * 0.6;
      var r = el("rect", { x: bx, y: y(v), width: w, height: y(0) - y(v), rx: 5, fill: colorOf(i === n - 1 ? "brand" : "line") }, svg);
      if (i !== n - 1) r.setAttribute("fill", css("--brand")), r.setAttribute("opacity", .35);
      el("text", { x: bx + w / 2, y: H - 6, "text-anchor": "middle" }, svg).textContent = cfg.labels[i];
      r.addEventListener("mousemove", function (e) { showTip(e, cfg.labels[i] + ": " + v + (cfg.unit || "")); });
      r.addEventListener("mouseleave", hideTip);
    });
  }

  function donut(svg, cfg) {
    var S = 180; svg.setAttribute("viewBox", "0 0 " + S + " " + S); svg.innerHTML = "";
    var total = cfg.data.reduce(function (a, b) { return a + b; }, 0), R = 70, r0 = 48, a = -Math.PI / 2;
    cfg.data.forEach(function (v, i) {
      var a2 = a + (v / total) * Math.PI * 2, large = a2 - a > Math.PI ? 1 : 0;
      var p = function (rad, ang) { return (S / 2 + rad * Math.cos(ang)) + " " + (S / 2 + rad * Math.sin(ang)); };
      var path = el("path", { d: "M" + p(R, a) + " A" + R + " " + R + " 0 " + large + " 1 " + p(R, a2) + " L" + p(r0, a2) + " A" + r0 + " " + r0 + " 0 " + large + " 0 " + p(r0, a) + " Z", fill: colorOf(cfg.colors[i]) }, svg);
      path.addEventListener("mousemove", function (e) { showTip(e, cfg.labels[i] + ": " + Math.round(v / total * 100) + "%"); });
      path.addEventListener("mouseleave", hideTip);
      a = a2;
    });
    var t = el("text", { x: S / 2, y: S / 2 - 2, "text-anchor": "middle", style: "font-size:22px;font-weight:750;fill:" + css("--text") }, svg); t.textContent = cfg.center;
    var s = el("text", { x: S / 2, y: S / 2 + 16, "text-anchor": "middle" }, svg); s.textContent = cfg.sub || "";
  }

  function spark(svg, cfg) {
    var W = 120, H = 34; svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("preserveAspectRatio", "none"); svg.innerHTML = "";
    var mx = Math.max.apply(null, cfg.data), mn = Math.min.apply(null, cfg.data), n = cfg.data.length;
    var d = cfg.data.map(function (v, i) { return (i ? "L" : "M") + (i / (n - 1) * W) + " " + (H - 3 - (v - mn) / ((mx - mn) || 1) * (H - 6)); }).join(" ");
    el("path", { d: d, fill: "none", stroke: colorOf(cfg.color || "brand"), "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, svg);
  }

  var kinds = { line: lineChart, bar: barChart, donut: donut, spark: spark };
  function drawAll() {
    document.querySelectorAll("svg[data-chart]").forEach(function (svg) {
      var cfg = JSON.parse(svg.getAttribute("data-chart"));
      kinds[cfg.type](svg, cfg);
    });
  }
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(drawAll, 120); });
  drawAll();

  document.querySelectorAll(".seg[data-range]").forEach(function (seg) {
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var svg = document.getElementById(seg.getAttribute("data-range"));
      var sets = JSON.parse(svg.getAttribute("data-sets")), cfg = JSON.parse(svg.getAttribute("data-chart"));
      var pick = sets[b.getAttribute("data-key")];
      cfg.labels = pick.labels; cfg.series.forEach(function (s, i) { s.data = pick.series[i]; });
      svg.setAttribute("data-chart", JSON.stringify(cfg)); lineChart(svg, cfg);
    });
  });

  /* ---------- Data tables ---------- */
  function pill(status) {
    var map = { Paid: "good", Delivered: "good", Active: "good", "In stock": "good", Shipped: "info", Processing: "warn", Pending: "warn", Draft: "info", "Low stock": "warn", Refunded: "bad", Cancelled: "bad", Overdue: "bad", Inactive: "bad", "Out of stock": "bad" };
    return '<span class="pill ' + (map[status] || "info") + '">' + status + "</span>";
  }
  function initials(n) { return n.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join(""); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  document.querySelectorAll("[data-table]").forEach(function (wrap) {
    var cfg = JSON.parse(document.getElementById(wrap.getAttribute("data-table")).textContent);
    var tbody = wrap.querySelector("tbody"), info = wrap.querySelector("[data-info]"), pager = wrap.querySelector(".pager");
    var search = wrap.querySelector("[data-search]"), filter = wrap.querySelector("[data-filter]");
    var state = { sort: null, dir: 1, page: 0, per: cfg.per || 8, q: "", f: "" };
    var cols = cfg.columns;

    function render() {
      var rows = cfg.rows.filter(function (r) {
        if (state.f && r[cfg.filterKey] !== state.f) return false;
        if (!state.q) return true;
        return cols.some(function (c) { return String(r[c.key]).toLowerCase().indexOf(state.q) > -1; });
      });
      if (state.sort) {
        rows.sort(function (a, b) {
          var x = a[state.sort], y = b[state.sort];
          return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * state.dir;
        });
      }
      var pages = Math.max(1, Math.ceil(rows.length / state.per));
      state.page = Math.min(state.page, pages - 1);
      var slice = rows.slice(state.page * state.per, (state.page + 1) * state.per);
      tbody.innerHTML = slice.length ? slice.map(function (r) {
        return "<tr>" + cols.map(function (c) {
          var v = r[c.key], out;
          if (c.type === "status") out = pill(v);
          else if (c.type === "money") out = money(v, cfg.currency);
          else if (c.type === "user") out = '<span class="cell-user"><span class="avatar">' + initials(v) + "</span><span><b>" + esc(v) + "</b><br><span style=\"color:var(--muted);font-size:12px\">" + esc(r[c.sub] || "") + "</span></span></span>";
          else if (c.type === "link") out = '<a href="' + (c.href || "#") + '">' + esc(v) + "</a>";
          else out = esc(v);
          return '<td class="' + (c.num ? "num" : "") + '">' + out + "</td>";
        }).join("") + "</tr>";
      }).join("") : '<tr><td colspan="' + cols.length + '" class="empty">Nothing matches that search. Try a different word or clear the filter.</td></tr>';
      if (info) info.textContent = rows.length ? "Showing " + (state.page * state.per + 1) + "–" + (state.page * state.per + slice.length) + " of " + rows.length : "No results";
      if (pager) {
        var h = '<button type="button" data-p="prev" ' + (state.page === 0 ? "disabled" : "") + ' aria-label="Previous page">‹</button>';
        for (var i = 0; i < pages; i++) h += '<button type="button" data-p="' + i + '" aria-current="' + (i === state.page) + '">' + (i + 1) + "</button>";
        h += '<button type="button" data-p="next" ' + (state.page >= pages - 1 ? "disabled" : "") + ' aria-label="Next page">›</button>';
        pager.innerHTML = h;
      }
    }
    wrap.querySelectorAll("th[data-sort]").forEach(function (th) {
      th.addEventListener("click", function () {
        var k = th.getAttribute("data-sort");
        state.dir = state.sort === k ? -state.dir : 1; state.sort = k;
        wrap.querySelectorAll("th[data-sort]").forEach(function (o) { o.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", state.dir === 1 ? "ascending" : "descending");
        render();
      });
    });
    if (search) search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); state.page = 0; render(); });
    if (filter) filter.addEventListener("change", function () { state.f = filter.value; state.page = 0; render(); });
    if (pager) pager.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.disabled) return;
      var p = b.getAttribute("data-p");
      state.page = p === "prev" ? state.page - 1 : p === "next" ? state.page + 1 : Number(p);
      render();
    });
    render();
  });

  /* ---------- Global search jumps to the orders table ---------- */
  var gs = document.querySelector("[data-global-search]");
  if (gs) gs.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && gs.value.trim()) location.href = "orders.html?q=" + encodeURIComponent(gs.value.trim());
  });
  var q = new URLSearchParams(location.search).get("q"), local = document.querySelector("[data-search]");
  if (q && local) { local.value = q; local.dispatchEvent(new Event("input")); }

  /* ---------- Forms ---------- */
  var toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast);
  function say(msg) { toast.textContent = msg; toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 2200); }
  document.querySelectorAll("form[data-save]").forEach(function (f) {
    f.addEventListener("submit", function (e) { e.preventDefault(); say(f.getAttribute("data-save")); });
  });
  document.querySelectorAll("form[data-login]").forEach(function (f) {
    f.addEventListener("submit", function (e) { e.preventDefault(); location.href = "index.html"; });
  });
  document.querySelectorAll("[data-toast]").forEach(function (b) {
    b.addEventListener("click", function () { say(b.getAttribute("data-toast")); });
  });
  document.querySelectorAll("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
})();
