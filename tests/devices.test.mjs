import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({});
for (const file of ["device-presets.js", "window-sizing.js"]) {
  vm.runInContext(
    await readFile(new URL(`../${file}`, import.meta.url), "utf8"),
    context,
  );
}
const presets = context.viewportDevicePresets;
const sizing = context.viewportWindowSizing;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("every device type has current and legacy references, with unique IDs", () => {
  assert.equal(
    new Set(presets.devices.map((device) => device.id)).size,
    presets.devices.length,
  );
  for (const type of presets.types) {
    const devices = presets.devices.filter((device) => device.type === type);
    assert.ok(devices.some((device) => device.legacy));
    assert.ok(devices.some((device) => !device.legacy));
    for (const brand of type === "monitor"
      ? ["Standard"]
      : ["Apple", "Samsung"]) {
      assert.ok(devices.some((device) => device.brand === brand));
    }
  }
  for (const device of presets.devices) {
    assert.ok(Number.isInteger(device.width) && device.width > 0);
    assert.ok(Number.isInteger(device.height) && device.height > 0);
  }
});

test("filters omit unreachable widths, include the exact boundary and re-filter rotation", () => {
  const options = { type: "phone", maxWidth: 375 };
  const portrait = presets.filter(options);
  assert.ok(portrait.some((device) => device.id === "iphone-se"));
  assert.ok(portrait.every((device) => device.width <= 375));
  assert.equal(presets.filter({ ...options, rotated: true }).length, 0);
  assert.ok(
    presets
      .filter({ ...options, rotated: true, maxWidth: 667 })
      .some((device) => device.id === "iphone-se"),
  );
  assert.equal(presets.filter({ type: "monitor", maxWidth: 1440 }).length, 0);
  assert.ok(presets.filter({ type: "monitor", maxWidth: 1920 }).length > 0);
});

test("brand, multi-word search, dimensions and legacy compose with reachability", () => {
  const options = { type: "phone", maxWidth: 440 };
  assert.equal(
    presets.filter({ ...options, query: "  APPLE  402 " })[0].id,
    "iphone-17",
  );
  assert.ok(
    presets
      .filter({ ...options, legacyOnly: true })
      .every((device) => device.legacy),
  );
  assert.equal(
    presets.filter({ ...options, maxWidth: 320, query: "Samsung" }).length,
    0,
  );
  assert.equal(
    presets.filter({ ...options, query: "no-such-device" }).length,
    0,
  );
});

const window = { width: 1200, height: 900, left: 400, top: 100 };
const metrics = {
  width: 1000,
  height: 700,
  availWidth: 1600,
  availHeight: 1000,
  availLeft: 0,
  availTop: 0,
};

test("reachability accounts for page zoom and docked chrome without depending on selected width", () => {
  assert.deepEqual(plain(sizing.capacity(window, metrics, 1)), {
    width: 1400,
    height: 800,
    frameWidth: 200,
    frameHeight: 200,
  });
  assert.deepEqual(
    plain(
      sizing.capacity(window, { ...metrics, width: 800, height: 560 }, 1.25),
    ),
    { width: 1120, height: 640, frameWidth: 200, frameHeight: 200 },
  );
  assert.equal(
    sizing.capacity({ ...window, width: 602 }, { ...metrics, width: 402 }, 1)
      .width,
    1400,
  );
});

test("resize caps height, keeps bounds on the current display, and rejects oversized widths", () => {
  assert.deepEqual(
    plain(sizing.bounds(window, metrics, 1, { width: 1400, height: 1200 })),
    { width: 1600, height: 1000, left: 0, top: 0 },
  );
  const otherDisplay = { ...metrics, availLeft: -1600, availTop: -1000 };
  assert.deepEqual(
    plain(
      sizing.bounds(window, otherDisplay, 1, { width: 1400, height: 1200 }),
    ),
    { width: 1600, height: 1000, left: -1600, top: -1000 },
  );
  assert.throws(
    () => sizing.bounds(window, metrics, 1, { width: 1401, height: 800 }),
    /wider/,
  );
});

test("invalid measurements cannot enter the window resize boundary", () => {
  assert.ok(sizing.validMetrics(metrics));
  for (const value of [
    null,
    {},
    { ...metrics, width: "1000" },
    { ...metrics, width: Infinity },
    { ...metrics, availWidth: 0 },
  ]) {
    assert.ok(!sizing.validMetrics(value));
  }
});
