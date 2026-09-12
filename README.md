<p align="center">
  <img src="icons/logo.png" alt="Viewport Dimensions logo" width="128" height="128">
</p>

<h1 align="center">Viewport Dimensions</h1>

<p align="center">Your viewport size, right when you need it.</p>

Viewport Dimensions is a lightweight Chrome extension that shows your browser's
viewport **width × height in CSS pixels** as you resize. A single, unobtrusive
overlay appears in your chosen position, then smoothly disappears when you stop.
Use it to check responsive layouts without opening DevTools.

## Features

- **Live dimensions** — see width and height together whenever either changes.
- **Six positions** — place one overlay at the top or bottom, aligned left, center, or right.
- **Adjustable hide delay** — keep dimensions visible for 1, 2, 3, or 5 seconds after resizing.
- **Saved preferences** — your position and delay persist across browser restarts.
- **Subtle motion** — smooth entrance and exit, with support for reduced motion.
- **Out of the way** — the overlay never captures clicks or keyboard focus.
- **Local only** — no accounts, analytics, or network requests.

## Installation

### Load from source

1. Download and extract this repository, or clone it:

   ```bash
   git clone https://github.com/chulheungkim/viewport-dimensions.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `viewport-dimensions` folder containing
   `manifest.json`.
5. Refresh any website tabs that were already open.

Keep the folder on your computer. If you move it, load the extension again from
its new location.

### Update an existing installation

Download the updated source or run `git pull` in your clone. Then click **Reload**
on the extension's card at `chrome://extensions` and refresh your website tabs.

## Usage

1. Open **Viewport Dimensions** from Chrome's Extensions menu. Pin it to the
   toolbar for quick access.
2. Choose an overlay position and a hide delay. Changes save automatically and
   apply to open tabs.
3. Resize the browser window on a website to see the current dimensions.

| Setting    | Options                                                                   | Default   |
| ---------- | ------------------------------------------------------------------------- | --------- |
| Position   | Top left, top center, top right, bottom left, bottom center, bottom right | Top right |
| Hide delay | 1, 2, 3, or 5 seconds                                                     | 2 seconds |

The overlay stays hidden until the viewport changes size. Continued resizing
keeps it visible; after the selected delay, it fades away and is removed from
the page. Switching tabs also clears the overlay.

## Privacy and permissions

Viewport Dimensions makes no network requests and includes no analytics or
tracking. It saves only your display preferences in Chrome's local extension
storage; uninstalling the extension clears them.

- **`storage`** saves your selected position and hide delay.
- **HTTP and HTTPS content scripts** display the overlay on websites, including
  localhost. They run only in the top frame.

## Compatibility and limitations

- Works on HTTP and HTTPS pages, including local development servers.
- Chrome internal pages, the Chrome Web Store, and other protected pages do not
  allow ordinary extension content scripts. Local `file://` pages are not included.
- Measurements describe the layout viewport, including scrollbars, in CSS pixels.
  They do not measure the outer browser window or physical display resolution.
- Maximizing the window, changing zoom, or resizing docked DevTools can also
  change the viewport and trigger the overlay.
- Fullscreen content and browser top-layer dialogs may cover the overlay.

## Development

The extension uses plain JavaScript, HTML, and CSS with Manifest V3. No dependency
installation or build step is required. Load the project folder directly in Chrome
and reload the extension after making changes.

Run the deterministic lifecycle and preference tests with Node.js:

```bash
node --test tests/lifecycle.test.mjs
```

| File                                                                         | Purpose                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| [`manifest.json`](manifest.json)                                             | Extension metadata, permissions, and entry points |
| [`content.js`](content.js)                                                   | Overlay rendering, motion, and page events        |
| [`resize-controller.js`](resize-controller.js)                               | Resize lifecycle and visibility timers            |
| [`preferences.js`](preferences.js)                                           | Defaults and saved-setting validation             |
| [`popup.html`](popup.html), [`popup.css`](popup.css), [`popup.js`](popup.js) | Settings popup                                    |
| [`tests/lifecycle.test.mjs`](tests/lifecycle.test.mjs)                       | Lifecycle and preference tests                    |
| [`icons/`](icons/)                                                           | Logo and Chrome icon exports                      |

The overlay uses Shadow DOM to isolate its styles from the page. Its lifecycle
handles resizing during an exit, tab suspension, and reduced motion without
polling or a page-wide mutation observer.

Artwork provenance and the generation prompt are documented in
[`icons/README.md`](icons/README.md).
