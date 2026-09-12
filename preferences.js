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
  const defaults = Object.freeze({
    position: "top-right",
    hideDelayMs: 2000,
    localhostEnabled: true,
    localhostPorts: Object.freeze([]),
    externalPagesEnabled: false,
  });

  function normalizePorts(value) {
    const entries = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[\s,]+/)
        : [];
    return [...new Set(entries.map(Number))]
      .filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535)
      .sort((left, right) => left - right);
  }

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
      localhostEnabled:
        typeof settings.localhostEnabled === "boolean"
          ? settings.localhostEnabled
          : defaults.localhostEnabled,
      localhostPorts: normalizePorts(settings.localhostPorts),
      externalPagesEnabled:
        typeof settings.externalPagesEnabled === "boolean"
          ? settings.externalPagesEnabled
          : defaults.externalPagesEnabled,
    };
  }

  function isLocalhost(hostname) {
    return (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]"
    );
  }

  function isActiveUrl(value, settingsValue) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const settings = normalize(settingsValue);
    if (isLocalhost(url.hostname)) {
      if (!settings.localhostEnabled) return false;
      const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
      return (
        settings.localhostPorts.length === 0 ||
        settings.localhostPorts.includes(port)
      );
    }
    return settings.externalPagesEnabled;
  }

  globalThis.viewportDimensionsPreferences = Object.freeze({
    storageKey: "viewportDisplay",
    positions,
    defaults,
    normalize,
    normalizePorts,
    isActiveUrl,
  });
})();
