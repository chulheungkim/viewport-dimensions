(() => {
  "use strict";
  const presets = globalThis.viewportDevicePresets;
  const paths = {
    phone:
      '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M10 5h4m-3 14h2"/>',
    tablet:
      '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 19h2"/>',
    laptop:
      '<rect x="4" y="3" width="16" height="13" rx="1.5"/><path d="M2 20h20l-2-4H4z"/>',
    monitor:
      '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-4 0h8"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    rotate: '<path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/>',
    restore: '<path d="M4 11a8 8 0 1 1 1 7M4 5v6h6"/>',
    arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
    frame:
      '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6"/><path d="M8 12h8m-4-4v8"/>',
  };
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths[name] || paths.frame;
    return svg;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  globalThis.createViewportToolbar = ({ position, onOpen, onClose }) => {
    let host = null;
    let shadow = null;
    let ui = null;
    let previousFocus = null;
    let category = "phone";
    let selectedId = null;
    let rotated = false;
    let legacyOnly = false;
    let query = "";
    let state = null;
    let busy = false;
    let revision = 0;
    let refreshTimer = null;
    let currentPosition = position;

    function selected() {
      return presets.devices.find((device) => device.id === selectedId);
    }
    function status(text, error = false) {
      if (!ui) return;
      ui.status.textContent = text;
      ui.status.dataset.error = String(error);
    }
    function updatePreview() {
      if (!ui) return;
      const device = selected();
      const rotatable = category === "phone" || category === "tablet";
      ui.rotate.hidden = !rotatable;
      ui.rotate.setAttribute("aria-pressed", String(rotated));
      ui.apply.disabled = busy || !device || !state || state.fullscreen;
      ui.restore.disabled = busy || !state?.canRestore;
      ui.applyText.textContent = busy ? "Resizing…" : "Apply viewport";
      ui.drawing.hidden = !device;
      ui.previewSize.textContent = device
        ? `${presets.dimensions(device, rotated).width} × ${presets.dimensions(device, rotated).height}`
        : "No device";
      ui.previewName.textContent = device?.name || "Try another category";
      ui.previewDetail.textContent = device
        ? `${device.detail} · CSS px`
        : "Only reachable widths appear.";
      if (!device) return;
      const size = presets.dimensions(device, rotated);
      if (state && size.height > state.available.height)
        ui.previewDetail.textContent += ` · Height fits ${state.available.height} px`;
      const scale = Math.min(
        (ui.drawing.clientWidth - 40) / size.width,
        (ui.drawing.clientHeight - 38) / size.height,
      );
      ui.silhouette.style.width = `${Math.max(10, size.width * scale)}px`;
      ui.silhouette.style.height = `${Math.max(10, size.height * scale)}px`;
      ui.silhouette.dataset.type = category;
      ui.widthGuide.textContent = String(size.width);
    }
    function select(id) {
      selectedId = id;
      for (const button of ui.list.querySelectorAll(".device")) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.id === selectedId),
        );
      }
      updatePreview();
      const device = selected();
      if (device && state) {
        status(
          presets.dimensions(device, rotated).height > state.available.height
            ? `Device height exceeds this display; height will fit the available ${state.available.height} px.`
            : "Resize the browser to this device’s CSS dimensions.",
        );
      }
    }
    function renderList() {
      if (!ui) return;
      const devices = presets.filter({
        type: category,
        maxWidth: state?.available.width ?? 0,
        query,
        legacyOnly,
        rotated,
      });
      if (!devices.some((device) => device.id === selectedId))
        selectedId = devices[0]?.id || null;
      const scrollTop = ui.list.scrollTop;
      ui.list.replaceChildren();
      for (const brand of ["Apple", "Samsung", "Standard"]) {
        const group = devices.filter((device) => device.brand === brand);
        if (!group.length) continue;
        ui.list.append(
          element(
            "div",
            "group",
            brand === "Standard" ? "Display standards" : brand,
          ),
        );
        for (const device of group) {
          const button = element("button", "device");
          button.type = "button";
          button.dataset.id = device.id;
          button.setAttribute("aria-pressed", String(selectedId === device.id));
          const text = element("span", "device-text");
          const size = presets.dimensions(device, rotated);
          const dimensions = element(
            "span",
            "device-size",
            `${size.width} × ${size.height}`,
          );
          if (device.legacy)
            dimensions.append(element("span", "legacy-tag", "Legacy"));
          text.append(element("span", "device-name", device.name), dimensions);
          button.append(
            icon(device.type),
            text,
            element("span", "device-check", "✓"),
          );
          button.addEventListener("click", () => select(device.id));
          button.addEventListener("focus", () => select(device.id));
          ui.list.append(button);
        }
      }
      if (!devices.length) {
        const empty = element("div", "empty");
        empty.append(
          element(
            "strong",
            "",
            state ? "No matching devices" : "Reading your viewport…",
          ),
        );
        empty.append(
          document.createTextNode(
            state
              ? query || legacyOnly
                ? "Try another search or turn off the Legacy filter."
                : `These devices need more than ${state.available.width} px of available width. Try another category or a wider display.`
              : "Available devices will appear here.",
          ),
        );
        ui.list.append(empty);
      }
      ui.list.scrollTop = scrollTop;
      ui.count.textContent = state
        ? `${devices.length} devices · up to ${state.available.width} px wide`
        : "Checking available space…";
      updatePreview();
    }
    function updateState(next) {
      state = next;
      ui.live.textContent = `${next.current.width} × ${next.current.height}`;
      ui.shortcut.textContent = next.shortcut;
      renderList();
      if (next.fullscreen)
        status("Exit fullscreen to resize the browser.", true);
    }
    async function refresh() {
      if (!host || busy) return;
      const request = ++revision;
      try {
        const next = await chrome.runtime.sendMessage({
          type: "viewport:state",
        });
        if (!host || request !== revision) return;
        if (!next?.ok)
          throw new Error(next?.error || "Couldn’t read the viewport.");
        updateState(next);
      } catch (error) {
        if (host && request === revision)
          status(
            error instanceof Error
              ? error.message
              : "Refresh this page to reconnect the extension.",
            true,
          );
      }
    }
    async function apply(type) {
      if (busy || (type === "viewport:resize" && !selected())) return;
      busy = true;
      const request = ++revision;
      updatePreview();
      status(
        type === "viewport:restore"
          ? "Restoring the original window…"
          : "Resizing the browser…",
      );
      try {
        const next = await chrome.runtime.sendMessage({
          type,
          deviceId: selectedId,
          rotated,
        });
        if (!host || request !== revision) return;
        if (!next?.ok)
          throw new Error(next?.error || "Couldn’t resize the window.");
        updateState(next);
        const actual = `${next.current.width} × ${next.current.height}`;
        if (!next.target) status(`Original window restored · ${actual} px.`);
        else if (
          next.current.width === next.target.width &&
          next.current.height === next.target.height
        )
          status(`Viewport applied · ${actual} CSS px.`);
        else
          status(
            `Browser limit: actual ${actual} px; requested ${next.target.width} × ${next.target.height} px.`,
            true,
          );
      } catch (error) {
        if (host && request === revision)
          status(
            error instanceof Error
              ? error.message
              : "Couldn’t resize the window.",
            true,
          );
      } finally {
        if (request === revision) {
          busy = false;
          updatePreview();
        }
      }
    }
    function close(restoreFocus = true) {
      if (!host) return;
      revision += 1;
      clearTimeout(refreshTimer);
      host.remove();
      host = null;
      shadow = null;
      ui = null;
      busy = false;
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
      onClose();
      if (restoreFocus && previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
    function outside(event) {
      if (!event.composedPath().includes(host)) close(false);
    }
    function escape(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    function open() {
      previousFocus = document.activeElement;
      onOpen();
      host = document.createElement("div");
      host.setAttribute("data-viewport-dimensions-toolbar", "");
      for (const [key, value] of Object.entries({
        all: "initial",
        position: "fixed",
        inset: "0",
        display: "block",
        "pointer-events": "none",
        "z-index": "2147483647",
        width: "auto",
        height: "auto",
        margin: "0",
        padding: "0",
        border: "0",
        transform: "none",
        opacity: "1",
        visibility: "visible",
        background: "transparent",
        animation: "none",
        transition: "none",
        "color-scheme": "light dark",
      }))
        host.style.setProperty(key, value, "important");
      shadow = host.attachShadow({ mode: "closed" });
      const stylesheet = new CSSStyleSheet();
      stylesheet.replaceSync(globalThis.viewportToolbarStyles);
      shadow.adoptedStyleSheets = [stylesheet];
      const panel = element("section", "panel");
      panel.dataset.position = currentPosition;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Viewport device toolbar");
      // This static template contains no page content or stored values.
      panel.innerHTML = `
        <header class="top"><span class="mark"></span><div class="brand"><h2>Viewport Dimensions</h2><div class="eyebrow">A little perspective.</div></div><div class="live"><span class="dot"></span><span id="live"></span></div><button class="icon-button" id="close" aria-label="Close toolbar" title="Close (Escape)"></button></header>
        <nav class="tabs" role="tablist" aria-label="Device type"></nav>
        <div class="filters"><label class="search"><input id="search" type="search" placeholder="Find a device…" aria-label="Find a device" autocomplete="off" spellcheck="false"></label><button class="chip" id="legacy" aria-pressed="false" title="Show only legacy testing devices">Legacy</button></div>
        <div class="workspace"><div class="list" id="devices" role="tabpanel" aria-label="Phones"></div><aside class="preview" aria-label="Device dimension preview"><div class="preview-label"><span class="eyebrow">Preview</span><button class="icon-button" id="rotate" aria-label="Rotate device" aria-pressed="false" title="Rotate device"></button></div><div class="drawing"><div class="silhouette"><span class="width-guide"></span></div></div><div class="preview-size"></div><div class="preview-name"></div><div class="preview-detail"></div></aside></div>
        <div class="bottom"><div class="actions"><button class="restore" id="restore"><span>Restore window</span></button><button class="apply" id="apply"><span id="apply-text">Apply viewport</span></button></div><p class="status" role="status" aria-live="polite">Choose a device to preview its dimensions.</p></div>
        <footer class="footnote"><span id="count"></span><span class="shortcut"><kbd id="shortcut"></kbd> to toggle</span></footer>`;
      const find = (selector) => panel.querySelector(selector);
      ui = {
        panel,
        list: find(".list"),
        search: find("#search"),
        live: find("#live"),
        rotate: find("#rotate"),
        drawing: find(".drawing"),
        silhouette: find(".silhouette"),
        widthGuide: find(".width-guide"),
        previewSize: find(".preview-size"),
        previewName: find(".preview-name"),
        previewDetail: find(".preview-detail"),
        apply: find("#apply"),
        applyText: find("#apply-text"),
        restore: find("#restore"),
        status: find(".status"),
        count: find("#count"),
        shortcut: find("#shortcut"),
      };
      find(".mark").append(icon("frame"));
      find(".search").prepend(icon("search"));
      find("#close").append(icon("close"));
      ui.rotate.append(icon("rotate"));
      ui.restore.prepend(icon("restore"));
      ui.apply.append(icon("arrow"));
      const names = ["Phones", "Tablets", "Laptops", "Monitors"];
      presets.types.forEach((type, index) => {
        const tab = element("button", "tab");
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", "devices");
        tab.setAttribute("aria-selected", String(category === type));
        tab.tabIndex = category === type ? 0 : -1;
        tab.append(icon(type), document.createTextNode(names[index]));
        tab.addEventListener("click", () => {
          category = type;
          rotated = false;
          for (const other of find(".tabs").children) {
            other.setAttribute("aria-selected", String(other === tab));
            other.tabIndex = other === tab ? 0 : -1;
          }
          ui.list.setAttribute("aria-label", names[index]);
          ui.list.scrollTop = 0;
          renderList();
          status("Choose a device to preview its dimensions.");
        });
        tab.addEventListener("keydown", (event) => {
          const offset = {
            ArrowRight: 1,
            ArrowLeft: -1,
            Home: -index,
            End: 3 - index,
          }[event.key];
          if (offset === undefined) return;
          event.preventDefault();
          const next = find(".tabs").children[(index + offset + 4) % 4];
          next.click();
          next.focus();
        });
        find(".tabs").append(tab);
      });
      ui.search.value = query;
      ui.search.addEventListener("input", () => {
        query = ui.search.value;
        renderList();
      });
      const legacy = find("#legacy");
      legacy.setAttribute("aria-pressed", String(legacyOnly));
      legacy.addEventListener("click", () => {
        legacyOnly = !legacyOnly;
        legacy.setAttribute("aria-pressed", String(legacyOnly));
        renderList();
      });
      ui.rotate.addEventListener("click", () => {
        rotated = !rotated;
        renderList();
        if (selected()) select(selectedId);
      });
      ui.list.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        const buttons = [...ui.list.querySelectorAll("button")];
        const index = buttons.indexOf(shadow.activeElement);
        if (index < 0) return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : Math.max(
                  0,
                  Math.min(
                    buttons.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                );
        buttons[next]?.focus();
      });
      find("#close").addEventListener("click", () => close());
      ui.apply.addEventListener("click", () => void apply("viewport:resize"));
      ui.restore.addEventListener(
        "click",
        () => void apply("viewport:restore"),
      );
      shadow.append(panel);
      document.documentElement.append(host);
      state = null;
      renderList();
      ui.live.textContent = `${window.innerWidth} × ${window.innerHeight}`;
      ui.search.focus({ preventScroll: true });
      document.addEventListener("pointerdown", outside, true);
      document.addEventListener("keydown", escape, true);
      void refresh();
    }
    return {
      toggle() {
        if (host) close();
        else open();
      },
      close,
      isOpen() {
        return Boolean(host);
      },
      setPosition(next) {
        currentPosition = next;
        if (ui) ui.panel.dataset.position = next;
      },
      resize() {
        if (!host) return;
        ui.live.textContent = `${window.innerWidth} × ${window.innerHeight}`;
        updatePreview();
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refresh, 180);
      },
      destroy() {
        close(false);
        clearTimeout(refreshTimer);
      },
    };
  };
})();
