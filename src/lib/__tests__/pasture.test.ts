// pasture.ts のテスト: なわばり定義と歩行地点の計算
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TERRITORIES, territoryOf, pickWaypoint } from "../pasture";
import type { Animal } from "../types";

const animalsData = JSON.parse(
  readFileSync(new URL("../../data/animals.json", import.meta.url), "utf8")
) as { animals: Animal[] };

test("TERRITORIES: 12匹全員のなわばりが1つずつある", () => {
  const ids = TERRITORIES.map((t) => t.itemId).sort((a, b) => a - b);
  const expected = animalsData.animals.map((a) => a.itemId).sort((a, b) => a - b);
  assert.deepEqual(ids, expected);
});

test("TERRITORIES: なわばり全体（中心±半径）と家が画面内（0〜100%）に収まる", () => {
  for (const t of TERRITORIES) {
    assert.ok(t.cx - t.rx >= 0 && t.cx + t.rx <= 100, `itemId=${t.itemId} x方向はみ出し`);
    assert.ok(t.cy - t.ry >= 0 && t.cy + t.ry <= 100, `itemId=${t.itemId} y方向はみ出し`);
    assert.ok(t.homeX >= 0 && t.homeX <= 100 && t.homeY >= 0 && t.homeY <= 100);
    assert.ok(t.rx > 0 && t.ry > 0, "半径は正の数");
  }
});

test("territoryOf: 存在するIDはなわばりを返し、無いIDは undefined", () => {
  assert.equal(territoryOf(1)?.itemId, 1);
  assert.equal(territoryOf(999), undefined);
});

test("pickWaypoint: 常になわばりの楕円範囲内の有限な座標を返す", () => {
  const t = TERRITORIES[0];
  // 乱数の端（0と1ちょうど）も含めて確認する
  const randoms = [0, 0.25, 0.5, 0.75, 0.999, 1];
  for (const r of randoms) {
    const p = pickWaypoint(t, () => r);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= t.cx - t.rx && p.x <= t.cx + t.rx, `x=${p.x} がなわばり外`);
    assert.ok(p.y >= t.cy - t.ry && p.y <= t.cy + t.ry, `y=${p.y} がなわばり外`);
  }
  // 実際の乱数でも100回まわして範囲内
  for (let i = 0; i < 100; i++) {
    const p = pickWaypoint(t);
    assert.ok(p.x >= t.cx - t.rx && p.x <= t.cx + t.rx);
    assert.ok(p.y >= t.cy - t.ry && p.y <= t.cy + t.ry);
  }
});
