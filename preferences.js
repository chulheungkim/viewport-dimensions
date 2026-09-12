(() => {
  "use strict";

  const positions = Object.freeze([
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]);
  const defaults = Object.freeze({ position: "top-right", hideDelayMs: 2000 });

  function normalize(value) {
    const settings = value && typeof value === "object" ? value : {};
    return {
      position: positions.includes(settings.position)
        ? settings.position
        : defaults.position,
      hideDelayMs:
        Number.isFinite(settings.hideDelayMs) &&
        settings.hideDelayMs >= 1000 &&
        settings.hideDelayMs <= 10000
          ? settings.hideDelayMs
          : defaults.hideDelayMs,
    };
  }

  globalThis.viewportDimensionsPreferences = Object.freeze({
    storageKey: "viewportDisplay",
    positions,
    defaults,
    normalize,
  });
})();
