// 家族構成 → 必要量の計算
import type { Family, StockpileItem } from "./types";

// Family の各グループと needs 列の対応。
// UIでは男女を分けないので、必要量が多い方（安全側 = 男性値）の列を使う
const NEED_COLUMNS: ReadonlyArray<
  readonly [keyof Family, keyof StockpileItem["needs"]]
> = [
  ["adults", "adultMale"],
  ["teens", "child2Male"],
  ["kids", "child1Male"],
  ["babies", "infantsMale"],
  ["seniors", "agedMale"],
  ["pets", "pet"],
];

/**
 * この家族が days 日間しのぐのに必要な量を計算する。
 * 合計 = Σ(人数 × 1日必要量) × days
 * 該当する needs 列が全部 null の品目（人数比例で計算できない品目）は null を返す。
 */
export function calcNeed(
  item: StockpileItem,
  family: Family,
  days = 7
): number | null {
  let perDayTotal = 0;
  let hasAnyValue = false;
  for (const [familyKey, needKey] of NEED_COLUMNS) {
    const perDay = item.needs[needKey];
    if (perDay === null) continue; // この年代の目安なし → 数えない
    hasAnyValue = true;
    perDayTotal += family[familyKey] * perDay;
  }
  if (!hasAnyValue) return null; // 全列 null = 人数比例ではない品目
  return perDayTotal * days;
}

/**
 * needs が null の品目の点灯判定に使う「1人1個」ルールの必要量。
 * ペットを除いた人数（adults + teens + kids + babies + seniors）を返す。
 */
export function fallbackNeed(family: Family): number {
  return (
    family.adults + family.teens + family.kids + family.babies + family.seniors
  );
}

/**
 * 「適量」「適宜」のような、数を数える単位ではない品目か？
 * （例: 調味料セット・乾物。備蓄ナビが個数の目安を決めていない）
 * この品目は必要量の数字を見せず、村では「1人1個」ルール（fallbackNeed）で扱う。
 */
export function isVagueUnit(unit: string): boolean {
  return unit.includes("適量") || unit.includes("適宜");
}

/**
 * 村・たなおろし・詳細画面で使う「実効必要量」。
 * - needs が計算できて単位も数えられる → 備蓄ナビの計算値をそのまま
 * - needs が全null、または単位が「適量/適宜」 → 1人1個ルール（自前ルール。単位は「こ」）
 */
export function effectiveNeed(
  item: StockpileItem,
  family: Family,
  days = 7
): { value: number; unit: string; isFallback: boolean } {
  const need = calcNeed(item, family, days);
  if (need === null || isVagueUnit(item.unit)) {
    return { value: fallbackNeed(family), unit: "こ", isFallback: true };
  }
  return { value: need, unit: item.unit, isFallback: false };
}

/**
 * 数量を表示用文字列にする。小数第1位に「切り上げ」て返す（例: 5.25 → "5.3", 84 → "84"）。
 * unit は表示フォーマットの将来拡張用に受け取るが、現状は数値部分のみ返す
 * （単位の表示位置は呼び出し側=UIが決める）。
 */
export function formatQty(n: number, unit: string): string {
  void unit; // 未使用（シグネチャ維持のため受け取る）
  // 浮動小数点誤差（例: 84 が 84.0000000001 になる）で余計に切り上がらないよう、
  // ごく小さい値を引いてから切り上げる
  const rounded = Math.ceil(n * 10 - 1e-9) / 10;
  return String(rounded);
}
