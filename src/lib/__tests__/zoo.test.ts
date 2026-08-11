import { test } from "node:test";
import assert from "node:assert/strict";
import { GROUPS, animalFor, groupOf, stockedItemIds } from "../zoo";
import stockpileData from "../../data/stockpile.json";
import animalsData from "../../data/animals.json";
import type { Stock } from "../types";

function emptyStock(itemId: number, qty: number): Stock {
  return { itemId, qty, lots: [], stars: 0, pendingRotations: 0 };
}

test("グループ8個で55品目、重複なし", () => {
  assert.equal(GROUPS.length, 8);
  const all = GROUPS.flatMap((g) => g.itemIds);
  assert.equal(all.length, 55);
  assert.equal(new Set(all).size, 55, "グループ間で品目IDが重複している");
});

test("既存12匹+グループで全67品目を過不足なくカバー", () => {
  const own = animalsData.animals.map((a) => a.itemId);
  const grouped = GROUPS.flatMap((g) => g.itemIds);
  const covered = new Set([...own, ...grouped]);
  const itemIds = stockpileData.items.map((i) => i.id);
  assert.equal(covered.size, itemIds.length, "カバー数が品目数と一致しない");
  for (const id of itemIds) {
    assert.ok(covered.has(id), `品目ID ${id} に動物がいない`);
  }
  // 既存12匹の担当品目はどのグループにも入っていない
  for (const id of own) {
    assert.equal(groupOf(id), undefined, `品目ID ${id} が既存動物とグループの両方にいる`);
  }
});

test("groupOf: グループ品目はグループを返す", () => {
  assert.equal(groupOf(30)?.key, "power"); // 乾電池
  assert.equal(groupOf(63)?.key, "pet"); // ペットフード
  assert.equal(groupOf(1), undefined); // 水はみずまる担当
  assert.equal(groupOf(999), undefined);
});

test("animalFor: 既存12匹はそのまま返す", () => {
  const a = animalFor(1);
  assert.equal(a?.name, "みずまる");
  assert.equal(a?.slug, "mizumaru");
});

test("animalFor: グループ品目は合成動物を返す", () => {
  const a = animalFor(30); // 乾電池 → ぴかろう
  assert.equal(a?.name, "ぴかろう");
  assert.equal(a?.species, "フクロウ");
  assert.equal(a?.slug, "pikaro");
  assert.equal(a?.emoji, "🦉");
  assert.equal(a?.itemId, 30);
  assert.equal(a?.shelfLifeMonths, 12);
});

test("animalFor: 担当のない品目IDはundefined", () => {
  assert.equal(animalFor(999), undefined);
});

test("stockedItemIds: qty>0の品目だけをitemIds順で返す", () => {
  const power = GROUPS.find((g) => g.key === "power")!;
  const stocks: Record<number, Stock> = {
    30: emptyStock(30, 2), // 乾電池あり
    29: emptyStock(29, 0), // 懐中電灯ゼロ
    59: emptyStock(59, 1), // LEDランタンあり
  };
  assert.deepEqual(stockedItemIds(power, stocks), [30, 59]);
  assert.deepEqual(stockedItemIds(power, {}), []);
});
