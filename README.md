<p align="center">
  <img src="icons/logo.png" alt="Viewport Dimensions logo" width="128" height="128">
</p>

<h1 align="center">Viewport Dimensions</h1>

<p align="center">Your viewport size, right when you need it.</p>

Viewport Dimensions is a lightweight Chrome extension that shows your browser's
viewport **width × height in CSS pixels** as you resize. A single, unobtrusive
overlay appears in your chosen position, then smoothly disappears when you stop.
Click the dimensions or use a shortcut to open a device toolbar and resize the
browser to a phone, tablet, laptop, or monitor reference size.

## Features

- **Live dimensions** — see width and height together whenever either changes.
- **Six positions** — place one overlay at the top or bottom, aligned left, center, or right.
- **Adjustable hide delay** — keep dimensions visible for 1, 2, 3, or 5 seconds after resizing.
- **Saved preferences** — display and activation settings persist across browser restarts.
- **Targeted activation** — run on localhost with an optional port allowlist,
  on selected external pages, or both.
- **Subtle motion** — smooth entrance and exit, with support for reduced motion.
- **Device toolbar** — a compact light/dark interface with search, four categories,
  dimension previews, phone/tablet rotation, and a legacy filter.
- **34 device presets** — recent Apple and Samsung devices, legacy baselines,
  and 24–32-inch monitor references with explicit scaling assumptions.
- **Reachable widths only** — presets wider than the current display can fit are
  omitted, accounting for browser chrome and page zoom.
- **Apply and restore** — resize the browser, see the actual result, and restore
  its original size and position.
- **Smooth resizing** — Apply and Restore ease between window sizes over roughly
  300 ms. Reduced-motion preferences use an immediate resize instead. Native
  window-manager limits still apply; small accuracy corrections are immediate.
- **Mobile windows** — open the current tab in a compact window to reach mobile
  widths below the normal browser-window minimum, without reloading the page or
  adding permissions. Return the tab to the original browser when finished.
- **Keyboard access** — toggle with **Alt+Shift+V** (Option+Shift+V on Mac), or
  click the resize badge. Escape closes the toolbar and restores keyboard focus.
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
2. Choose an overlay position, hide delay, and where the extension should be
   active. Changes save automatically and apply to open tabs.
3. Resize the browser window on a website to see the current dimensions.
4. Click the dimensions or press **Alt+Shift+V** to toggle the device toolbar.
   You can also choose **Open device toolbar** in the extension popup.
5. Choose a category and device to preview its dimensions. Double-click the device to apply it, or click **Apply viewport**.
   Use **Restore window** to return to the original window bounds.
6. For phone and tablet widths, **Open mobile window** moves the current tab into
   a compact Chrome window and smoothly applies the selected size. Your loaded
   page, form values, and navigation remain intact. Open the toolbar there and use
   **Return to browser** to move the tab back to its original position and restore
   the original window bounds. If Chrome closed the original window because this
   was its last tab, a normal window is recreated when returning.

Change the shortcut at `chrome://extensions/shortcuts` if another extension or
your operating system already uses it. The toolbar also supports tab navigation,
arrow keys in categories and device lists, and Escape to close.

| Setting    | Options                                                                   | Default   |
| ---------- | ------------------------------------------------------------------------- | --------- |
| Position   | Top left, top center, top right, bottom left, bottom center, bottom right | Top right |
| Hide delay | 1, 2, 3, or 5 seconds                                                     | 2 seconds |
| Localhost  | Any port, or a comma-separated port allowlist                             | Any port  |
| Pages      | One exact HTTP(S) page URL per line                                       | Disabled  |

Localhost includes `localhost`, subdomains such as `app.localhost`, and the
`127.0.0.1`, `0.0.0.0`, and `::1` loopback addresses. Page matching ignores
query strings, fragments, and a trailing slash, but keeps the scheme, host,
port, and path exact. This lets a configured landing page keep working with
campaign parameters without enabling the extension across the entire site.

The badge stays hidden until the viewport changes size. Continued resizing,
hovering, or focusing it keeps it visible; after the selected delay, it fades
away and is removed. The toolbar stays open until dismissed. Switching tabs
clears both surfaces. Position settings apply to both the badge and toolbar.

## Privacy and permissions

