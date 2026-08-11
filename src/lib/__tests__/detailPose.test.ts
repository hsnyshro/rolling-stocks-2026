import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detailPose,
  gestureDelay,
  gestureDuration,
  pickGesture,
} from "../detailPose";

// 基本の入力（上書きして使う）
const base = {
  action: null,
  mood: "calm",
  isLit: false,
  reduced: false,
} as const;

test("detailPose: お祝いが最優先（おねだり中でも勝つ）", () => {
  const p = detailPose({ ...base, action: "celebrate", mood: "begging" });
  assert.equal(p.expression, "happy");
  assert.equal(p.motion, "animate-star-jump");
  assert.equal(p.flipped, false);
});

test("detailPose: もぐもぐはタップ・おねだりより強い", () => {
  const p = detailPose({ ...base, action: "eat", mood: "begging" });
  assert.equal(p.expression, "eating");
  assert.equal(p.motion, "animate-munch");
});

test("detailPose: タップの喜びはおねだりより強い", () => {
  const p = detailPose({ ...base, action: "tap", mood: "begging" });
  assert.equal(p.expression, "happy");
  assert.equal(p.motion, "animate-joy-hop");
});

test("detailPose: おねだりは仕草より強く、ぴょんぴょん付き", () => {
  const p = detailPose({ ...base, action: "gesture-hop", mood: "begging" });
  assert.equal(p.expression, "begging");
  assert.equal(p.motion, "animate-hop");
});

test("detailPose: しょんぼりは仕草より強い", () => {
  const p = detailPose({ ...base, action: "gesture-fidget", mood: "sad" });
  assert.equal(p.expression, "normal");
  assert.equal(p.motion, "animate-droop");
});

test("detailPose: 仕草はねる = happyでゆっくり1回", () => {
  const p = detailPose({ ...base, action: "gesture-hop" });
  assert.equal(p.expression, "happy");
  assert.equal(p.motion, "animate-gesture-hop");
});

test("detailPose: 仕草ソワソワ = walkの絵で左右ゆれ", () => {
  const p = detailPose({ ...base, action: "gesture-fidget" });
  assert.equal(p.expression, "walk");
  assert.equal(p.motion, "animate-fidget");
});

test("detailPose: 仕草きょろっ = 基本表情のまま左右反転", () => {
  const p = detailPose({ ...base, action: "gesture-turn" });
  assert.equal(p.expression, "normal");
  assert.equal(p.motion, "");
  assert.equal(p.flipped, true);
});

test("detailPose: 基本表情は満タン&機嫌よしでhappy", () => {
  assert.equal(detailPose({ ...base, isLit: true }).expression, "happy");
  assert.equal(
    detailPose({ ...base, isLit: true, mood: "restless" }).expression,
    "happy"
  );
  assert.equal(detailPose({ ...base }).expression, "normal");
  // 満タンでもおねだり中はbegging（既存詳細ページと同じ）
  assert.equal(
    detailPose({ ...base, isLit: true, mood: "begging" }).expression,
    "begging"
  );
});

test("detailPose: 動きを減らす設定では motion なし・反転なし", () => {
  assert.equal(
    detailPose({ ...base, action: "celebrate", reduced: true }).motion,
    ""
  );
  assert.equal(
    detailPose({ ...base, action: "eat", reduced: true }).motion,
    ""
  );
  assert.equal(
    detailPose({ ...base, mood: "begging", reduced: true }).motion,
    ""
  );
  const turn = detailPose({ ...base, action: "gesture-turn", reduced: true });
  assert.equal(turn.flipped, false);
  // 絵の切り替え自体は維持される
  assert.equal(
    detailPose({ ...base, action: "eat", reduced: true }).expression,
    "eating"
  );
});

test("pickGesture: 乱数で3種の仕草が選ばれる", () => {
  assert.equal(pickGesture(0), "gesture-hop");
  assert.equal(pickGesture(0.5), "gesture-fidget");
  assert.equal(pickGesture(0.99), "gesture-turn");
});

test("gestureDelay: 10〜20秒の範囲", () => {
  assert.equal(gestureDelay(0), 10000);
  assert.equal(gestureDelay(0.999), 19990);
});

test("gestureDuration: 仕草ごとの長さ", () => {
  assert.equal(gestureDuration("gesture-hop"), 1200);
  assert.equal(gestureDuration("gesture-fidget"), 2000);
  assert.equal(gestureDuration("gesture-turn"), 2000);
});
