# Device preset sources

Reviewed September 12, 2026. Presets are **CSS reference sizes** for responsive
layout testing. Browser controls, display zoom, OS scaling, and navigation bars
change the usable area. This extension resizes a desktop window; it does not
emulate a mobile browser, touch input, safe areas, DPR, or user agent.

## Phones and tablets

- [Chromium DevTools device catalog](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts)
  supplies iPhone 16, SE, XR, classic iPad, iPad Pro 13, Galaxy S8+, S20 Ultra,
  and Tab S4 reference dimensions. The older
  [Chromium catalog](https://chromium.googlesource.com/chromium/blink/+/refs/heads/main/Source/devtools/front_end/emulated_devices/module.json)
  supplies the 320 × 568 iPhone 5 baseline.
- [iPhone 17 specifications](https://www.apple.com/iphone-17/specs/) give a
  1206 × 2622 panel. The preset uses 402 × 874 at 3×. iPhone 17 Pro shares
  that reference size; [Pro Max specifications](https://support.apple.com/en-bh/125091)
  give 1320 × 2868, producing the 440 × 956 reference.
- [iPhone Air specifications](https://www.apple.com/iphone-air/specs/) give
  1260 × 2736; the reference is 420 × 912 at 3×.
- [iPad Pro 11-inch M5 specifications](https://support.apple.com/en-mide/125406)
  give 1668 × 2420; the reference is 834 × 1210 at 2×.
  [iPad mini specifications](https://www.apple.com/ipad-mini/specs/) give
  1488 × 2266; the reference is 744 × 1133 at 2×.
- [Samsung's Galaxy S26 specifications](https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2026_1Q_Interim_Report.pdf)
  list 1080 × 2340 for S26 and 1440 × 3120 for S26+ and Ultra. The catalog
  assumes 3× for S26 (360 × 780) and a rounded 3.5× reference for S26+ / Ultra
  (412 × 892). These are **chosen testing references**, not measured default
  browser viewports. Samsung screen zoom and resolution settings vary.
- [Samsung's Tab S11 series specifications](https://news.samsung.com/ph/meet-samsung-galaxy-tab-s11-series-packing-everything-you-expect-from-a-premium-tablet)
  list 1600 × 2560 and 1848 × 2960. The presets explicitly assume 2× to offer
  800 × 1280 and 924 × 1480 testing references.

## Laptops

- [MacBook Air specifications](https://www.apple.com/macbook-air/specs/) and
  [MacBook Pro specifications](https://www.apple.com/macbook-pro/specs/) supply
  the panel dimensions. The presets use a simple 2× reference. This is not a
  claim about the default macOS “Looks like” setting, and browser chrome is
  not subtracted from the reference target.
- [Samsung Galaxy Book6 Pro specifications](https://www.samsung.com/ca/computers/galaxy-book/galaxy-book6-pro-ultra-7-16gb-512gb-np940xjg-kg1ca/)
  list a 2880 × 1800 panel. The 14-inch preset chooses 200% scaling; the 16-inch
  preset chooses 150%, providing two useful desktop test widths.
- [Intel MacBook Air 13-inch specifications](https://support.apple.com/en-ca/111924)
  supply the 1440 × 900 non-Retina baseline.
  [Samsung's Series 9 specification sheet](https://image-us.samsung.com/SamsungUS/samsungbusiness/solutions/industries/government/msrp-price-sheets/archive_14/Samsung-Mobile-Computing-MSRP-Price-File-January-2014.pdf)
  supplies the 1600 × 900 HD+ legacy reference.

## Monitors

The 24–32-inch entries cover Full HD, QHD, 4K, and legacy 16:10 desktop targets.
They are not a market-share ranking. Diagonal inches alone cannot determine a
CSS viewport. Each entry names its resolution and selected scaling.

[Samsung's monitor catalog](https://www.samsung.com/us/monitors/) documents the
FHD, QHD, 4K, and 5K resolution families, and
[Samsung's ViewFinity lineup](https://news.samsung.com/us/samsung-new-odyssey-oled-smart-monitor-viewfinity-lineups-2024-one-launch/)
documents 24-, 27-, and 32-inch QHD options.
[Studio Display specifications](https://support.apple.com/en-ca/111890) give a
5120 × 2880 panel, producing the 2560 × 1440 reference at 2×.

## Reachability

The service worker measures the content viewport, browser window, current tab
zoom, and current display's available bounds. It subtracts browser chrome and
converts remaining space into CSS pixels. The list excludes presets wider than
that capacity, including after orientation changes. It uses the current
**display's** available width, so selecting a smaller window does not prevent
returning to a larger reachable preset.

Tall presets remain useful for width testing. Their height is capped to the
available display height, disclosed in the preview before applying. Every resize
is measured again, and any OS/browser minimum size or height cap is reported as
actual versus requested dimensions. A clamped result is never an exact match.

For mobile widths below Chrome's normal-window minimum, **Open mobile window**
uses Chrome's [popup window type](https://developer.chrome.com/docs/extensions/reference/api/windows)
and moves the existing tab with its loaded page intact. A 375 × 667 CSS viewport
is covered by the installed-extension browser test, including returning to an
existing window and recreating the original window when its last tab moved out.
This is viewport sizing in desktop Chrome, not device or mobile-browser emulation.

To refresh the catalog, update `device-presets.js`, verify source and scaling
assumptions here, and run the device and browser tests. No catalog downloads or
network calls occur during extension use.