Viewport Dimensions makes no network requests and includes no analytics or
tracking. It saves your display and activation preferences in Chrome's local
extension storage; uninstalling the extension clears them. Original window bounds are
stored temporarily in session storage so Restore survives service-worker restarts.
Mobile preview return locations also live in session storage and are removed
when returning or closing the tab. Closing a mobile window closes its tab, just
like closing a normal browser window; use **Return to browser** to keep it open.

- **`storage`** saves your selected position, hide delay, localhost ports, and
  page allowlist.
- The service worker uses Chrome's window and tab APIs to measure and resize the
  current window. No `debugger`, browsing-history, or additional host permission
  is requested.
- **HTTP and HTTPS content scripts** run only in the top frame and remain inert
  unless the current URL matches the activation settings.

## Compatibility and limitations

- Works on configured HTTP and HTTPS pages, including local development servers.
- Chrome internal pages, the Chrome Web Store, and other protected pages do not
  allow ordinary extension content scripts. Local `file://` pages are not included.
- Measurements describe the layout viewport, including scrollbars, in CSS pixels.
  They do not measure the outer browser window or physical display resolution.
- Maximizing the window, changing zoom, or resizing docked DevTools can also
  change the viewport and trigger the overlay.
- Fullscreen content and browser top-layer dialogs may cover the overlay.
- Exit browser fullscreen before applying a device size.
- The list uses the current display's maximum reachable width, rather than a
  temporarily narrowed window. Changing display or zoom refreshes it when the
  toolbar opens or the viewport changes.
- Device dimensions are reference targets. Desktop OS scaling and Android screen
  zoom vary; the preview names the chosen scaling. See [device sources](DEVICE-SOURCES.md).
- Tall devices fit to available height. Browser minimum window widths may prevent
  exact portrait phone widths in a normal window; use **Open mobile window** for
  a compact window without the normal tab strip. The toolbar reports actual and requested sizes
  when they differ. These presets test desktop layout; they do not emulate mobile
  Safari, touch, DPR, safe areas, or user agents.
- Smooth resizing uses sequential native window updates, so its frame rate depends
  on Chrome, the OS, and page performance. Maximizing/restoring the OS window state
  remains controlled by the window manager.

## Development

The extension uses plain JavaScript, HTML, and CSS with Manifest V3. No dependency
installation or build step is required. Load the project folder directly in Chrome
and reload the extension after making changes.

Run the deterministic lifecycle and preference tests with Node.js:

```bash
node --test tests/*.test.mjs
```

The optional installed-extension browser suite runs when `VIEWPORT_PLAYWRIGHT`
points to an existing Playwright package and `VIEWPORT_CHROME` points to a Chrome
executable supporting the CDP Extensions API. It uses an isolated temporary
profile and a local fixture, exercises the real content script and service worker,
and leaves the user's browser profile untouched. Set `VIEWPORT_SCREENSHOTS` to
an output directory to save light, dark, and narrow toolbar screenshots.

| File                                                                               | Purpose                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`manifest.json`](manifest.json)                                                   | Extension metadata, permissions, and entry points     |
| [`content.js`](content.js)                                                         | Overlay rendering, motion, and page events            |
| [`toolbar.js`](toolbar.js), [`toolbar-styles.js`](toolbar-styles.js)               | Toolbar controls, filtering, previews, and styling    |
| [`device-presets.js`](device-presets.js), [`DEVICE-SOURCES.md`](DEVICE-SOURCES.md) | Reference catalog, filters, and provenance            |
| [`background.js`](background.js), [`window-sizing.js`](window-sizing.js)           | Shortcut routing, resizing, restore, and reachability |
| [`resize-controller.js`](resize-controller.js)                                     | Resize lifecycle and visibility timers                |
| [`preferences.js`](preferences.js)                                                 | Defaults and saved-setting validation                 |
| [`popup.html`](popup.html), [`popup.css`](popup.css), [`popup.js`](popup.js)       | Settings popup                                        |
| [`tests/lifecycle.test.mjs`](tests/lifecycle.test.mjs)                             | Lifecycle and preference tests                        |
| [`icons/`](icons/)                                                                 | Logo and Chrome icon exports                          |

The overlay uses Shadow DOM to isolate its styles from the page. Its lifecycle
handles resizing during an exit, tab suspension, and reduced motion without
polling or a page-wide mutation observer.

Artwork provenance and the generation prompt are documented in
[`icons/README.md`](icons/README.md).
