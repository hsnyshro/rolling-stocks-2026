// 声の個性マッピング（純関数部分）のテスト。
// 効果音・読み上げ本体はブラウザ専用APIなので、ここでは扱わない
import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceProfile } from "../sound";
import animalsData from "../../data/animals.json";
import groupsData from "../../data/groups.json";

test("全20匹のspeciesに声の設定がある（デフォルトに落ちない）", () => {
  const species = [
    ...animalsData.animals.map((a) => a.species),
    ...groupsData.groups.map((g) => g.species),
  ];
  assert.equal(species.length, 20);
  const fallback = voiceProfile("知らない動物");
  for (const s of species) {
    const v = voiceProfile(s);
    assert.notDeepEqual(
      v,
      fallback,
      `${s} の声が未設定（デフォルトと同じ）になっている`
    );
  }
});

test("pitchとrateはWeb Speech APIの有効範囲に収まる", () => {
  const species = [
    ...animalsData.animals.map((a) => a.species),
    ...groupsData.groups.map((g) => g.species),
    "知らない動物",
  ];
  for (const s of species) {
    const v = voiceProfile(s);
    assert.ok(v.pitch >= 0 && v.pitch <= 2, `${s} のpitchが範囲外: ${v.pitch}`);
    assert.ok(v.rate >= 0.5 && v.rate <= 2, `${s} のrateが極端: ${v.rate}`);
  }
});

test("同じspeciesなら常に同じ声（決定的）で、大きい動物は低い声", () => {
  assert.deepEqual(voiceProfile("クマ"), voiceProfile("クマ"));
  // 個性づけの狙い: クマ・カメは低め、ネズミ・ハムスターは高め
  assert.ok(voiceProfile("クマ").pitch < voiceProfile("ネズミ").pitch);
  assert.ok(voiceProfile("カメ").rate < voiceProfile("ハムスター").rate);
});

test("speciesなし・未知でも安全なデフォルトを返す", () => {
  for (const v of [voiceProfile(undefined), voiceProfile("ドラゴン")]) {
    assert.ok(v.pitch >= 0 && v.pitch <= 2);
    assert.ok(v.rate >= 0.5 && v.rate <= 2);
  }
});
