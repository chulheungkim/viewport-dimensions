(() => {
  "use strict";

  function validMetrics(value) {
    return (
      value &&
      typeof value === "object" &&
      ["width", "height", "availWidth", "availHeight"].every(
        (key) =>
          Number.isFinite(value[key]) && value[key] > 0 && value[key] <= 100000,
      ) &&
      ["availLeft", "availTop"].every((key) => Number.isFinite(value[key]))
    );
  }

  function capacity(window, metrics, zoom) {
    const frameWidth = Math.max(0, window.width - metrics.width * zoom);
    const frameHeight = Math.max(0, window.height - metrics.height * zoom);
    return {
      width: Math.max(0, Math.floor((metrics.availWidth - frameWidth) / zoom)),
      height: Math.max(
        0,
        Math.floor((metrics.availHeight - frameHeight) / zoom),
      ),
      frameWidth,
      frameHeight,
    };
  }

  function bounds(window, metrics, zoom, target) {
    const available = capacity(window, metrics, zoom);
    if (target.width > available.width)
      throw new Error("This device is wider than the available display.");
    const width = Math.min(
      metrics.availWidth,
      Math.round(target.width * zoom + available.frameWidth),
    );
    const height = Math.min(
      metrics.availHeight,
      Math.round(target.height * zoom + available.frameHeight),
    );
    return {
      width,
      height,
      left: Math.round(
        Math.max(
          metrics.availLeft,
          Math.min(window.left, metrics.availLeft + metrics.availWidth - width),
        ),
      ),
      top: Math.round(
        Math.max(
          metrics.availTop,
          Math.min(window.top, metrics.availTop + metrics.availHeight - height),
        ),
      ),
    };
  }

  globalThis.viewportWindowSizing = Object.freeze({
    validMetrics,
    capacity,
    bounds,
  });
})();
