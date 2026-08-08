// need.ts のテスト: 家族構成 → 必要量の計算
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcNeed, fallbackNeed, formatQty } from "../need";
import type { Family, StockpileItem } from "../types";

// 実データ（東京備蓄ナビ67品目）を読み込む
const stockpile = JSON.parse(
  readFileSync(new URL("../../data/stockpile.json", import.meta.url), "utf8")
) as { items: StockpileItem[] };

function itemById(id: number): StockpileItem {
  const item = stockpile.items.find((i) => i.id === id);
  assert.ok(item, `品目 id=${id} が見つからない`);
  return item;
}

/** 家族構成を作るヘルパー（指定しなかった欄は0人） */
function family(over: Partial<Family> = {}): Family {
  return { adults: 0, teens: 0, kids: 0, babies: 0, seniors: 0, pets: 0, ...over };
}

/** 浮動小数点の誤差を許して比較する */
function assertClose(actual: number | null, expected: number) {
  assert.ok(actual !== null, "null ではないはず");
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${actual} は ${expected} にほぼ等しいはず`
  );
}

test("4人家族(adults2, kids2)の水の7日分 = (3+3+2.4+2.4)*7 = 75.6", () => {
  const water = itemById(1);
  const result = calcNeed(water, family({ adults: 2, kids: 2 }));
  assertClose(result, 75.6);
});

test("days引数で日数を変えられる（水1日分 = 10.8）", () => {
  const water = itemById(1);
  assertClose(calcNeed(water, family({ adults: 2, kids: 2 }), 1), 10.8);
});

test("needsが全部nullの品目（乾麺 id=10）は null を返す", () => {
  const noodles = itemById(10);
  assert.equal(calcNeed(noodles, family({ adults: 2 })), null);
});

test("ペット品目（ペットフード id=63）はペット数で計算する", () => {
  const petFood = itemById(63);
  // ペット2匹 × 1日1 × 7日 = 14
  assertClose(calcNeed(petFood, family({ pets: 2 })), 14);
  // ペットがいなければ 0（null ではない: pet列に値があるため）
  assertClose(calcNeed(petFood, family({ adults: 2 })), 0);
});

test("年代ごとに違う needs 列（安全側=男性値）が使われる", () => {
  const water = itemById(1);
  // あかちゃん1人: infantsMale 2.4 × 7 = 16.8
  assertClose(calcNeed(water, family({ babies: 1 })), 16.8);
  // 高齢者1人: agedMale 3 × 7 = 21
  assertClose(calcNeed(water, family({ seniors: 1 })), 21);
  // 中高生1人: child2Male 3 × 7 = 21
  assertClose(calcNeed(water, family({ teens: 1 })), 21);
});

test("fallbackNeed はペットを除いた人数", () => {
  assert.equal(fallbackNeed(family({ adults: 2, kids: 2 })), 4);
  assert.equal(fallbackNeed(family({ adults: 1, pets: 3 })), 1);
  assert.equal(
    fallbackNeed(family({ adults: 1, teens: 1, kids: 1, babies: 1, seniors: 1 })),
    5
  );
});

test("formatQty は小数第1位に切り上げる", () => {
  assert.equal(formatQty(5.25, "L"), "5.3");
  assert.equal(formatQty(84, "缶"), "84"); // 整数はそのまま
  assert.equal(formatQty(75.61, "L"), "75.7");
  assert.equal(formatQty(0, "個"), "0");
  // 浮動小数点誤差（10.8*7 = 75.60000...01 など）でも余計に切り上がらない
  assert.equal(formatQty(10.8 * 7, "L"), "75.6");
});
