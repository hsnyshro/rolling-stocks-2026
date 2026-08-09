// 動物の成長段階: 星（期限前に食べて買い足した回数 = stock.stars）で決まる
// 備蓄率は家（⛺/🏠）の見た目、星は体の成長、と役割を分けている

export type GrowthStage = "baby" | "child" | "adult";

/** 動物の絵の種類。normal/begging/happy は表情、walk は歩き2コマ目、eating は食べる仕草 */
export type SpriteExpression = "normal" | "begging" | "happy" | "walk" | "eating";

/** 成長のしきい値（この星の数に届いたら次の段階へ）。調整はここ1か所 */
export const GROWTH_THRESHOLDS = {
  child: 2,
  adult: 5,
} as const;

export function growthStage(stars: number): GrowthStage {
  if (stars >= GROWTH_THRESHOLDS.adult) return "adult";
  if (stars >= GROWTH_THRESHOLDS.child) return "child";
  return "baby";
}

/**
 * 画像パスの組み立て。大人は既存36枚の命名（段階なし）をそのまま使う。
 * baby/child は {slug}-{stage}-{expression}.png
 */
export function spriteFile(
  slug: string,
  stage: GrowthStage,
  expression: SpriteExpression
): string {
  return stage === "adult"
    ? `/animals/${slug}-${expression}.png`
    : `/animals/${slug}-${stage}-${expression}.png`;
}
