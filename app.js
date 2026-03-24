(function () {
  const root = document.documentElement;
  const BODY = document.body;
  const MODE_KEY = "blox-ui-mode";
  const LEGACY_KEY = "blox-ui-scale";
  const MODES = ["auto", "1x"];

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function detectAnimationLevel() {
    const reduce = prefersReducedMotion();
    if (reduce) return "low";
    const cpu = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const lowEnd = cpu <= 4 || mem <= 4;
    return lowEnd ? "medium" : "high";
  }

  const ANIMATION_LEVEL = detectAnimationLevel();
  root.setAttribute("data-animation-level", ANIMATION_LEVEL);

  function createRafThrottle(fn) {
    let queued = false;
    let lastArg = null;
    return function throttled(arg) {
      lastArg = arg;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn(lastArg);
      });
    };
  }

  function initMicroInteractions() {
    if (window.AnimationUtils && typeof window.AnimationUtils.pressEffect === "function") {
      window.AnimationUtils.pressEffect(
        "button, .quick-action-btn, .account-bulk-btn, .ui-scale-btn, .tracked-th-filter-btn"
      );
    }
  }

  function initPointerGlow() {
    if (prefersReducedMotion()) return;
    root.style.setProperty("--pointer-x", "50%");
    root.style.setProperty("--pointer-y", "38%");

    const onMove = createRafThrottle((e) => {
      if (!e) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      root.style.setProperty("--pointer-x", x.toFixed(2) + "%");
      root.style.setProperty("--pointer-y", y.toFixed(2) + "%");
    });

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener(
      "touchmove",
      createRafThrottle((e) => {
        const t = e && e.touches && e.touches[0];
        if (!t) return;
        onMove({ clientX: t.clientX, clientY: t.clientY });
      }),
      { passive: true }
    );
  }

  function initAurora() {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;
    if (prefersReducedMotion() || ANIMATION_LEVEL === "low") {
      canvas.remove();
      BODY.classList.add("ambient-lite");
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const sourceBlobs = [
      { r: 0.44, c0: "rgba(34, 211, 238, 0.24)", c1: "rgba(34, 211, 238, 0.04)", ox: 0.1, oy: 0.32, sx: 0.9, sy: 0.55, px: 0.31, py: 0.27 },
      { r: 0.4, c0: "rgba(167, 139, 250, 0.28)", c1: "rgba(167, 139, 250, 0.05)", ox: 0.75, oy: 0.2, sx: 0.85, sy: 0.58, px: 0.39, py: 0.31 },
      { r: 0.36, c0: "rgba(244, 114, 182, 0.18)", c1: "rgba(244, 114, 182, 0.03)", ox: 0.42, oy: 0.65, sx: 0.78, sy: 0.52, px: 0.28, py: 0.22 },
      { r: 0.34, c0: "rgba(56, 189, 248, 0.16)", c1: "rgba(56, 189, 248, 0.03)", ox: 0.9, oy: 0.52, sx: 0.68, sy: 0.46, px: 0.35, py: 0.2 },
      { r: 0.3, c0: "rgba(251, 191, 36, 0.1)", c1: "rgba(251, 191, 36, 0.02)", ox: 0.22, oy: 0.8, sx: 0.58, sy: 0.42, px: 0.25, py: 0.18 },
    ];
    let blobs = ANIMATION_LEVEL === "medium" ? sourceBlobs.slice(0, 3) : sourceBlobs;
    let targetFps = ANIMATION_LEVEL === "high" ? 60 : 36;
    let frameBudget = 1000 / targetFps;

    let w = 0;
    let h = 0;
    let t = 0;
    let running = true;
    let rafId = 0;
    let lastTs = 0;
    let lowFpsStreak = 0;

    function resize() {
      const dprCap = ANIMATION_LEVEL === "high" ? 2 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function paintBlobs(time) {
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < blobs.length; i += 1) {
        const b = blobs[i];
        const x = w * (b.ox + b.sx * 0.065 * Math.sin(time * b.px + b.oy * 6));
        const y = h * (b.oy + b.sy * 0.055 * Math.cos(time * b.py + b.ox * 5));
        const rad = Math.max(w, h) * b.r * (1 + 0.035 * Math.sin(time * 0.72 + b.ox * 4));
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, b.c0);
        g.addColorStop(0.55, b.c1);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function draw(ts) {
      if (!running) return;
      if (document.hidden) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      if (ts - lastTs < frameBudget) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const delta = ts - lastTs || frameBudget;
      lastTs = ts;
      const currentFps = 1000 / delta;
      if (currentFps < 26) lowFpsStreak += 1;
      else lowFpsStreak = Math.max(0, lowFpsStreak - 1);

      // Auto quality fallback based on runtime FPS.
      if (lowFpsStreak > 35 && blobs.length > 2) {
        blobs = blobs.slice(0, blobs.length - 1);
        targetFps = Math.max(24, targetFps - 6);
        frameBudget = 1000 / targetFps;
        lowFpsStreak = 0;
        root.setAttribute("data-animation-level", "low");
      }

      t += 0.0075;
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, w, h);
      paintBlobs(t);
      rafId = requestAnimationFrame(draw);
    }

    resize();
    rafId = requestAnimationFrame(draw);
    window.addEventListener("resize", createRafThrottle(resize), { passive: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        running = !document.hidden;
        if (running && !rafId) rafId = requestAnimationFrame(draw);
      },
      { passive: true }
    );
  }

  function initProgressiveEnhancement() {
    if (prefersReducedMotion()) {
      BODY.classList.add("reduced-motion");
      return;
    }
    if (ANIMATION_LEVEL === "low") {
      BODY.classList.add("ambient-lite");
      const stars = document.querySelector(".shooting-stars");
      if (stars) stars.style.display = "none";
    } else if (ANIMATION_LEVEL === "medium") {
      const stars = document.querySelectorAll(".shooting-star");
      for (let i = 10; i < stars.length; i += 1) {
        stars[i].style.display = "none";
      }
    }
  }

  function initViewportAnimations() {
    if (window.ViewportObserver && typeof window.ViewportObserver.observeReveal === "function") {
      window.ViewportObserver.observeReveal({
        selector: ".reveal, .reveal-stagger",
        threshold: 0.08,
      });
    }
  }

  function initPageTransition() {
    root.classList.add("page-ready");
    if (window.AnimationUtils && typeof window.AnimationUtils.animateIn === "function") {
      window.AnimationUtils.animateIn(document.querySelector(".app-shell"), "slideUp");
    }
  }

  function initSmoothAnchors() {
    if (prefersReducedMotion()) return;
    document.addEventListener("click", (e) => {
      const link = e.target.closest && e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    });
  }

  function modeToScale(mode) {
    if (mode === "auto") return 0.75;
    return 1;
  }

  function migrateLegacyScale() {
    try {
      const mode = localStorage.getItem(MODE_KEY);
      if (mode === "2x" || mode === "3x") return "1x";
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw == null) return null;
      const s = parseFloat(raw);
      if (Number.isNaN(s)) return null;
      if (s <= 0.82) return "auto";
      return "1x";
    } catch (_) {
      return null;
    }
  }

  function initUiScale() {
    const buttons = document.querySelectorAll("button[data-ui-mode]");
    if (!buttons.length) return;

    function setActive(mode) {
      if (mode === "2x" || mode === "3x") mode = "1x";
      if (!MODES.includes(mode)) mode = "1x";
      const scale = modeToScale(mode);
      root.style.fontSize = 16 * scale + "px";
      root.setAttribute("data-ui-scale", mode);
      buttons.forEach((btn) => {
        const on = btn.getAttribute("data-ui-mode") === mode;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      try {
        localStorage.setItem(MODE_KEY, mode);
        localStorage.removeItem(LEGACY_KEY);
      } catch (_) {}
      window.dispatchEvent(new Event("resize"));
    }

    let initial = "1x";
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "2x" || saved === "3x") {
        initial = "1x";
      } else if (saved && MODES.includes(saved)) {
        initial = saved;
      } else {
        const mig = migrateLegacyScale();
        if (mig) initial = mig;
      }
    } catch (_) {}
    setActive(initial);

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.getAttribute("data-ui-mode")));
    });
  }

  initProgressiveEnhancement();
  initPointerGlow();
  initAurora();
  initUiScale();
  initMicroInteractions();
  initViewportAnimations();
  initPageTransition();
  initSmoothAnchors();

  window.AppPerf = {
    ANIMATION_LEVEL,
  };
})();
