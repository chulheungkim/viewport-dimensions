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
    pagesEnabled: false,
    pageUrls: Object.freeze([]),
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

  function normalizePageUrl(value) {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value.trim());
      if (!["http:", "https:"].includes(url.protocol)) return null;
      const path =
        url.pathname.length > 1 && url.pathname.endsWith("/")
          ? url.pathname.slice(0, -1)
          : url.pathname;
      return `${url.origin}${path}`;
    } catch {
      return null;
    }
  }

  function normalizePageUrls(value) {
    const entries = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/\r?\n/)
        : [];
    return [
      ...new Set(
        entries.map(normalizePageUrl).filter((entry) => entry !== null),
      ),
    ];
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
      pagesEnabled:
        typeof settings.pagesEnabled === "boolean"
          ? settings.pagesEnabled
          : defaults.pagesEnabled,
      pageUrls: normalizePageUrls(settings.pageUrls),
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
    if (settings.localhostEnabled && isLocalhost(url.hostname)) {
      const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
      if (
        settings.localhostPorts.length === 0 ||
        settings.localhostPorts.includes(port)
      )
        return true;
    }
    return (
      settings.pagesEnabled &&
      settings.pageUrls.includes(normalizePageUrl(url.href))
    );
  }

  globalThis.viewportDimensionsPreferences = Object.freeze({
    storageKey: "viewportDisplay",
    positions,
    defaults,
    normalize,
    normalizePorts,
    normalizePageUrls,
    isActiveUrl,
  });
})();
