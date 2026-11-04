(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Currency toggle ---------- */
  var currencyButtons = document.querySelectorAll("[data-currency]");
  function setCurrency(cur) {
    document.querySelectorAll(".price[data-usd]").forEach(function (el) {
      el.textContent = el.getAttribute("data-" + cur);
    });
    document.querySelectorAll("[data-paylink-usd]").forEach(function (el) {
      var link = el.getAttribute("data-paylink-" + cur);
      if (link && link.indexOf("https://") === 0) el.setAttribute("href", link);
    });
    currencyButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-currency") === cur ? "true" : "false");
    });
    try { localStorage.setItem("pk-currency", cur); } catch (e) {}
  }
  currencyButtons.forEach(function (b) {
    b.addEventListener("click", function () { setCurrency(b.getAttribute("data-currency")); });
  });
  var saved = null;
  try { saved = localStorage.getItem("pk-currency"); } catch (e) {}
  if (!saved) {
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    saved = tz === "Asia/Manila" ? "php" : "usd";
  }
  if (currencyButtons.length) setCurrency(saved);

  /* ---------- Checkout (ProfetaKit Cloudflare Worker) ---------- */
  // Set this to your Worker's address after you deploy it, e.g. "https://profetakit.yourname.workers.dev"
  var STORE_API = "https://profetakit-store.kunlun-dafreta-1.workers.dev";
  window.PK_STORE_API = STORE_API;
  document.querySelectorAll("[data-buy]").forEach(function (btn) {
    var err = btn.parentElement.querySelector(".buy-error");
    btn.addEventListener("click", function () {
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = "Opening checkout…";
      if (err) err.hidden = true;
      fetch(STORE_API + "/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: btn.getAttribute("data-buy") })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.url) { window.location.href = j.url; return; }
        throw new Error(j.error || "Checkout could not start.");
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = label;
        if (err) { err.textContent = (e && e.message ? e.message : "Checkout could not start.") + " Try again in a moment."; err.hidden = false; }
      });
    });
  });

  /* ---------- Particle kit stage ---------- */
  var canvas = document.getElementById("kit-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var tabs = document.querySelectorAll(".stage-tabs [data-shape]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var INK = "#15172E", BLUE = "#3D5AFE", MINT = "#22C993", YELLOW = "#E8A900";
  var palettes = [
    [INK, INK, MINT, MINT, BLUE],
    [INK, INK, BLUE, BLUE, MINT],
    [INK, INK, BLUE, YELLOW, YELLOW]
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
