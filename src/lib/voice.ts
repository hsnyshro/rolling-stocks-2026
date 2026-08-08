// どうぶつのセリフ（定型文）
// ネットが無くても必ずしゃべれるように、ローカルの定型文を土台にする。
// AI生成のセリフ（/api/voice）はこの上に「置き換え」で重ねる（デモの保険）
import type { Mood } from "./expiry";

// {name} = キャラ名, {item} = 品物名, {days} = 期限までの日数
const LINES: Record<Mood, string[]> = {
  calm: [
    "きょうも へいわだね〜",
    "そなえが あるって あんしんだね",
    "{name}、ここの くらし きにいってるよ",
    "たまには ようすを 見にきてね",
  ],
  restless: [
    "そろそろ {item}の きげんが きになる ころ…",
    "あと{days}日くらいで たべごろが おわっちゃう",
    "ねえねえ、こんど ごはんに つかってみない？",
  ],
  begging: [
    "あそんで！ あと{days}日で きげんが きちゃう！",
    "いまが たべごろ！ ぼくを つかって ごはんに して〜",
    "きげんが くる前に たべてあげて！ そして あたらしいのを よろしくね",
  ],
  sad: [
    "きげんが すぎちゃったかも…。においと 見た目を たしかめてね",
    "「賞味期限」なら すぐには だめじゃないよ。よく見て きめてね",
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
