(function () {
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function animateIn(el, type) {
    if (!el) return;
    if (prefersReducedMotion()) {
      el.classList.add("is-visible");
      return;
    }
    if (type === "slideUp") {
      el.classList.add("anim-slide-up");
    } else {
      el.classList.add("anim-fade-in");
    }
    requestAnimationFrame(() => el.classList.add("is-visible"));
  }

  function pressEffect(selector) {
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => {
      node.addEventListener("pointerdown", () => node.classList.add("is-pressed"), { passive: true });
      const clear = () => node.classList.remove("is-pressed");
      node.addEventListener("pointerup", clear, { passive: true });
      node.addEventListener("pointerleave", clear, { passive: true });
      node.addEventListener("pointercancel", clear, { passive: true });
    });
  }

  window.AnimationUtils = {
    prefersReducedMotion,
    animateIn,
    pressEffect,
  };
})();
