// どうぶつのセリフ（定型文）
// ネットが無くても必ずしゃべれるように、ローカルの定型文を土台にする。
// AI生成のセリフ（/api/voice）はこの上に「置き換え」で重ねる（デモの保険）
import type { Mood } from "./expiry";

// {name} = キャラ名, {item} = 品物名, {days} = 期限までの日数
// 食品用の定型文（食べる・買い足す方向のセリフ）
const LINES: Record<Mood, string[]> = {
  calm: [
    "今日も平和だね〜",
    "備えがあるって安心だね",
    "{name}、ここの暮らし気に入ってるよ",
    "たまには様子を見に来てね",
  ],
  restless: [
    "そろそろ{item}の期限が気になるころ…",
    "あと{days}日くらいで食べごろが終わっちゃう",
    "ねえねえ、今度ごはんに使ってみない？",
  ],
  begging: [
    "あそんで！あと{days}日で期限が来ちゃう！",
    "今が食べごろ！ぼくを使ってごはんにして〜",
    "期限が来る前に食べてあげて！そして新しいのをよろしくね",
  ],
  sad: [
    "期限が過ぎちゃったかも…。においと見た目を確かめてね",
    "「賞味期限」ならすぐにダメになるわけじゃないよ。よく見て決めてね",
  ],
};

// 非食品用の定型文（乾電池・マスクなど「食べない」品目向け。使う・交換する方向のセリフ）
// calm は食品でも非食品でも自然に使える汎用文なので、LINES.calm をそのまま共有する
const NON_FOOD_LINES: Record<"restless" | "begging" | "sad", string[]> = {
  restless: [
    "そろそろ{item}の期限が気になるころ…",
    "あと{days}日くらいで使いどきが終わっちゃう",
    "ねえねえ、そろそろ使ってみない？",
  ],
  begging: [
    "あそんで！あと{days}日で期限が来ちゃう！",
    "今が使いどき！ぼくを使って備え直して〜",
    "期限が来る前に使ってあげて！そして新しいのと交換してね",
  ],
  sad: [
    "期限が過ぎちゃったかも…。使えるかどうか確かめてね",
    "期限を過ぎても、すぐ使えなくなるわけじゃないよ。よく確かめてね",
  ],
};

/**
 * 定型文からセリフを1つ選ぶ。
 * seed に同じ数を渡せば同じセリフになる（日付を渡せば「1日1セリフ」にできる）
 * isFood: 食品なら食べる方向、非食品なら使う方向のセリフになる（省略時は食品扱い）
 */
export function localVoice(
  mood: Mood,
  vars: { name: string; item: string; days: number | null },
  seed: number,
  isFood: boolean = true
): string {
  const pool =
    isFood || mood === "calm" ? LINES[mood] : NON_FOOD_LINES[mood];
  const line = pool[Math.abs(seed) % pool.length];
  return line
    .replaceAll("{name}", vars.name)
    .replaceAll("{item}", vars.item)
    .replaceAll("{days}", String(vars.days ?? "?"));
}
