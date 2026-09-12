import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(
  await readFile(new URL("../window-motion.js", import.meta.url), "utf8"),
  context,
);
const motion = context.viewportWindowMotion;
const from = { left: 100, top: 50, width: 1500, height: 1000 };
const to = { left: -200, top: 20, width: 375, height: 800 };
const plain = (value) => JSON.parse(JSON.stringify(value));

function harness(updateDelay = 0) {
  let time = 0;
  let activeUpdates = 0;
  const frames = [];
  const options = {
    from,
    to,
    now: () => time,
    wait: async (delay) => {
      time += delay;
    },
    update: async (bounds) => {
      assert.equal(activeUpdates, 0, "native updates must never overlap");
      activeUpdates += 1;
      await Promise.resolve();
      time += updateDelay;
      frames.push(plain(bounds));
      activeUpdates -= 1;
    },
  };
  return { options, frames, elapsed: () => time };
}

test("native motion produces bounded intermediate frames and finishes at exact bounds", async () => {
  const h = harness();
  await motion.animate(h.options);
  assert.ok(h.frames.length > 8);
  assert.deepEqual(h.frames.at(-1), to);
  assert.ok(h.elapsed() >= 300 && h.elapsed() < 320);
  for (let i = 0; i < h.frames.length; i += 1) {
    const previous = h.frames[i - 1] || from;
    for (const key of Object.keys(to)) {
      assert.ok(Number.isInteger(h.frames[i][key]));
      assert.ok(h.frames[i][key] <= previous[key]);
      assert.ok(h.frames[i][key] >= to[key]);
    }
  }
});

test("reduced motion updates once without an animation delay", async () => {
  const h = harness();
  await motion.animate({ ...h.options, reducedMotion: true });
  assert.deepEqual(h.frames, [to]);
  assert.equal(h.elapsed(), 0);
});

test("slow native updates skip frames rather than queueing a long animation", async () => {
  const h = harness(80);
  await motion.animate(h.options);
  assert.ok(h.frames.length < 8);
  assert.deepEqual(h.frames.at(-1), to);
  assert.ok(h.elapsed() < 420);
});

test("same-size operations do no work and failed native updates stop immediately", async () => {
  const h = harness();
  await motion.animate({ ...h.options, to: from });
  assert.equal(h.frames.length, 0);
  assert.equal(h.elapsed(), 0);
  let calls = 0;
  await assert.rejects(
    motion.animate({
      ...h.options,
      update: async () => {
        calls += 1;
        throw new Error("Window closed");
      },
    }),
    /Window closed/,
  );
  assert.equal(calls, 1);
});

test("interpolation clamps progress and handles growing windows on negative-coordinate displays", () => {
  assert.deepEqual(plain(motion.interpolate(to, from, -1)), to);
  assert.deepEqual(plain(motion.interpolate(to, from, 2)), from);
  const middle = motion.interpolate(to, from, 0.5);
  for (const key of Object.keys(from))
    assert.equal(middle[key], Math.round((from[key] + to[key]) / 2));
});
