// village.ts のテスト: 枠の状態と上部ゲージ
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plotState, villageGauge } from "../village";
import type { Animal, Family, Stock, StockpileItem } from "../types";

// 実データを読み込む
const stockpile = JSON.parse(
  readFileSync(new URL("../../data/stockpile.json", import.meta.url), "utf8")
) as { items: StockpileItem[] };
const animalsData = JSON.parse(
  readFileSync(new URL("../../data/animals.json", import.meta.url), "utf8")
) as { animals: Animal[] };

const ITEMS = stockpile.items;
const ANIMALS = animalsData.animals;

/** 家族構成を作るヘルパー */
function family(over: Partial<Family> = {}): Family {
  return { adults: 0, teens: 0, kids: 0, babies: 0, seniors: 0, pets: 0, ...over };
}

/** 在庫を作るヘルパー（期限などはゲージ計算に関係ないので空でよい） */
function stock(itemId: number, qty: number): Stock {
  return { itemId, qty, lots: [], stars: 0, pendingRotations: 0 };
}

test("plotState: 0=empty / 1個以上=resident / 必要量到達=lit", () => {
  const fam = family({ adults: 2, kids: 2 });
  assert.equal(plotState(0, 10, fam), "empty");
  assert.equal(plotState(1, 10, fam), "resident");
  assert.equal(plotState(10, 10, fam), "lit");
  assert.equal(plotState(11, 10, fam), "lit");
});

test("plotState: need が null なら「1人1個」ルール（ペット除く人数）で判定", () => {
  const fam = family({ adults: 2, kids: 2 }); // 4人
  assert.equal(plotState(3, null, fam), "resident");
  assert.equal(plotState(4, null, fam), "lit");
  // ペットは人数に入らない
  const withPets = family({ adults: 2, pets: 3 }); // 人は2人
  assert.equal(plotState(2, null, withPets), "lit");
});

test("villageGauge: litCount と days（大人1人の例）", () => {
  const fam = family({ adults: 1 });
  const stocks = [
    stock(1, 6), // 水 6L: 1日3L → 2日分。7日分(21L)には届かず resident
    stock(2, 3), // レトルトご飯 3食: 1日3食 → 1日分。resident
    stock(4, 7), // 缶詰 7缶: 必要量(1×1×7=7)に到達 → lit
  ];
  const result = villageGauge(stocks, ITEMS, ANIMALS, fam);
  assert.equal(result.total, 12); // 村のどうぶつは12匹
  assert.equal(result.litCount, 1); // 缶詰(さばにゃん)だけ lit
  // days = min(水 6/3=2日, 食べもの 3/3 + 7/1 = 8日) = 2
  assert.equal(result.days, 2);
});

test("villageGauge: days は小数第1位まで", () => {
  const fam = family({ adults: 1 });
  const stocks = [
    stock(1, 5), // 水 5L ÷ 3L/日 = 1.666... → 1.7
    stock(4, 100), // 食べものはたっぷり
  ];
  const result = villageGauge(stocks, ITEMS, ANIMALS, fam);
  assert.equal(result.days, 1.7);
});

test("villageGauge: 在庫ゼロなら days=0, litCount=0", () => {
  const result = villageGauge([], ITEMS, ANIMALS, family({ adults: 2 }));
  assert.equal(result.litCount, 0);
  assert.equal(result.days, 0);
});

test("villageGauge: needs が null の品目（お菓子）は days の計算から除外される", () => {
  const fam = family({ adults: 1 });
  // お菓子だけ大量にあっても days は増えない（水も他の食品も無いので0日）
  const stocks = [stock(13, 999)];
  const result = villageGauge(stocks, ITEMS, ANIMALS, fam);
  assert.equal(result.days, 0);
  // ただし枠としては「1人1個」ルールで lit になる（おかしりすは満足）
  assert.equal(result.litCount, 1);
});

test("villageGauge: 水が足りないと食べものが多くても days は水で頭打ち", () => {
  const fam = family({ adults: 1 });
  const stocks = [
    stock(1, 3), // 水1日分
    stock(3, 50), // レトルト食品50個 = 50日分
    stock(55, 30), // フリーズドライ30食 = 30日分
  ];
  const result = villageGauge(stocks, ITEMS, ANIMALS, fam);
  assert.equal(result.days, 1); // min(1, 80) = 1
});
