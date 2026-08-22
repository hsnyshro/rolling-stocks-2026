// extractJson: モデルの返事（前置き文や ```json 付き）からJSONだけを取り出せるか
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../workersAiVision";

test("```json フェンス付きの返事からJSONを取り出せる", () => {
  const text = '以下が結果です。\n```json\n{"found": true, "date": "2027-04-15"}\n```';
  assert.deepEqual(extractJson(text), { found: true, date: "2027-04-15" });
});

test("入れ子の配列を含むJSONも末尾の } まで正しく切り出す", () => {
  const text = '{"found":[{"itemId":1,"count":10,"confidence":"high"}]} おわり';
  assert.deepEqual(extractJson<{ found: unknown[] }>(text)?.found.length, 1);
});

test("JSONが無い・壊れている・nullなら null", () => {
  assert.equal(extractJson("読み取れませんでした"), null);
  assert.equal(extractJson("{found: true"), null);
  assert.equal(extractJson(null), null);
});
