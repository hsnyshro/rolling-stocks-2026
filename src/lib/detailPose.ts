// 詳細ページの動物の「いまの絵と動き」を決める純関数。
// 演出がかぶった時の優先順位を1か所に集約する（テスト対象）:
// お祝い > もぐもぐ > タップの喜び > おねだり > しょんぼり > ランダム仕草 > 基本表情
import type { Mood } from "./expiry";
import type { SpriteExpression } from "./growth";

/** ランダム仕草の種類（はねる / ソワソワ / きょろっと向きを変える） */
export const IDLE_GESTURES = [
  "gesture-hop",
  "gesture-fidget",
  "gesture-turn",
] as const;
export type IdleGesture = (typeof IDLE_GESTURES)[number];

/** 実行中の演出。celebrate=星ゲット / eat=もぐもぐ / tap=タップの喜び */
export type DetailAction = "celebrate" | "eat" | "tap" | IdleGesture | null;

export interface DetailPose {
  expression: SpriteExpression;
  /** 付与するCSSアニメクラス。動きなしは "" */
  motion: string;
  /** 左右反転するか（きょろっの仕草） */
  flipped: boolean;
}

export function detailPose(input: {
  action: DetailAction;
  mood: Mood;
  isLit: boolean;
  reduced: boolean;
}): DetailPose {
  const { action, mood, isLit, reduced } = input;
  // 動きを減らす設定では動きクラスを一切付けない（絵の切り替えだけ残す）
  const motion = (cls: string) => (reduced ? "" : cls);
  const still = { motion: "", flipped: false };

  if (action === "celebrate")
    return { expression: "happy", motion: motion("animate-star-jump"), flipped: false };
  if (action === "eat")
    return { expression: "eating", motion: motion("animate-munch"), flipped: false };
  if (action === "tap")
    return { expression: "happy", motion: motion("animate-joy-hop"), flipped: false };
  if (mood === "begging")
    return { expression: "begging", motion: motion("animate-hop"), flipped: false };
  if (mood === "sad")
    return { expression: "normal", motion: motion("animate-droop"), flipped: false };
  if (action === "gesture-hop")
    return { expression: "happy", motion: motion("animate-gesture-hop"), flipped: false };
  if (action === "gesture-fidget")
    return { expression: "walk", motion: motion("animate-fidget"), flipped: false };

  // 基本表情: 満タン&機嫌よし（calm/restless）ならにっこり
  const expression: SpriteExpression =
    isLit && (mood === "calm" || mood === "restless") ? "happy" : "normal";
  if (action === "gesture-turn")
    return { expression, motion: "", flipped: !reduced };
  return { expression, ...still };
}

/** ランダム仕草を1つ選ぶ。rand は 0以上1未満（Math.random を注入してテスト可能に） */
export function pickGesture(rand: number): IdleGesture {
  const i = Math.min(IDLE_GESTURES.length - 1, Math.floor(rand * IDLE_GESTURES.length));
  return IDLE_GESTURES[i];
}

/** 次の仕草までの待ち時間(ms): 10〜20秒 */
export function gestureDelay(rand: number): number {
  return 10000 + Math.floor(rand * 10000);
}

/** 仕草の長さ(ms)。CSSアニメの長さと合わせる */
export function gestureDuration(g: IdleGesture): number {
  return g === "gesture-hop" ? 1200 : 2000;
}
