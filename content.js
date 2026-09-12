(() => {
  "use strict";

  if (window !== window.top) return;
  globalThis.disposeViewportDisplay?.();

  const preferences = globalThis.viewportDimensionsPreferences;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const exitDuration = 160;
  let host = null;
  let anchor = null;
  let label = null;
  let disposed = false;
  let storageRevision = 0;

  function size() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  const view = {
    mount(position) {
      host = document.createElement("div");
      host.setAttribute("data-viewport-dimensions-overlay", "");
      host.setAttribute("aria-hidden", "true");
      // Shadow DOM isolates the contents; important host styles resist page resets.
      const styles = {
        all: "initial",
        position: "fixed",
        inset: "0",
        width: "auto",
        height: "auto",
        display: "block",
        margin: "0",
        padding: "0",
        border: "0",
        background: "transparent",
        overflow: "visible",
        visibility: "visible",
        opacity: "1",
        transform: "none",
        transition: "none",
        animation: "none",
        "pointer-events": "none",
        "z-index": "2147483647",
        "color-scheme": "normal",
      };
      for (const [property, value] of Object.entries(styles)) {
        host.style.setProperty(property, value, "important");
      }

      const shadow = host.attachShadow({ mode: "closed" });
      const stylesheet = new CSSStyleSheet();
      stylesheet.replaceSync(`
        .anchor {
          all: initial;
          position: absolute;
          pointer-events: none;
        }
        .anchor[data-position^="top-"] { top: 12px; --offset: -5px; }
        .anchor[data-position^="bottom-"] { bottom: 12px; --offset: 5px; }
        .anchor[data-position$="-left"] { left: 12px; }
        .anchor[data-position$="-right"] { right: 12px; }
        .anchor[data-position$="-center"] { left: 50%; transform: translateX(-50%); }
        .label {
          all: initial;
          display: block;
          box-sizing: border-box;
          padding: 7px 10px;
          border: 1px solid #ffffff30;
          border-radius: 8px;
          background: #17191ef2;
          color: #ffffff;
          font: 600 12px/1.25 system-ui, sans-serif;
          font-variant-numeric: tabular-nums;
          direction: ltr;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          box-shadow: 0 2px 8px #00000025;
          opacity: 0;
          transform: translateY(var(--offset));
          transition: opacity ${exitDuration}ms ease-in, transform ${exitDuration}ms ease-in;
        }
        .label.visible {
          opacity: 1;
          transform: translateY(0);
          transition-duration: 180ms;
          transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .label, .label.visible { transition: none; transform: none; }
        }
      `);
      shadow.adoptedStyleSheets = [stylesheet];
      anchor = document.createElement("div");
      anchor.className = "anchor";
      anchor.dataset.position = position;
      label = document.createElement("span");
      label.className = "label";
      label.addEventListener("transitionend", (event) => {
        if (event.propertyName === "opacity") controller.finishExit();
      });
      anchor.append(label);
      shadow.append(anchor);
      document.documentElement.append(host);
      // Establish the hidden frame once; subsequent updates never force layout.
      label.getBoundingClientRect();
    },
    position(position) {
      if (anchor) anchor.dataset.position = position;
    },
    update({ width, height }) {
      if (label) label.textContent = `${width} × ${height} px`;
      if (host && !host.isConnected) document.documentElement.append(host);
    },
    show() {
      // CSS transitions reverse from the current paint if resizing resumes mid-exit.
      label?.classList.add("visible");
    },
    hide() {
      label?.classList.remove("visible");
      // transitionend owns normal removal. This fallback handles missing events
      // when a page removes the host or Chrome skips a transition.
      return reducedMotion.matches ? 0 : exitDuration + 100;
    },
    unmount() {
      host?.remove();
      host = null;
      anchor = null;
      label = null;
    },
  };

  const controller = globalThis.createViewportResizeController({
    view,
    clock: {
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (timer) => window.clearTimeout(timer),
    },
    initialSize: size(),
    settings: preferences.defaults,
  });

  function onResize() {
    if (document.hidden) return;
    // Cancel a pending exit in this event, before a queued removal can run.
    controller.resize(size());
  }

  function suspend() {
    controller.suspend(size());
  }

  function onStorageChanged(changes, area) {
    if (area !== "local" || !Object.hasOwn(changes, preferences.storageKey))
      return;
    storageRevision += 1;
    controller.configure(
      preferences.normalize(changes[preferences.storageKey].newValue),
    );
  }

  // Register first so a popup save cannot be overwritten by an older async read.
  chrome.storage.onChanged.addListener(onStorageChanged);
  chrome.storage.local
    .get(preferences.storageKey)
    .then((stored) => {
      if (!disposed && storageRevision === 0) {
        controller.configure(
          preferences.normalize(stored[preferences.storageKey]),
        );
      }
    })
    .catch(() => {
      // Defaults remain usable if extension storage is temporarily unavailable.
    });

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", suspend);
  document.addEventListener("visibilitychange", suspend);

  // Reinjection within the same extension world replaces listeners and pending work.
  globalThis.disposeViewportDisplay = () => {
    disposed = true;
    suspend();
    controller.destroy();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", suspend);
    window.removeEventListener("pageshow", suspend);
    document.removeEventListener("visibilitychange", suspend);
    chrome.storage.onChanged.removeListener(onStorageChanged);
  };
})();
