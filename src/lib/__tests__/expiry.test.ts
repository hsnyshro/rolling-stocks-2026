// expiry.ts のテスト: 期限の推測・絞り込み・残り日数・気分
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  guessExpiry,
  narrowExpiry,
  daysUntil,
  stageLabel,
  moodOf,
  soonestExpiry,
  toYMD,
} from "../expiry";
import type { ExpiryLot, Stock } from "../types";

// テスト用の「今日」= 2026-08-09（ローカル時刻）
const TODAY = new Date(2026, 7, 9);

test("guessExpiry: 今日 + 保存期間（月）", () => {
  assert.equal(guessExpiry(12, TODAY), "2027-08-09");
  assert.equal(guessExpiry(6, TODAY), "2027-02-09");
  // 年またぎ
  assert.equal(guessExpiry(5, new Date(2026, 9, 15)), "2027-03-15");
});

test("guessExpiry: 足した先に同じ日が無い月は月末に丸める（1/31 + 1ヶ月 = 2/28）", () => {
  assert.equal(guessExpiry(1, new Date(2026, 0, 31)), "2026-02-28");
  // うるう年なら 2/29
  assert.equal(guessExpiry(1, new Date(2028, 0, 31)), "2028-02-29");
});

test("narrowExpiry: 購入推定日 + 保存期間", () => {
  // recent = 今日買った → guessExpiry と同じ
  assert.equal(narrowExpiry("recent", 12, TODAY), guessExpiry(12, TODAY));
  // lastMonth = 1ヶ月前に買った: 2026-07-09 + 6ヶ月 = 2027-01-09
  assert.equal(narrowExpiry("lastMonth", 6, TODAY), "2027-01-09");
  // halfYear = 半年前に買った: 2026-02-09 + 12ヶ月 = 2027-02-09
  assert.equal(narrowExpiry("halfYear", 12, TODAY), "2027-02-09");
});

test("narrowExpiry: 過去日になってもそのまま返す（UIで「確認してね」を出すため）", () => {
  // 半年前に買った + 保存4ヶ月 = 2026-06-09（すでに期限切れ）
  const result = narrowExpiry("halfYear", 4, TODAY);
  assert.equal(result, "2026-06-09");
  assert.ok(result < toYMD(TODAY), "今日より過去の日付のはず");
  // 1年以上前に買った + 12ヶ月 = ちょうど今日
  assert.equal(narrowExpiry("overYear", 12, TODAY), "2026-08-09");
});

test("daysUntil: 残り日数（今日=0、過去はマイナス）", () => {
  assert.equal(daysUntil("2026-08-16", TODAY), 7);
  assert.equal(daysUntil("2026-08-10", TODAY), 1);
  assert.equal(daysUntil("2026-08-09", TODAY), 0);
  assert.equal(daysUntil("2026-08-01", TODAY), -8);
  // 時刻は無視する（23:59でも日付が同じなら結果は同じ）
  assert.equal(daysUntil("2026-08-16", new Date(2026, 7, 9, 23, 59)), 7);
  // 月またぎ・年またぎ
  assert.equal(daysUntil("2026-09-09", TODAY), 31);
  assert.equal(daysUntil("2027-08-09", TODAY), 365);
});

test("stageLabel: 3段階のラベル", () => {
  assert.equal(stageLabel("guessed"), "たぶん");
  assert.equal(stageLabel("narrowed"), "だいたい");
  assert.equal(stageLabel("confirmed"), "確認済み");
});

test("soonestExpiry: 期限が一番近い lot を返す", () => {
  const lot = (id: string, expiresOn: string): ExpiryLot => ({
    id,
    qty: 1,
    expiresOn,
    stage: "confirmed",
    kind: "best-before",
  });
  const stock: Stock = {
    itemId: 1,
    qty: 3,
    lots: [lot("far", "2026-12-01"), lot("near", "2026-08-20"), lot("mid", "2026-10-01")],
    stars: 0,
    pendingRotations: 0,
  };
  assert.equal(soonestExpiry(stock)?.id, "near");
  // 記録が無ければ undefined
  assert.equal(soonestExpiry({ ...stock, lots: [] }), undefined);
});

test("moodOf: 境界値（0, 1, 7, 8, 14, 15）", () => {
  assert.equal(moodOf(15), "calm"); // >14
  assert.equal(moodOf(14), "restless"); // 8〜14
  assert.equal(moodOf(8), "restless");
  assert.equal(moodOf(7), "begging"); // 1〜7
  assert.equal(moodOf(1), "begging");
  assert.equal(moodOf(0), "sad"); // <=0
  assert.equal(moodOf(-5), "sad");
  assert.equal(moodOf(100), "calm");
});
