// voice.ts のテスト: 定型文の食品/非食品分岐（I-3対応）
import { test } from "node:test";
import assert from "node:assert/strict";
import { localVoice } from "../voice";

const vars = { name: "ぴかろう", item: "乾電池", days: 5 };

test("isFood=false: begging/restless/sadは食べる前提ではない非食品用の文言になる", () => {
  assert.equal(
    localVoice("begging", vars, 1, false),
    "今が使いどき！ぼくを使って備え直して〜"
  );
  assert.equal(
    localVoice("restless", vars, 1, false),
    "あと5日くらいで使いどきが終わっちゃう"
  );
  assert.equal(
    localVoice("sad", vars, 1, false),
    "期限を過ぎても、すぐ使えなくなるわけじゃないよ。よく確かめてね"
  );
});

test("isFoodを省略/trueなら従来どおり食品用の文言。calmはisFoodに関わらず共通", () => {
  assert.equal(
    localVoice("begging", vars, 1),
    "今が食べごろ！ぼくを使ってごはんにして〜"
  );
  assert.equal(
    localVoice("begging", vars, 1, true),
    "今が食べごろ！ぼくを使ってごはんにして〜"
  );
  assert.equal(
    localVoice("calm", vars, 2, false),
    localVoice("calm", vars, 2, true)
  );
});
