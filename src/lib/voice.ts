// どうぶつのセリフ（定型文）
// ネットが無くても必ずしゃべれるように、ローカルの定型文を土台にする。
// AI生成のセリフ（/api/voice）はこの上に「置き換え」で重ねる（デモの保険）
import type { Mood } from "./expiry";

// {name} = キャラ名, {item} = 品物名, {days} = 期限までの日数
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

/**
 * 定型文からセリフを1つ選ぶ。
 * seed に同じ数を渡せば同じセリフになる（日付を渡せば「1日1セリフ」にできる）
 */
export function localVoice(
  mood: Mood,
  vars: { name: string; item: string; days: number | null },
  seed: number
): string {
  const pool = LINES[mood];
  const line = pool[Math.abs(seed) % pool.length];
  return line
    .replaceAll("{name}", vars.name)
    .replaceAll("{item}", vars.item)
    .replaceAll("{days}", String(vars.days ?? "?"));
}
