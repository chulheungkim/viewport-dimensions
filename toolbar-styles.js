(() => {
  "use strict";
  globalThis.viewportToolbarStyles = `
    :host { color-scheme: light dark; }
    *, *::before, *::after { box-sizing: border-box; }
    .panel {
      --surface: light-dark(#fdfdfc, #202124);
      --soft: light-dark(#f3f3f1, #292a2e);
      --line: light-dark(#e7e7e3, #3b3c40);
      --ink: light-dark(#252621, #f0f0ed);
      --muted: light-dark(#74776e, #a7aaa1);
      --accent: light-dark(#45624d, #afc6ad);
      --selected: light-dark(#edf2eb, #303d32);
      position: absolute; width: min(560px, calc(100vw - 24px));
      max-height: calc(100dvh - 24px); display: flex; flex-direction: column;
      background: var(--surface); color: var(--ink); border: 1px solid var(--line);
      border-radius: 18px; box-shadow: 0 24px 80px #00000024, 0 4px 16px #00000012;
      font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: normal; text-align: left; direction: ltr; pointer-events: auto;
      overflow: hidden; animation: arrive 180ms cubic-bezier(.2,.8,.2,1);
    }
    .panel[data-position^="top-"] { top: 12px; }
    .panel[data-position^="bottom-"] { bottom: 12px; }
    .panel[data-position$="-left"] { left: 12px; }
    .panel[data-position$="-right"] { right: 12px; }
    .panel[data-position$="-center"] { left: 50%; transform: translateX(-50%); }
    button, input { font: inherit; color: inherit; }
    button { cursor: pointer; }
    button:disabled { opacity: .5; cursor: default; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    button { -webkit-tap-highlight-color: transparent; }
    svg { width: 18px; height: 18px; display: block; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .top { display: flex; align-items: center; gap: 10px; padding: 17px 18px 14px; flex-shrink: 0; }
    .mark { padding: 7px; background: var(--soft); border: 1px solid var(--line); border-radius: 10px; }
    .brand { flex: 1; }
    h2 { margin: 0; font-size: 13px; letter-spacing: -.2px; font-weight: 650; }
    .eyebrow { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }
    .live { display: flex; align-items: center; gap: 7px; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
    .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
    .icon-button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; background: transparent; border-radius: 7px; color: var(--muted); }
    .icon-button:hover { color: var(--ink); background: var(--soft); }
    .tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; padding: 4px; margin: 0 18px 14px; background: var(--soft); border-radius: 10px; flex-shrink: 0; }
    .tab { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 35px; padding: 6px 4px; border: 1px solid transparent; background: transparent; border-radius: 7px; color: var(--muted); font-size: 11px; font-weight: 550; }
    .tab svg { width: 15px; height: 15px; }
    .tab:hover { color: var(--ink); }
    .tab[aria-selected="true"] { background: var(--surface); color: var(--ink); border-color: var(--line); box-shadow: 0 1px 3px #00000008; }
    .filters { display: flex; gap: 8px; padding: 0 18px 14px; flex-shrink: 0; }
    .search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; padding: 0 9px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); }
    .search svg { width: 15px; height: 15px; }
    .search input { border: 0; outline-offset: 0; background: transparent; min-width: 0; width: 100%; height: 33px; font-size: 12px; }
    .search input::placeholder { color: var(--muted); }
    .search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent); }
    .search input:focus-visible { outline: none; }
    .chip { border: 1px solid var(--line); border-radius: 8px; background: transparent; padding: 5px 10px; font-size: 11px; white-space: nowrap; }
    .chip[aria-pressed="true"] { background: var(--selected); border-color: var(--accent); color: var(--accent); }
    .workspace { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); display: grid; grid-template-columns: minmax(0, 1fr) 196px; min-height: 0; }
    .list { padding: 8px; overflow-y: auto; overscroll-behavior: contain; height: 292px; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
    .group { font-size: 10px; text-transform: uppercase; letter-spacing: .9px; color: var(--muted); padding: 9px 9px 5px; }
    .device { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; padding: 10px 9px; background: transparent; border: 1px solid transparent; border-radius: 9px; min-height: 56px; }
    .device:hover { background: var(--soft); }
    .device[aria-pressed="true"] { background: var(--selected); border-color: color-mix(in srgb, var(--accent) 18%, transparent); }
    .device > svg { width: 17px; color: var(--muted); }
    .device[aria-pressed="true"] > svg { color: var(--accent); }
    .device-text { flex: 1; min-width: 0; }
    .device-name { display: block; font-weight: 550; font-size: 12px; line-height: 1.4; }
    .device-size { display: flex; align-items: center; gap: 7px; font: 10px/1.8 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); margin-top: 2px; }
    .legacy-tag { font: 9px/1.4 -apple-system, sans-serif; border: 1px solid var(--line); padding: 0 4px; border-radius: 3px; }
    .device-check { font-size: 12px; color: var(--accent); opacity: 0; }
    .device[aria-pressed="true"] .device-check { opacity: 1; }
    .preview { background: var(--soft); border-left: 1px solid var(--line); padding: 17px 14px 14px; display: flex; flex-direction: column; align-items: center; min-width: 0; }
    .preview-label { align-self: stretch; display: flex; justify-content: space-between; align-items: center; }
    .preview-label .icon-button { width: 23px; height: 23px; }
    .preview-label svg { width: 14px; height: 14px; }
    .drawing { height: 152px; width: 100%; display: grid; place-items: center; padding: 20px 17px 15px; }
    .silhouette { position: relative; border: 1.5px solid var(--muted); border-radius: 11px; background: var(--surface); box-shadow: inset 0 0 0 3px var(--soft), 0 4px 6px #00000006; }
    .silhouette::after { content: ''; position: absolute; width: 21%; height: 3px; top: 5px; left: 39.5%; border-radius: 4px; background: var(--line); }
    .silhouette[data-type="tablet"] { border-radius: 7px; }
    .silhouette[data-type="laptop"], .silhouette[data-type="monitor"] { border-radius: 4px; }
    .silhouette[data-type="laptop"]::after { top: auto; bottom: -5px; left: -8%; width: 116%; height: 4px; background: var(--muted); }
    .silhouette[data-type="monitor"]::after { top: auto; bottom: -12px; left: 37%; width: 26%; height: 11px; border-radius: 0 0 3px 3px; background: var(--muted); }
    .width-guide { position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); color: var(--muted); font: 9px ui-monospace, monospace; }
    .preview-size { font: 16px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: -.7px; margin: 5px 0 3px; }
    .preview-name { font-size: 11px; text-align: center; font-weight: 600; }
    .preview-detail { font-size: 10px; text-align: center; color: var(--muted); margin-top: 4px; }
    .empty { padding: 32px 14px; color: var(--muted); text-align: center; font-size: 12px; }
    .empty strong { display: block; color: var(--ink); font-weight: 550; margin-bottom: 7px; }
    .bottom { padding: 13px 18px 14px; flex-shrink: 0; }
    .actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .restore { border: 0; background: transparent; color: var(--muted); font-size: 11px; padding: 8px 0; display: flex; align-items: center; gap: 5px; }
    .restore svg { width: 13px; height: 13px; }
    .apply { border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: var(--surface); padding: 8px 13px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 10px; min-height: 34px; }
    .apply:hover:not(:disabled) { filter: brightness(1.1); }
    .apply svg { width: 14px; height: 14px; }
    .status { margin: 10px 0 0; color: var(--muted); font-size: 10px; min-height: 15px; }
    .status[data-error="true"] { color: light-dark(#a33d32, #f6a395); }
    .footnote { display: flex; justify-content: space-between; gap: 8px; border-top: 1px solid var(--line); padding: 9px 18px; font-size: 9px; color: var(--muted); background: var(--soft); flex-shrink: 0; }
    kbd { font: inherit; }
    [hidden] { display: none !important; }
    @keyframes arrive { from { opacity: 0; translate: 0 5px; } to { opacity: 1; translate: 0 0; } }
    @media (max-width: 480px) {
      .top { padding: 12px; gap: 7px; }
      .mark { display: none; }
      .tabs { margin: 0 12px 10px; }
      .tab { gap: 4px; font-size: 10px; }
      .filters { padding: 0 12px 10px; }
      .workspace { grid-template-columns: minmax(0, 1fr) 126px; }
      .preview { padding: 10px 8px; }
      .drawing { height: 145px; padding-left: 10px; padding-right: 10px; }
      .preview-size { font-size: 12px; }
      .preview-detail { font-size: 9px; }
      .device { padding: 9px 6px; gap: 6px; }
      .device > svg, .device-check { display: none; }
      .device-name { font-size: 11px; }
      .bottom { padding: 10px 12px; }
      .footnote { padding: 8px 12px; }
      .shortcut { display: none; }
    }
    @media (max-height: 590px) { .list { height: 200px; } .drawing { height: 105px; } .preview-detail { display: none; } }
    @media (max-height: 440px) { .panel { overflow-y: auto; } .workspace { min-height: 165px; } .list { height: 165px; } .drawing { height: 65px; } .footnote { display: none; } }
    @media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
    @media (forced-colors: active) { .tab[aria-selected="true"], .device[aria-pressed="true"], .chip[aria-pressed="true"] { outline: 2px solid Highlight; } }
  `;
})();
