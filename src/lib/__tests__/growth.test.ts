import { test } from "node:test";
import assert from "node:assert/strict";
import { growthStage, spriteFile } from "../growth";

test("growthStage: 星0〜1は赤ちゃん", () => {
  assert.equal(growthStage(0), "baby");
  assert.equal(growthStage(1), "baby");
});

test("growthStage: 星2〜4は子ども", () => {
  assert.equal(growthStage(2), "child");
  assert.equal(growthStage(4), "child");
});

test("growthStage: 星5からは大人", () => {
  assert.equal(growthStage(5), "adult");
  assert.equal(growthStage(99), "adult");
});

test("spriteFile: 大人は段階なしの既存パス", () => {
  assert.equal(
    spriteFile("mizumaru", "adult", "normal"),
    "/animals/mizumaru-normal.png"
  );
});

test("spriteFile: baby/childは段階入りパス", () => {
  assert.equal(
    spriteFile("mizumaru", "baby", "walk"),
    "/animals/mizumaru-baby-walk.png"
  );
  assert.equal(
    spriteFile("komekichi", "child", "eating"),
    "/animals/komekichi-child-eating.png"
  );
});
