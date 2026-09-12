(() => {
  "use strict";

  const properties = ["left", "top", "width", "height"];
  const defaultDuration = 300;
  const frameInterval = 1000 / 60;

  function interpolate(from, to, progress) {
    const t = Math.max(0, Math.min(1, progress));
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    return Object.fromEntries(
      properties.map((key) => [
        key,
        Math.round(from[key] + (to[key] - from[key]) * eased),
      ]),
    );
  }

  // Native window bounds cannot use a CSS transition. Await each update to
  // avoid overlapping OS requests, and use elapsed time rather than frame count
  // so slow updates skip ahead instead of lengthening the animation.
  async function animate({
    from,
    to,
    update,
    reducedMotion = false,
    now = () => performance.now(),
    wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
    duration = defaultDuration,
  }) {
    if (properties.every((key) => from[key] === to[key])) return;
    if (reducedMotion || duration <= 0) {
      await update(to);
      return;
    }
    const start = now();
    let previous = from;
    while (true) {
      await wait(frameInterval);
      const progress = Math.min(1, (now() - start) / duration);
      const next = progress === 1 ? to : interpolate(from, to, progress);
      if (
        progress === 1 ||
        properties.some((key) => previous[key] !== next[key])
      ) {
        await update(next);
        previous = next;
      }
      if (progress === 1) return;
    }
  }

  globalThis.viewportWindowMotion = Object.freeze({ interpolate, animate });
})();
