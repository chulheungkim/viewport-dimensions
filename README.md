# Viewport Dimensions

A standalone Chrome extension that displays **width × height in CSS pixels**
while the viewport changes size. One box appears at the selected position,
stays visible while resizing, then fades and slides out after a quiet period.
The box is removed from the DOM after its exit finishes.

## Install or update

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select `/Users/chulheongkim/viewport-dimensions`, or
   your clone of this repository. If already installed, click **Reload** instead.
3. Refresh existing website tabs to replace the previous content script.
4. Open **Viewport Dimensions** from Chrome's Extensions menu. Pin it for quick access.
5. Pick a position and idle delay, then resize a website's browser window.

Keep the extension folder on disk. Moving it requires loading it from the new path.

The project was renamed from `viewport-width` to `viewport-dimensions`. If Chrome
still points to the old folder, remove that unpacked entry and load this folder.

## Settings

The toolbar popup has exactly six mutually exclusive positions:

| Top left    | Top center    | Top right    |
| ----------- | ------------- | ------------ |
| Bottom left | Bottom center | Bottom right |

Only the selected position displays a box. The default is **top right**. The
idle delay can be **1, 2, 3 or 5 seconds**, with **2 seconds** as the default.
Changes save automatically to Chrome's local extension storage and apply to
already open tabs without refreshing. Settings persist across browser restarts.

## Resize and motion

- No box is mounted at page load. A change to either dimension triggers it.
- Both dimensions update together from `window.innerWidth` and `window.innerHeight`.
- Dimension changes update both values together and restart the idle timer,
  without replaying the entrance animation.
- Entrance uses a 180 ms fade and a short slide inward from the chosen edge.
- After the idle delay, a 160 ms fade and slide out finishes before DOM removal.
- Resizing during an exit reverses the transition and cancels pending removal.
- Reduced-motion preferences remove the slide and fade, retaining the idle delay.
- Switching away from a tab clears its overlay. Returning alone does not show it.
- The box does not take focus or intercept pointer events. Shadow DOM isolates
  its styles from the page. There is no page-wide mutation observer or polling.

## Scope

Runs on HTTP and HTTPS pages, including localhost, in the top frame only.
Chrome internal pages, the Chrome Web Store and other protected pages cannot
receive ordinary extension content scripts. `file://` pages are not included.

Web pages receive viewport resize events, not native window-edge drag events.
Maximizing a window, changing zoom or resizing docked DevTools can therefore
also trigger the box. Dimensions describe the layout viewport, including
scrollbars, rather than the outer window or physical display resolution.

Fullscreen content and browser top-layer dialogs may cover the overlay. A site
that removes injected nodes can interrupt it; the next dimension change restores
the box. Uninstalling clears saved preferences.

## Development

The [GitHub repository](https://github.com/chulheungkim/viewport-dimensions) is
private. The logo source and Chrome's 16, 32, 48 and 128 pixel PNG exports live in
`icons/`. Both the extension card and toolbar use these assets. Artwork provenance
and the generation prompt are recorded in `icons/README.md`.

No package installation or build step is needed. `preferences.js` owns defaults
and settings validation; `resize-controller.js` owns the lifecycle; `content.js`
renders it; `popup.html`, `popup.css` and `popup.js` provide the settings UI.
The extension makes no network requests. Its only extension API permission is
`storage`; content-script match patterns give access to HTTP and HTTPS pages.

Run deterministic lifecycle and preference tests with Node.js:

```bash
node --test tests/*.test.mjs
```

## References

- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Extension storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Window resize events](https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event)
- [Window.innerWidth](https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth)
