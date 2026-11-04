(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Local pricing ----------
     Visitors in the Philippines see pesos; everyone else sees US dollars.
     The country comes from the store Worker (Cloudflare knows it from the connection).
     Until that answers, we guess from the device's time zone and language. */
  var STORE_API_GEO = "https://profetakit-store.kunlun-dafreta-1.workers.dev";
  function applyCurrency(cur) {
    document.documentElement.setAttribute("data-currency", cur);
    document.querySelectorAll(".price[data-usd]").forEach(function (el) {
      el.textContent = el.getAttribute("data-" + cur);
    });
  }
  function guessFromDevice() {
    var tz = "", langs = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    langs = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    return tz === "Asia/Manila" || /(^|,)(fil|tl)(-|,|$)|-ph(,|$)/.test(langs) ? "php" : "usd";
  }
  var cached = null;
  try { cached = sessionStorage.getItem("pk-cur"); } catch (e) {}
  applyCurrency(cached || guessFromDevice());
  if (!cached && window.fetch) {
    fetch(STORE_API_GEO + "/geo").then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.country) return;
      var cur = j.country === "PH" ? "php" : "usd";
      try { sessionStorage.setItem("pk-cur", cur); } catch (e) {}
      applyCurrency(cur);
    }).catch(function () {});
  }

  /* ---------- Checkout (ProfetaKit Cloudflare Worker) ---------- */
  // Set this to your Worker's address after you deploy it, e.g. "https://profetakit.yourname.workers.dev"
  var STORE_API = "https://profetakit-store.kunlun-dafreta-1.workers.dev";
  window.PK_STORE_API = STORE_API;
  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-buy]");
    if (!btn) return;
    var err = btn.parentElement.querySelector(".buy-error");
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = "Opening checkout…";
    if (err) err.hidden = true;
    fetch(STORE_API + "/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: btn.getAttribute("data-buy") })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.url) { window.location.href = j.url; return; }
      if (j.detail) console.error("ProfetaKit checkout:", j.detail);
      throw new Error((j.error || "Checkout could not start.") + (j.detail ? " (" + j.detail + ")" : ""));
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = label;
      if (err) { err.textContent = (e && e.message ? e.message : "Checkout could not start.") + " Try again in a moment."; err.hidden = false; }
    });
  });

  /* ---------- No right-click or image dragging ---------- */
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("dragstart", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });

  /* ---------- Header shadow on scroll ---------- */
  var top = document.querySelector(".top");
  if (top) {
    var onScroll = function () { top.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- Gallery + lightbox ---------- */
  var lb = document.createElement("div");
  lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Preview");
  lb.innerHTML = '<button class="ql-close" type="button" aria-label="Close preview">×</button><button class="gallery-nav prev" type="button" aria-label="Previous image">‹</button><img alt=""><button class="gallery-nav next" type="button" aria-label="Next image">›</button><p class="lightbox-cap"></p>';
  document.body.appendChild(lb);
  var lbState = { items: [], i: 0 };
  function lbShow() {
    var it = lbState.items[lbState.i];
    lb.querySelector("img").src = it.src; lb.querySelector("img").alt = it.cap;
    lb.querySelector(".lightbox-cap").textContent = (lbState.i + 1) + " / " + lbState.items.length + " · " + it.cap;
  }
  function lbOpen(items, i) { lbState = { items: items, i: i }; lbShow(); lb.classList.add("open"); lb.querySelector(".ql-close").focus(); }
  function lbClose() { lb.classList.remove("open"); }
  lb.addEventListener("click", function (e) {
    if (e.target.closest(".prev")) { lbState.i = (lbState.i - 1 + lbState.items.length) % lbState.items.length; lbShow(); }
    else if (e.target.closest(".next")) { lbState.i = (lbState.i + 1) % lbState.items.length; lbShow(); }
    else if (e.target.closest(".ql-close") || e.target === lb) lbClose();
  });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") lbClose();
    if (e.key === "ArrowLeft") lb.querySelector(".prev").click();
    if (e.key === "ArrowRight") lb.querySelector(".next").click();
  });

  function mountGallery(root, items) {
    if (!root || !items || !items.length) return;
    var i = 0;
    root.innerHTML = '<div class="gallery-main"><img alt=""><button class="gallery-nav prev" type="button" aria-label="Previous image">‹</button><button class="gallery-nav next" type="button" aria-label="Next image">›</button></div><p class="gallery-cap"></p><div class="thumbs" role="list"></div>';
    var main = root.querySelector(".gallery-main img"), cap = root.querySelector(".gallery-cap"), th = root.querySelector(".thumbs");
    th.innerHTML = items.map(function (it, k) { return '<button type="button" role="listitem" data-k="' + k + '" aria-label="Show ' + it.cap.replace(/"/g, "") + '"><img src="' + it.src + '" alt="" loading="lazy"></button>'; }).join("");
    function show(k) {
      i = (k + items.length) % items.length;
      main.src = items[i].src; main.alt = items[i].cap; cap.textContent = items[i].cap + "  ·  " + (i + 1) + " of " + items.length;
      th.querySelectorAll("button").forEach(function (b, n) { b.setAttribute("aria-current", n === i ? "true" : "false"); });
    }
    root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-k]");
      if (t) return show(Number(t.getAttribute("data-k")));
      if (e.target.closest(".prev")) return show(i - 1);
      if (e.target.closest(".next")) return show(i + 1);
      var gm = e.target.closest(".gallery-main"); if (gm && !gm._swiped) lbOpen(items, i);
    });
    if (items.length < 2) root.querySelectorAll(".gallery-nav").forEach(function (b) { b.hidden = true; });
    show(0);
  }
  window.PK_mountGallery = mountGallery;
  var ppg = document.querySelector("[data-gallery]");
  if (ppg) mountGallery(ppg, JSON.parse(ppg.getAttribute("data-gallery")));

  /* ---------- Store: categories, search, sort ---------- */
  var grid = document.querySelector("[data-store]");
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
    var state = { cat: "all", q: "", sort: "featured" };
    var empty = grid.querySelector(".empty");
    var priceOf = function (c) { return Number(c.getAttribute("data-price")); };
    function apply() {
      var shown = 0;
      var sorted = cards.slice().sort(function (a, b) {
        if (state.sort === "low") return priceOf(a) - priceOf(b);
        if (state.sort === "high") return priceOf(b) - priceOf(a);
        return Number(a.getAttribute("data-order")) - Number(b.getAttribute("data-order"));
      });
      sorted.forEach(function (c) {
        var ok = (state.cat === "all" || c.getAttribute("data-cat") === state.cat) &&
                 (!state.q || c.getAttribute("data-search").indexOf(state.q) > -1);
        c.hidden = !ok; if (ok) shown++;
        grid.insertBefore(c, empty);
      });
      empty.hidden = shown > 0;
    }
    document.querySelectorAll(".cat").forEach(function (b) {
      b.addEventListener("click", function () {
        state.cat = b.getAttribute("data-cat");
        document.querySelectorAll(".cat").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        apply();
      });
    });
    var s = document.querySelector("[data-store-search]");
    if (s) s.addEventListener("input", function () { state.q = s.value.trim().toLowerCase(); apply(); });
    var so = document.querySelector("[data-store-sort]");
    if (so) so.addEventListener("change", function () { state.sort = so.value; apply(); });
    var hashCat = (location.hash.match(/cat=(\w+)/) || [])[1];
    if (hashCat) { var hb = document.querySelector('.cat[data-cat="' + hashCat + '"]'); if (hb) hb.click(); }

    /* Quick look */
    var data = JSON.parse(document.getElementById("catalog-data").textContent);
    var dlg = document.getElementById("quicklook");
    grid.addEventListener("click", function (e) {
      var q = e.target.closest("[data-quick]"); if (!q) return;
      e.preventDefault();
      var p = data[q.getAttribute("data-quick")];
      var cur = document.documentElement.getAttribute("data-currency") || "usd";
      dlg.querySelector(".ql-info").innerHTML =
        '<p class="pp-cat" data-cat="' + p.cat + '">' + p.catLabel + '</p><h3>' + p.name + '</h3><p class="lede" style="color:var(--soft)">' + p.sub + '</p>' +
        '<div class="chips">' + p.formats.map(function (f) { return "<span>" + f + "</span>"; }).join("") + '</div>' +
        '<ul>' + p.inside.slice(0, 5).map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul>' +
        '<p class="price" data-usd="' + p.usd + '" data-php="' + p.php + '">' + (cur === "php" ? p.php : p.usd) + '</p>' +
        '<div style="display:grid;gap:.6rem">' + (p.gumroad ? '<a class="btn btn-cobalt btn-block" href="' + p.gumroad + '" target="_blank" rel="noopener">Buy on Gumroad</a><p class="buy-note" style="margin:0">Card or PayPal, charged in USD.</p>' : '<button type="button" class="btn btn-cobalt btn-block" data-buy="' + p.slug + '">Buy now</button><p class="buy-error" role="alert" hidden></p>') +
        '<a class="btn btn-ghost btn-block" href="' + p.slug + '.html">See full details</a></div>';
      mountGallery(dlg.querySelector(".ql-gallery"), p.previews);
      if (dlg.showModal) dlg.showModal(); else location.href = p.slug + ".html";
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest(".ql-close")) dlg.close(); });
  }

  /* ---------- 3D hero scene ---------- */
  var rig = document.querySelector(".rig");
  if (rig && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var target = { x: 14, y: -22 }, cur3 = { x: 14, y: -22 }, hovering = false, t0h = performance.now();
    var hero = document.querySelector(".hero");
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      target.y = -22 + px * 26; target.x = 14 - py * 18; hovering = true;
    });
    hero.addEventListener("pointerleave", function () { hovering = false; });
    var heroVisible = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; }).observe(hero);
    (function tick(now) {
      if (heroVisible) {
        if (!hovering) { var t = (now - t0h) / 1000; target.y = -22 + Math.sin(t * 0.5) * 9; target.x = 14 + Math.cos(t * 0.4) * 4; }
        cur3.x += (target.x - cur3.x) * 0.06; cur3.y += (target.y - cur3.y) * 0.06;
        rig.style.setProperty("--rx", cur3.x.toFixed(2) + "deg"); rig.style.setProperty("--ry", cur3.y.toFixed(2) + "deg");
      }
      requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ---------- Hero search, quick tags, search shortcuts ---------- */
  function searchStore(q) {
    var input = document.querySelector("[data-store-search]");
    if (!input) { location.href = "./#store"; return; }
    var all = document.querySelector('.cat[data-cat="all"]'); if (all) all.click();
    input.value = q; input.dispatchEvent(new Event("input"));
    document.getElementById("store").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  var hs = document.querySelector("[data-hero-search]");
  if (hs) hs.addEventListener("submit", function (e) { e.preventDefault(); searchStore(hs.querySelector("input").value.trim().toLowerCase()); });
  document.querySelectorAll("[data-tag]").forEach(function (b) {
    b.addEventListener("click", function () { var i = hs && hs.querySelector("input"); if (i) i.value = b.textContent; searchStore(b.getAttribute("data-tag")); });
  });
  document.querySelectorAll("[data-focus-search]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var input = document.querySelector("[data-store-search]");
      if (!input) return;
      e.preventDefault();
      document.getElementById("store").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { input.focus({ preventScroll: true }); }, 450);
    });
  });
  /* tab bar: mark the current tab */
  (function () {
    var tabs = document.querySelectorAll(".tabbar a"); if (!tabs.length) return;
    var onHome = !!document.querySelector(".hero");
    function mark() {
      var key = !onHome ? "shop" : (location.hash === "#faq" ? "help" : (window.scrollY > (document.getElementById("store") || { offsetTop: 9e9 }).offsetTop - 200 ? "shop" : "home"));
      tabs.forEach(function (t) { if (t.getAttribute("data-tab") === key) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
    }
    window.addEventListener("scroll", mark, { passive: true }); window.addEventListener("hashchange", mark); mark();
  })();

  /* swipe between gallery images on touch screens */
  document.addEventListener("touchstart", function (e) {
    var g = e.target.closest(".gallery-main, .lightbox"); if (!g) return;
    g._sx = e.touches[0].clientX; g._sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    var g = e.target.closest(".gallery-main, .lightbox"); if (!g || g._sx == null) return;
    var dx = e.changedTouches[0].clientX - g._sx, dy = e.changedTouches[0].clientY - g._sy; g._sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      var btn = g.querySelector(dx < 0 ? ".next" : ".prev"); if (btn) { g._swiped = true; btn.click(); setTimeout(function () { g._swiped = false; }, 50); }
    }
  }, { passive: true });

  /* ---------- Particle kit stage ---------- */
  var canvas = document.getElementById("kit-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var tabs = document.querySelectorAll(".stage-tabs [data-shape]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var INK = "#F2F4FF", BLUE = "#6F86FF", MINT = "#2BD49A", YELLOW = "#FFD54A", CORAL = "#FF7A57", VIOLET = "#A28CFF";
  var palettes = [
    [INK, INK, MINT, MINT, BLUE],
    [INK, INK, BLUE, BLUE, VIOLET],
    [INK, VIOLET, VIOLET, YELLOW, CORAL]
  ];

  var S = 400; // drawing space for shapes
  function drawShape(c, i) {
    c.clearRect(0, 0, S, S);
    c.fillStyle = "#000";
    c.strokeStyle = "#000";
    c.lineCap = "round";
    c.lineJoin = "round";
    if (i === 0) {
      // Budget tracker: spreadsheet header + rising bars + trend line
      c.lineWidth = 10;
      roundRect(c, 60, 60, 280, 270, 22); c.stroke();
      c.lineWidth = 8;
      line(c, 60, 110, 340, 110);
      line(c, 150, 60, 150, 110);
      line(c, 245, 60, 245, 110);
      var bars = [70, 110, 150, 195];
      for (var b = 0; b < 4; b++) {
        c.fillRect(95 + b * 60, 300 - bars[b], 34, bars[b]);
      }
      c.lineWidth = 9;
      c.beginPath(); c.moveTo(95, 205); c.lineTo(170, 175); c.lineTo(230, 160); c.lineTo(305, 120); c.stroke();
    } else if (i === 1) {
      // Dashboard: frame, sidebar, KPI tiles, line chart
      c.lineWidth = 10;
      roundRect(c, 40, 70, 320, 250, 22); c.stroke();
      c.fillRect(40, 70, 70, 250);
      for (var k = 0; k < 3; k++) { roundRect(c, 130 + k * 75, 95, 60, 50, 10); c.fill(); }
      c.lineWidth = 9;
      c.beginPath(); c.moveTo(135, 290); c.lineTo(175, 240); c.lineTo(215, 262); c.lineTo(255, 200); c.lineTo(295, 222); c.lineTo(335, 175); c.stroke();
    } else {
      // Starter kit: </>
      c.font = "800 210px 'Bricolage Grotesque', sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("</>", S / 2, S / 2 + 6);
    }
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }

  var off = document.createElement("canvas");
  off.width = S; off.height = S;
  var octx = off.getContext("2d", { willReadFrequently: true });

  var width = 0, height = 0, dpr = 1, N = 700;
  var particles = [], shapes = [], current = 0;
  var mouse = { x: -9999, y: -9999 };

  function sampleShape(i) {
    drawShape(octx, i);
    var data = octx.getImageData(0, 0, S, S).data;
    var pts = [];
    for (var y = 0; y < S; y += 4) {
      for (var x = 0; x < S; x += 4) {
        if (data[(y * S + x) * 4 + 3] > 128) pts.push([x, y]);
      }
    }
    // pick exactly N points, spread evenly
    var out = [];
    for (var n = 0; n < N; n++) {
      var p = pts[Math.floor((n / N) * pts.length + Math.random() * (pts.length / N))] || pts[n % pts.length];
      out.push(p);
    }
    // shuffle so particles travel to new places when morphing
    for (var j = out.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)); var t = out[j]; out[j] = out[r]; out[r] = t; }
    return out;
  }

  function buildShapes() {
    shapes = [sampleShape(0), sampleShape(1), sampleShape(2)];
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setTargets(current, true);
  }

  function mapPoint(p) {
    var scale = Math.min(width, height) * 0.82 / S;
    var ox = (width - S * scale) / 2;
    var oy = (height - S * scale) / 2 - height * 0.04;
    return [ox + p[0] * scale, oy + p[1] * scale];
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * width, y: Math.random() * height,
        vx: 0, vy: 0, tx: 0, ty: 0,
        size: 1.6 + Math.random() * 1.6,
        color: INK, phase: Math.random() * Math.PI * 2
      });
    }
  }

  function setTargets(i, keepColor) {
    current = i;
    var pts = shapes[i];
    var pal = palettes[i];
    for (var n = 0; n < particles.length; n++) {
      var m = mapPoint(pts[n]);
      particles[n].tx = m[0];
      particles[n].ty = m[1];
      if (!keepColor || particles[n].color === INK) particles[n].color = pal[n % pal.length];
    }
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", Number(t.getAttribute("data-shape")) === i ? "true" : "false");
    });
  }

  var t0 = performance.now();
  function step(now) {
    var t = (now - t0) / 1000;
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var wobX = Math.cos(t * 1.3 + p.phase) * 0.6;
      var wobY = Math.sin(t * 1.1 + p.phase) * 0.6;
      var dx = p.tx + wobX - p.x, dy = p.ty + wobY - p.y;
      p.vx += dx * 0.045; p.vy += dy * 0.045;
      var mx = p.x - mouse.x, my = p.y - mouse.y, d2 = mx * mx + my * my;
      if (d2 < 5000) {
        var f = (5000 - d2) / 5000 * 2.2;
        var d = Math.sqrt(d2) || 1;
        p.vx += (mx / d) * f; p.vy += (my / d) * f;
      }
      p.vx *= 0.82; p.vy *= 0.82;
      p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(function (p) {
      p.x = p.tx; p.y = p.ty;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
  }

  var running = false, visible = true, autoTimer = null, userPicked = false;
  function loop(now) {
    if (!running) return;
    step(now);
    requestAnimationFrame(loop);
  }
  function start() {
    if (reduce || running || !visible) return;
    running = true; requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  function scheduleAuto() {
    clearInterval(autoTimer);
    if (reduce || userPicked) return;
    autoTimer = setInterval(function () { setTargets((current + 1) % 3); }, 4200);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      userPicked = true; clearInterval(autoTimer);
      setTargets(Number(t.getAttribute("data-shape")));
      if (reduce) drawStatic();
    });
  });

  canvas.parentElement.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener("pointerleave", function () { mouse.x = -9999; mouse.y = -9999; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); if (reduce) drawStatic(); }, 150);
  });

  function boot() {
    N = window.innerWidth < 640 ? 460 : 720;
    buildShapes();
    var rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    initParticles();
    resize();
    setTargets(0);
    if (reduce) { drawStatic(); return; }
    start();
    scheduleAuto();
  }

  // wait for the display font so the </> shape uses it
  if (document.fonts && document.fonts.load) {
    document.fonts.load("800 210px 'Bricolage Grotesque'").then(boot, boot);
  } else {
    boot();
  }
})();
