"use strict";

importScripts("device-presets.js", "window-sizing.js");
const busyWindows = new Set();
const sizing = globalThis.viewportWindowSizing;
const presets = globalThis.viewportDevicePresets;
const originalKey = (id) => `viewport-original-${id}`;

async function current(tab) {
  const [window, metrics, zoom] = await Promise.all([
    chrome.windows.get(tab.windowId),
    chrome.tabs.sendMessage(
      tab.id,
      { type: "viewport:measure" },
      { frameId: 0 },
    ),
    chrome.tabs.getZoom(tab.id),
  ]);
  if (!sizing.validMetrics(metrics) || !Number.isFinite(zoom) || zoom <= 0)
    throw new Error("Couldn’t measure this page. Refresh it and try again.");
  return { window, metrics, zoom };
}

async function state(tab) {
  const { window, metrics, zoom } = await current(tab);
  const [stored, commands] = await Promise.all([
    chrome.storage.session.get(originalKey(window.id)),
    chrome.commands.getAll(),
  ]);
  return {
    ok: true,
    current: { width: metrics.width, height: metrics.height },
    available: sizing.capacity(window, metrics, zoom),
    canRestore: Boolean(stored[originalKey(window.id)]),
    fullscreen: window.state === "fullscreen",
    shortcut:
      commands.find((command) => command.name === "toggle-toolbar")?.shortcut ||
      "Set in extension shortcuts",
  };
}

async function resize(tab, message) {
  const device = presets.devices.find((entry) => entry.id === message.deviceId);
  if (!device || typeof message.rotated !== "boolean")
    throw new Error("Choose a valid device.");
  let context = await current(tab);
  if (context.window.state === "fullscreen")
    throw new Error("Exit fullscreen to resize the browser.");
  const target = presets.dimensions(device, message.rotated);
  // Validate reachability before storing or changing the window.
  sizing.bounds(context.window, context.metrics, context.zoom, target);
  const key = originalKey(tab.windowId);
  const stored = await chrome.storage.session.get(key);
  if (!stored[key]) {
    const { left, top, width, height, state } = context.window;
    await chrome.storage.session.set({
      [key]: { left, top, width, height, state },
    });
  }
  if (context.window.state !== "normal") {
    await chrome.windows.update(tab.windowId, { state: "normal" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    context = await current(tab);
  }
  // Re-measure after native resizing: browser frames, zoom rounding and OS
  // minimum sizes can prevent the first requested bounds from matching.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = sizing.bounds(
      context.window,
      context.metrics,
      context.zoom,
      target,
    );
    await chrome.windows.update(tab.windowId, next);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const measured = await current(tab);
    const matches =
      measured.metrics.width === target.width &&
      measured.metrics.height === target.height;
    const unchanged =
      measured.metrics.width === context.metrics.width &&
      measured.metrics.height === context.metrics.height;
    context = measured;
    if (matches || unchanged) break;
  }
  return { ...(await state(tab)), target, deviceId: device.id };
}

async function restore(tab) {
  const key = originalKey(tab.windowId);
  const stored = (await chrome.storage.session.get(key))[key];
  if (stored) {
    const window = await chrome.windows.get(tab.windowId);
    if (window.state !== "normal")
      await chrome.windows.update(tab.windowId, { state: "normal" });
    await chrome.windows.update(tab.windowId, {
      left: stored.left,
      top: stored.top,
      width: stored.width,
      height: stored.height,
    });
    if (stored.state === "maximized")
      await chrome.windows.update(tab.windowId, { state: "maximized" });
    await chrome.storage.session.remove(key);
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
  return state(tab);
}

async function toggleActive() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id)
    return { ok: false, error: "Open a website to use the toolbar." };
  try {
    await chrome.tabs.sendMessage(
      tab.id,
      { type: "viewport:toggle" },
      { frameId: 0 },
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Open an HTTP or HTTPS website and refresh the page to use the toolbar.",
    };
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-toolbar") void toggleActive().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message || typeof message !== "object") return;
  if (
    message.type === "viewport:open-active" &&
    !sender.tab &&
    sender.id === chrome.runtime.id
  ) {
    toggleActive().then(respond, () =>
      respond({ ok: false, error: "Couldn’t open the toolbar." }),
    );
    return true;
  }
  const actions = {
    "viewport:state": state,
    "viewport:resize": resize,
    "viewport:restore": restore,
  };
  if (
    !Object.hasOwn(actions, message.type) ||
    !sender.tab?.id ||
    sender.frameId !== 0
  )
    return;
  const tab = sender.tab;
  const mutating = message.type !== "viewport:state";
  if (mutating && busyWindows.has(tab.windowId)) {
    respond({
      ok: false,
      error: "A resize is in progress. Try again in a moment.",
    });
    return;
  }
  if (mutating) busyWindows.add(tab.windowId);
  actions[message.type](tab, message)
    .then(respond, (error) =>
      respond({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Couldn’t resize this window.",
      }),
    )
    .finally(() => {
      if (mutating) busyWindows.delete(tab.windowId);
    });
  return true;
});

chrome.windows.onRemoved.addListener((id) => {
  void chrome.storage.session.remove(originalKey(id)).catch(() => {});
});

// Moving a window between displays need not resize the page. Refresh capacity
// on committed native bounds changes as well as content resize events.
chrome.windows.onBoundsChanged.addListener((window) => {
  chrome.tabs
    .query({ active: true, windowId: window.id })
    .then(
      ([tab]) =>
        tab?.id &&
        chrome.tabs.sendMessage(
          tab.id,
          { type: "viewport:bounds-changed" },
          { frameId: 0 },
        ),
    )
    .catch(() => {});
});
