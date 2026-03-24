(function () {
  function observeReveal(options) {
    const targetSelector = options && options.selector ? options.selector : ".reveal, .reveal-stagger";
    const visibleClass = options && options.visibleClass ? options.visibleClass : "reveal-visible";
    const root = options && options.root ? options.root : null;
    const rootMargin = options && options.rootMargin ? options.rootMargin : "0px 0px -24px 0px";
    const threshold = options && typeof options.threshold === "number" ? options.threshold : 0.08;

    const items = Array.from(document.querySelectorAll(targetSelector));
    if (!items.length) return { disconnect: function () {} };

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add(visibleClass));
      return { disconnect: function () {} };
    }

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(visibleClass);
          io.unobserve(entry.target);
        });
      },
      { root: root, rootMargin: rootMargin, threshold: threshold }
    );

    items.forEach(function (el) {
      io.observe(el);
    });

    return {
      disconnect: function () {
        io.disconnect();
      },
    };
  }

  window.ViewportObserver = {
    observeReveal: observeReveal,
  };
})();
