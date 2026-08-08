// inventory.ts のテスト: 置き換え / 買い足し / 食べた（すべて純関数）
import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceCount, addCount, consume } from "../inventory";
import type { ExpiryLot, Stock } from "../types";

// テスト用の「今日」= 2026-08-09
const TODAY = new Date(2026, 7, 9);

/** 期限のまとまり（lot）を作るヘルパー */
function lot(id: string, qty: number, expiresOn: string): ExpiryLot {
  return { id, qty, expiresOn, stage: "confirmed", kind: "best-before" };
}

/** 在庫を作るヘルパー */
function stock(over: Partial<Stock> = {}): Stock {
  return { itemId: 1, qty: 3, lots: [], stars: 0, pendingRotations: 0, ...over };
}

test("replaceCount: qty を置き換えても lots は必ず保持される", () => {
  const original = stock({
    qty: 5,
    lots: [lot("a", 2, "2026-12-01")],
    stars: 2,
    pendingRotations: 1,
  });
  const result = replaceCount(original, 8);
  assert.equal(result.qty, 8);
  // 数え直しても確認済みの期限は消えない（企画の確定ルール）
  assert.deepEqual(result.lots, [lot("a", 2, "2026-12-01")]);
  assert.equal(result.stars, 2);
  assert.equal(result.pendingRotations, 1);
  // 元のオブジェクトは変更されない（純関数）
  assert.equal(original.qty, 5);
});

test("replaceCount: マイナスは 0 に丸める", () => {
  assert.equal(replaceCount(stock(), -3).qty, 0);
});

test("addCount: qty が増え、lot があれば lots に追加される", () => {
  const original = stock({ qty: 3, lots: [lot("a", 1, "2026-10-01")] });
  const newLot = lot("b", 2, "2027-08-01");
  const result = addCount(original, 2, newLot);
  assert.equal(result.qty, 5);
  assert.deepEqual(result.lots, [lot("a", 1, "2026-10-01"), newLot]);
  // lot なしでも qty だけ増やせる
  const result2 = addCount(original, 1);
  assert.equal(result2.qty, 4);
  assert.deepEqual(result2.lots, original.lots);
  // 元のオブジェクトは変更されない
  assert.equal(original.qty, 3);
  assert.equal(original.lots.length, 1);
});

test("addCount: pendingRotations があれば星に変わる（1回の買い足しで1つ）", () => {
  const original = stock({ pendingRotations: 2, stars: 0 });
  const result = addCount(original, 1);
  assert.equal(result.stars, 1);
  assert.equal(result.pendingRotations, 1);
  // pendingRotations が 0 なら星は増えない
  const result2 = addCount(stock({ pendingRotations: 0, stars: 3 }), 1);
  assert.equal(result2.stars, 3);
});

test("consume: 期限が一番近い lot から減る（古い方から食べる）", () => {
  // わざと期限が遠い順に並べておく
  const original = stock({
    qty: 3,
    lots: [lot("far", 2, "2026-12-01"), lot("near", 1, "2026-08-20")],
  });
  const result = consume(original, TODAY, 1);
  assert.equal(result.qty, 2);
  // near(8/20) が先に食べられて qty 0 → 削除。far はそのまま残る
  assert.deepEqual(result.lots, [lot("far", 2, "2026-12-01")]);
  // 期限(8/20)は今日(8/9)より後 = 期限前に食べた → pendingRotations +1
  assert.equal(result.pendingRotations, 1);
  // 元のオブジェクトは変更されない
  assert.equal(original.qty, 3);
  assert.equal(original.lots.length, 2);
});

test("consume: n が lot をまたぐと次に近い lot からも減る", () => {
  const original = stock({
    qty: 5,
    lots: [lot("near", 1, "2026-08-20"), lot("far", 2, "2026-12-01")],
  });
  const result = consume(original, TODAY, 2);
  assert.equal(result.qty, 3);
  // near は消え、far は 2→1 に減る
  assert.deepEqual(result.lots, [lot("far", 1, "2026-12-01")]);
});

test("consume: 期限切れの分を食べても pendingRotations は増えない", () => {
  const original = stock({ qty: 2, lots: [lot("old", 2, "2026-08-01")] });
  const result = consume(original, TODAY, 1);
  assert.equal(result.qty, 1);
  assert.equal(result.pendingRotations, 0);
  assert.deepEqual(result.lots, [lot("old", 1, "2026-08-01")]);
});

test("consume: qty は 0 未満にならない", () => {
  const result = consume(stock({ qty: 1, lots: [] }), TODAY, 5);
  assert.equal(result.qty, 0);
});

test("consume: qty が 0 のときは何も起きない", () => {
  const original = stock({ qty: 0, lots: [lot("a", 1, "2026-12-01")] });
  const result = consume(original, TODAY, 1);
  assert.deepEqual(result, original);
});

test("ローリングストック一周: 期限前に食べる → 買い足す → 星が増える", () => {
  const start = stock({ qty: 2, lots: [lot("a", 2, "2026-09-01")] });
  // 期限(9/1)より前に1つ食べる
  const afterEat = consume(start, TODAY, 1);
  assert.equal(afterEat.pendingRotations, 1);
  assert.equal(afterEat.stars, 0);
  // 買い足す → 星1つ
  const afterBuy = addCount(afterEat, 1, lot("b", 1, "2027-08-01"));
  assert.equal(afterBuy.stars, 1);
  assert.equal(afterBuy.pendingRotations, 0);
  assert.equal(afterBuy.qty, 2);
});
