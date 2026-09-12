"use strict";

importScripts("device-presets.js", "window-sizing.js", "window-motion.js");
const busyWindows = new Set();
const sizing = globalThis.viewportWindowSizing;
const presets = globalThis.viewportDevicePresets;
const motion = globalThis.viewportWindowMotion;
const originalKey = (id) => `viewport-original-${id}`;
const mobileKey = (id) => `viewport-mobile-${id}`;

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
    chrome.storage.session.get([originalKey(window.id), mobileKey(tab.id)]),
    chrome.commands.getAll(),
  ]);
  return {
    ok: true,
    current: { width: metrics.width, height: metrics.height },
    available: sizing.capacity(window, metrics, zoom),
    canRestore: Boolean(
      stored[originalKey(window.id)] || stored[mobileKey(tab.id)],
    ),
    isMobilePreview: Boolean(stored[mobileKey(tab.id)]),
    windowType: window.type,
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
    if (attempt === 0) {
      await motion.animate({
        from: context.window,
        to: next,
        reducedMotion: context.metrics.reducedMotion,
        update: (bounds) => chrome.windows.update(tab.windowId, bounds),
      });
    } else await chrome.windows.update(tab.windowId, next);
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
  const mobile = (await chrome.storage.session.get(mobileKey(tab.id)))[
    mobileKey(tab.id)
  ];
  if (mobile) return returnToBrowser(tab, mobile);
  const key = originalKey(tab.windowId);
  const stored = (await chrome.storage.session.get(key))[key];
  if (stored) {
    let context = await current(tab);
    if (context.window.state !== "normal") {
      await chrome.windows.update(tab.windowId, { state: "normal" });
      await new Promise((resolve) => setTimeout(resolve, 150));
      context = await current(tab);
    }
    await motion.animate({
      from: context.window,
      to: {
        left: stored.left,
        top: stored.top,
        width: stored.width,
        height: stored.height,
      },
      reducedMotion: context.metrics.reducedMotion,
      update: (bounds) => chrome.windows.update(tab.windowId, bounds),
    });
    if (stored.state === "maximized")
      await chrome.windows.update(tab.windowId, { state: "maximized" });
    await chrome.storage.session.remove(key);
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
  return state(tab);
}

async function openMobile(tab, message) {
  const device = presets.devices.find((entry) => entry.id === message.deviceId);
  if (
    !device ||
    !["phone", "tablet"].includes(device.type) ||
    typeof message.rotated !== "boolean"
  )
    throw new Error("Choose a phone or tablet for the mobile window.");
  const context = await current(tab);
  if (context.window.state === "fullscreen")
    throw new Error("Exit fullscreen to open a mobile window.");
  sizing.bounds(
    context.window,
    context.metrics,
    context.zoom,
    presets.dimensions(device, message.rotated),
  );
  if (context.window.type === "popup") return resize(tab, message);
  const stored = await chrome.storage.session.get([
    originalKey(tab.windowId),
    mobileKey(tab.id),
  ]);
  if (!stored[mobileKey(tab.id)]) {
    const { left, top, width, height, state } = context.window;
    await chrome.storage.session.set({
      [mobileKey(tab.id)]: {
        windowId: tab.windowId,
        index: tab.index,
        incognito: context.window.incognito,
        bounds: stored[originalKey(tab.windowId)] || {
          left,
          top,
          width,
          height,
          state,
        },
      },
    });
  }
  // Moving the live tab keeps navigation, forms and JS state. If it was the
  // original window's last tab Chrome closes that window; Return recreates it.
  const popup = await chrome.windows.create({
    tabId: tab.id,
    type: "popup",
    incognito: context.window.incognito,
    focused: true,
    left: context.window.left,
    top: context.window.top,
    width: context.window.width,
    height: context.window.height,
  });
  if (!Number.isInteger(popup?.id))
    throw new Error(
      "Couldn’t open a mobile window. Use Restore to return to the browser.",
    );
  busyWindows.add(popup.id);
  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return await resize(await chrome.tabs.get(tab.id), message);
  } finally {
    busyWindows.delete(popup.id);
  }
}

async function returnToBrowser(tab, mobile) {
  let destination = await chrome.windows.get(mobile.windowId).catch(() => null);
  if (
    destination &&
    destination.id !== tab.windowId &&
    busyWindows.has(destination.id)
  )
    throw new Error(
      "The original browser window is resizing. Try again in a moment.",
    );
  let lockedId = null;
  try {
    if (destination) {
      if (destination.id !== tab.windowId) {
        lockedId = destination.id;
        busyWindows.add(lockedId);
        await chrome.tabs.move(tab.id, {
          windowId: destination.id,
          index: mobile.index,
        });
      }
    } else {
      destination = await chrome.windows.create({
        tabId: tab.id,
        type: "normal",
        incognito: mobile.incognito,
        focused: true,
        left: mobile.bounds.left,
        top: mobile.bounds.top,
        width: mobile.bounds.width,
        height: mobile.bounds.height,
      });
      if (!Number.isInteger(destination?.id))
        throw new Error("Couldn’t restore the browser window.");
      lockedId = destination.id;
      busyWindows.add(lockedId);
    }
    // Save recovery bounds before removing the mobile record, so a failed
    // native restore remains recoverable after moving the tab back.
    await chrome.storage.session.set({
      [originalKey(destination.id)]: mobile.bounds,
    });
    await chrome.storage.session.remove(mobileKey(tab.id));
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(destination.id, { focused: true });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const result = await restore(await chrome.tabs.get(tab.id));
    return { ...result, returnedToBrowser: true };
  } finally {
    if (lockedId !== null) busyWindows.delete(lockedId);
  }
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
    "viewport:mobile": openMobile,
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

chrome.tabs.onRemoved.addListener((id) => {
  void chrome.storage.session.remove(mobileKey(id)).catch(() => {});
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
