import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({});
for (const name of ["preferences.js", "resize-controller.js"]) {
  vm.runInContext(
    await readFile(new URL(`../${name}`, import.meta.url), "utf8"),
    context,
  );
}

function setup(exitDuration = 160) {
  let time = 0;
  let sequence = 0;
  const timers = new Map();
  const calls = [];
  const clock = {
    setTimeout(callback, delay) {
      const id = ++sequence;
      timers.set(id, { callback, at: time + delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    advance(delta) {
      const end = time + delta;
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        time = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = end;
    },
  };
  const view = Object.fromEntries(
    ["mount", "update", "show", "position", "unmount"].map((name) => [
      name,
      (...args) => calls.push({ name, args }),
    ]),
  );
  view.hide = () => {
    calls.push({ name: "hide", args: [] });
    return exitDuration;
  };
  const controller = context.createViewportResizeController({
    view,
    clock,
    initialSize: { width: 1000, height: 800 },
    settings: { position: "top-right", hideDelayMs: 2000 },
  });
  return {
    controller,
    clock,
    calls,
    count: (name) => calls.filter((call) => call.name === name).length,
  };
}

test("load, no-op resize and preference selection do not mount a box", () => {
  const h = setup();
  h.controller.resize({ width: 1000, height: 800 });
  h.controller.configure({ position: "bottom-center", hideDelayMs: 3000 });
  h.clock.advance(10000);
  assert.equal(h.calls.length, 0);
});

test("width-only and height-only changes both update the same box", () => {
  const h = setup();
  h.controller.resize({ width: 999, height: 800 });
  h.controller.resize({ width: 999, height: 799 });
  assert.equal(h.count("mount"), 1);
  assert.equal(h.count("show"), 1);
  assert.deepEqual(
    h.calls
      .filter((call) => call.name === "update")
      .map((call) => call.args[0]),
    [
      { width: 999, height: 800 },
      { width: 999, height: 799 },
    ],
  );
});

test("continued resizing extends the idle deadline, then exit completes before unmount", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.clock.advance(1999);
  h.controller.resize({ width: 899, height: 800 });
  h.clock.advance(1999);
  assert.equal(h.count("hide"), 0);
  h.clock.advance(1);
  assert.equal(h.count("hide"), 1);
  assert.equal(h.count("unmount"), 0);
  h.clock.advance(159);
  assert.equal(h.count("unmount"), 0);
  h.clock.advance(1);
  assert.equal(h.count("unmount"), 1);
});

test("same-size events do not keep an idle overlay alive", () => {
  const h = setup();
  const size = { width: 900, height: 800 };
  h.controller.resize(size);
  h.clock.advance(1900);
  h.controller.resize(size);
  h.clock.advance(100);
  assert.equal(h.count("hide"), 1);
});

test("resizing mid-exit cancels stale removal and reuses the box", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.clock.advance(2080);
  h.controller.resize({ width: 900, height: 799 });
  h.clock.advance(80);
  assert.equal(h.count("mount"), 1);
  assert.equal(h.count("show"), 2);
  assert.equal(h.count("unmount"), 0);
  h.clock.advance(2080);
  assert.equal(h.count("unmount"), 1);
});

test("the next resize remounts after a completed exit", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.clock.advance(2160);
  h.controller.resize({ width: 900, height: 799 });
  assert.equal(h.count("mount"), 2);
});

test("transition completion removes an exiting box, but a stale event cannot remove a resumed one", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.controller.finishExit();
  assert.equal(h.count("unmount"), 0);
  h.clock.advance(2000);
  h.controller.finishExit();
  assert.equal(h.count("unmount"), 1);
  h.clock.advance(160);
  assert.equal(h.count("unmount"), 1);
  h.controller.resize({ width: 899, height: 800 });
  h.clock.advance(2000);
  h.controller.resize({ width: 898, height: 800 });
  h.controller.finishExit();
  assert.equal(h.count("unmount"), 1);
});

test("selection relocates one visible box without extending the idle period", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.clock.advance(1500);
  h.controller.configure({ position: "bottom-left", hideDelayMs: 2000 });
  assert.equal(h.count("mount"), 1);
  assert.deepEqual(h.calls.find((call) => call.name === "position").args, [
    "bottom-left",
  ]);
  h.clock.advance(500);
  assert.equal(h.count("hide"), 1);
});

test("delay changes apply to a currently visible box", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.clock.advance(1000);
  h.controller.configure({ position: "top-right", hideDelayMs: 3000 });
  h.clock.advance(2999);
  assert.equal(h.count("hide"), 0);
  h.clock.advance(1);
  assert.equal(h.count("hide"), 1);
});

test("reduced motion retains idle delay and unmounts without an animation wait", () => {
  const h = setup(0);
  h.controller.resize({ width: 900, height: 800 });
  h.clock.advance(1999);
  assert.equal(h.count("unmount"), 0);
  h.clock.advance(1);
  assert.equal(h.count("unmount"), 1);
});

test("tab suspension cancels pending work and resets the size baseline", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.controller.suspend({ width: 700, height: 500 });
  h.clock.advance(10000);
  h.controller.resize({ width: 700, height: 500 });
  assert.equal(h.count("hide"), 0);
  assert.equal(h.count("mount"), 1);
  assert.equal(h.count("unmount"), 1);
});

test("destroy stops future resize activity", () => {
  const h = setup();
  h.controller.resize({ width: 900, height: 800 });
  h.controller.destroy();
  h.clock.advance(10000);
  h.controller.resize({ width: 700, height: 500 });
  assert.equal(h.count("mount"), 1);
  assert.equal(h.count("hide"), 0);
});

test("only six positions are valid, and corrupt stored values fall back safely", () => {
  const preferences = context.viewportDimensionsPreferences;
  assert.equal(preferences.positions.length, 6);
  for (const position of preferences.positions) {
    assert.equal(preferences.normalize({ position }).position, position);
  }
  for (const invalid of [
    null,
    false,
    "bad",
    { position: "all", hideDelayMs: -1 },
    { position: {}, hideDelayMs: Infinity },
    { hideDelayMs: "2000" },
  ]) {
    assert.deepEqual(
      JSON.parse(JSON.stringify(preferences.normalize(invalid))),
      {
        position: "top-right",
        hideDelayMs: 2000,
      },
    );
  }
});
