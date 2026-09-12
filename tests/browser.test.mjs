import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Optional real-browser suite: supply an existing Playwright installation and
// Chrome executable. No dependencies are installed into this extension.
test(
  "installed extension: badge, toolbar, presets, resizing, keyboard and cleanup",
  {
    skip: !process.env.VIEWPORT_PLAYWRIGHT || !process.env.VIEWPORT_CHROME,
    timeout: 60000,
  },
  async () => {
    const require = createRequire(import.meta.url);
    const { chromium } = require(process.env.VIEWPORT_PLAYWRIGHT);
    const server = createServer((request, response) => {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f1f0ed;font:16px system-ui;color:#3b4038;padding:80px}h1{font-weight:500;font-size:46px;max-width:600px;letter-spacing:-2px}p{color:#71766d;max-width:420px;line-height:1.8}input{padding:10px;border:1px solid #ccc;border-radius:6px}button{font-size:80px!important}*{box-sizing:border-box}</style></head><body><p>RESPONSIVE WORKSPACE</p><h1>A page, at every size.</h1><p>Resize the window or open the device toolbar to explore the layout.</p><input id="page-input" aria-label="Page input" placeholder="Keyboard focus returns here"></body></html>`,
      );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const context = await chromium.launchPersistentContext("", {
      executablePath: process.env.VIEWPORT_CHROME,
      viewport: null,
      headless: true,
      args: [
        "--enable-unsafe-extension-debugging",
        "--window-size=1500,1100",
        "--screen-info={2560x1440}",
      ],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
    const browser = context.browser();
    try {
      const browserCDP = await browser.newBrowserCDPSession();
      const { id } = await browserCDP.send("Extensions.loadUnpacked", {
        path: fileURLToPath(new URL("..", import.meta.url)),
        enableInIncognito: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const cdp = await context.newCDPSession(page);
      const { windowId } = await cdp.send("Browser.getWindowForTarget");
      const workers = context.serviceWorkers();
      const worker =
        workers.find((entry) => entry.url().includes(id)) ||
        (await context.waitForEvent("serviceworker"));
      async function toggle() {
        await worker.evaluate(async () => {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const tab = tabs.find(
            (entry) => !entry.url?.startsWith("chrome-extension:"),
          );
          await chrome.tabs.sendMessage(
            tab.id,
            { type: "viewport:toggle" },
            { frameId: 0 },
          );
        });
      }
      async function root(kind = "toolbar") {
        const { root: document } = await cdp.send("DOM.getDocument");
        const { nodeId } = await cdp.send("DOM.querySelector", {
          nodeId: document.nodeId,
          selector: `[data-viewport-dimensions-${kind}]`,
        });
        assert.ok(nodeId, `${kind} is mounted`);
        const { node } = await cdp.send("DOM.describeNode", {
          nodeId,
          depth: 1,
          pierce: true,
        });
        const { object } = await cdp.send("DOM.resolveNode", {
          backendNodeId: node.shadowRoots[0].backendNodeId,
        });
        return object.objectId;
      }
      async function inspect(expression, kind) {
        const { result, exceptionDetails } = await cdp.send(
          "Runtime.callFunctionOn",
          {
            objectId: await root(kind),
            functionDeclaration: `function() { ${expression} }`,
            returnByValue: true,
          },
        );
        assert.ok(!exceptionDetails, JSON.stringify(exceptionDetails));
        return result.value;
      }
      async function click(selector, kind) {
        const box = await inspect(
          `const e=this.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:"nearest"}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};`,
          kind,
        );
        await page.mouse.click(box.x, box.y);
      }
      async function until(expression, kind) {
        for (let attempt = 0; attempt < 60; attempt += 1) {
          if (await inspect(`return ${expression};`, kind)) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.fail(`Condition did not become true: ${expression}`);
      }
      await page.locator("#page-input").focus();
      await toggle();
      await until('!this.querySelector("#apply").disabled');
      assert.equal(
        await inspect('return this.querySelectorAll(".device").length;'),
        11,
      );
      assert.equal(
        await inspect(
          'return this.querySelector(".preview-size").textContent;',
        ),
        "402 × 874",
      );
      assert.equal(await inspect("return this.activeElement.id;"), "search");
      assert.ok(
        await inspect(
          'return getComputedStyle(this.querySelector("#apply")).fontSize === "11px";',
        ),
      );
      const screenshotDir = process.env.VIEWPORT_SCREENSHOTS;
      await until('this.querySelector(".panel").getAnimations().length === 0');
      if (screenshotDir) {
        await mkdir(screenshotDir, { recursive: true });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${screenshotDir}/toolbar-light.png` });
        await page.emulateMedia({ colorScheme: "dark" });
        await page.screenshot({ path: `${screenshotDir}/toolbar-dark.png` });
        await page.emulateMedia({ colorScheme: "light" });
        await page.waitForTimeout(100);
        const clip = await inspect(
          'const r=this.querySelector(".panel").getBoundingClientRect(); return {x:r.x-10,y:r.y-10,width:r.width+20,height:r.height+20};',
        );
        await page.screenshot({
          path: `${screenshotDir}/toolbar-preview.png`,
          clip,
        });
      }
      await click("#legacy");
      assert.equal(
        await inspect('return this.querySelectorAll(".device").length;'),
        5,
      );
      await click("#search");
      await page.keyboard.type("Samsung");
      assert.equal(
        await inspect('return this.querySelectorAll(".device").length;'),
        2,
      );
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Backspace");
      await click("#legacy");
      await click('.device[data-id="iphone-se"]');
      await click("#rotate");
      assert.equal(
        await inspect(
          'return this.querySelector(".preview-size").textContent;',
        ),
        "667 × 375",
      );
      await page.evaluate(() => {
        window.viewportMotionFrames = [];
        addEventListener("resize", () =>
          window.viewportMotionFrames.push({
            width: innerWidth,
            height: innerHeight,
          }),
        );
      });
      await click("#apply");
      await until(
        'this.querySelector(".status").textContent.includes("Viewport applied")',
      );
      assert.deepEqual(
        await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
        { width: 667, height: 375 },
      );
      const motionFrames = await page.evaluate(
        () => window.viewportMotionFrames,
      );
      assert.ok(
        motionFrames.some((frame) => frame.width > 667 && frame.width < 1500),
        "Apply must render intermediate viewport sizes",
      );
      assert.equal(
        await page.locator("[data-viewport-dimensions-overlay]").count(),
        0,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => {
        window.viewportMotionFrames = [];
      });
      await click("#restore");
      await until(
        'this.querySelector(".status").textContent.includes("Original window restored")',
      );
      assert.ok(
        (await page.evaluate(() => window.viewportMotionFrames)).length <= 2,
        "Reduced motion must skip intermediate sizes",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await click(".tab:nth-child(4)");
      const deviceWidths = await inspect(
        'return [...this.querySelectorAll(".device-size")].map(e=>parseInt(e.textContent));',
      );
      const maxWidth = await inspect(
        'return Number(this.querySelector("#count").textContent.match(/up to ([0-9]+)/)[1]);',
      );
      assert.ok(deviceWidths.every((width) => width <= maxWidth));
      await page.keyboard.press("ArrowLeft");
      assert.equal(
        await inspect(
          'return this.querySelector(".tab[aria-selected=true]").textContent;',
        ),
        "Laptops",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("[data-viewport-dimensions-toolbar]").count(),
        0,
      );
      assert.equal(
        await page
          .locator("#page-input")
          .evaluate((element) => element === document.activeElement),
        true,
      );
      await browserCDP.send("Browser.setWindowBounds", {
        windowId,
        bounds: { width: 900, height: 800 },
      });
      await page.waitForSelector("[data-viewport-dimensions-overlay]");
      await click(".label", "overlay");
      await until('!this.querySelector("#apply").disabled');
      assert.equal(
        await page.locator("[data-viewport-dimensions-overlay]").count(),
        0,
      );
      await toggle();
      assert.equal(
        await page.locator("[data-viewport-dimensions-toolbar]").count(),
        0,
      );
      await toggle();
      await until('!this.querySelector("#apply").disabled');
      await click(".tab:nth-child(1)");
      await click('.device[data-id="iphone-se"]');
      await click("#apply");
      await until(
        'this.querySelector(".status").textContent.includes("Browser limit") || this.querySelector(".status").textContent.includes("Viewport applied")',
      );
      const portraitWidth = await page.evaluate(() => innerWidth);
      if (portraitWidth !== 375)
        assert.ok(
          await inspect(
            'return this.querySelector(".status").textContent.includes("Browser limit");',
          ),
        );
      await click("#restore");
      await until(
        'this.querySelector(".status").textContent.includes("Original window restored")',
      );
      await page.evaluate(() => {
        window.mobileStateMarker = "keep this loaded page";
      });
      await click("#mobile");
      await page.waitForFunction(
        () => innerWidth === 375 && innerHeight === 667,
      );
      await page.waitForTimeout(250);
      assert.equal(
        await page.evaluate(() => window.mobileStateMarker),
        "keep this loaded page",
      );
      assert.notEqual(
        (await cdp.send("Browser.getWindowForTarget")).windowId,
        windowId,
      );
      if (
        (await page.locator("[data-viewport-dimensions-toolbar]").count()) === 0
      )
        await toggle();
      await until(
        '!this.querySelector("#restore").disabled && this.querySelector("#restore").textContent.includes("Return to browser")',
      );
      if (screenshotDir) {
        const screenshot = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        await writeFile(
          `${screenshotDir}/toolbar-mobile.png`,
          Buffer.from(screenshot.data, "base64"),
        );
      }
      await click("#restore");
      await page.waitForFunction(() => innerWidth === 900);
      await page.waitForTimeout(250);
      assert.equal(
        (await cdp.send("Browser.getWindowForTarget")).windowId,
        windowId,
      );
      if (
        (await page.locator("[data-viewport-dimensions-toolbar]").count()) === 0
      )
        await toggle();
      await until('!this.querySelector("#apply").disabled');
      await browserCDP.send("Browser.setWindowBounds", {
        windowId,
        bounds: { width: 350, height: 700 },
      });
      await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        await chrome.tabs.setZoom(tab.id, 1.25);
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.ok(await page.evaluate(() => innerWidth < 480));
      assert.ok(
        await inspect(
          'return this.querySelector(".panel").scrollWidth <= this.querySelector(".panel").clientWidth;',
        ),
      );
      assert.ok(
        await inspect(
          'const r=this.querySelector(".panel").getBoundingClientRect(); return r.x>=0 && r.right<=innerWidth && r.y>=0 && r.bottom<=innerHeight;',
        ),
      );
      if (screenshotDir) {
        // Capture the native surface: page.screenshot clips CSS pixels when a
        // real tab zoom differs from 100%, truncating this regression image.
        const screenshot = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        await writeFile(
          `${screenshotDir}/toolbar-narrow.png`,
          Buffer.from(screenshot.data, "base64"),
        );
      }
      await click("#close");
      await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        await chrome.tabs.setZoom(tab.id, 1);
      });
      await browserCDP.send("Browser.setWindowBounds", {
        windowId,
        bounds: { width: 800, height: 800 },
      });
      await page.waitForSelector("[data-viewport-dimensions-overlay]");
      await page.waitForSelector("[data-viewport-dimensions-overlay]", {
        state: "detached",
        timeout: 4000,
      });
      // The source window may have only one tab. It then closes when the tab
      // enters the popup; Return must recreate a normal window without reload.
      const soloWindow = await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        return chrome.windows.create({
          tabId: tab.id,
          type: "normal",
          width: 1000,
          height: 900,
          focused: true,
        });
      });
      await page.waitForTimeout(200);
      await toggle();
      await until('!this.querySelector("#mobile").disabled');
      assert.equal(
        await inspect(
          'return this.querySelector(".preview-name").textContent;',
        ),
        "iPhone SE",
        "Reopening must preserve the selected device",
      );
      await click("#mobile");
      await page.waitForFunction(
        () => innerWidth === 375 && innerHeight === 667,
      );
      await page.waitForTimeout(250);
      assert.equal(
        await worker.evaluate(
          async (id) =>
            chrome.windows.get(id).then(
              () => false,
              () => true,
            ),
          soloWindow.id,
        ),
        true,
      );
      if (
        (await page.locator("[data-viewport-dimensions-toolbar]").count()) === 0
      )
        await toggle();
      await until('!this.querySelector("#restore").disabled');
      await click("#restore");
      await page.waitForFunction(() => innerWidth > 500);
      await page.waitForTimeout(550);
      assert.equal(
        await page.evaluate(() => window.mobileStateMarker),
        "keep this loaded page",
      );
      const returnState = await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const window = await chrome.windows.get(tab.windowId);
        const storage = await chrome.storage.session.get(null);
        return {
          type: window.type,
          mobileRecords: Object.keys(storage).filter((key) =>
            key.startsWith("viewport-mobile-"),
          ).length,
        };
      });
      assert.deepEqual(returnState, { type: "normal", mobileRecords: 0 });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
