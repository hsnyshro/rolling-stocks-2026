// 村の枠状態と上部ゲージの計算
import type { Animal, Family, PlotState, Stock, StockpileItem } from "./types";
import { calcNeed, fallbackNeed } from "./need";

/** 水の品目ID（東京備蓄ナビ） */
const WATER_ITEM_ID = 1;

/**
 * 村の1枠の状態。
 * 0個 = "empty"（空き地） / 1個以上 = "resident"（テント暮らし） / 必要量到達 = "lit"（おうちが光る）
 * need が null の品目（人数比例で計算できないもの）は「1人1個」ルール（fallbackNeed）で判定する。
 */
export function plotState(
  qty: number,
  need: number | null,
  family: Family
): PlotState {
  if (qty <= 0) return "empty";
  const threshold = need ?? fallbackNeed(family);
  return qty >= threshold ? "lit" : "resident";
}

/** 上部ゲージの計算結果 */
export interface VillageGauge {
  /** 村のどうぶつのうち「lit」（おうちが光っている）数 */
  litCount: number;
  /** 村のどうぶつの総数（= 12） */
  total: number;
  /** ざっくり何日分の備えか（小数第1位まで） */
  days: number;
}

/**
 * 村全体のゲージを計算する。
 *
 * days（何日分の備えか）は min(水の日数, 食べものの日数)。
 * - 水の日数 = 水(id=1)の qty ÷ 家族の1日必要量合計
 * - 食べものの日数 = 水以外の「食品」どうぶつ品目それぞれの qty ÷ 1日必要量 の合計
 *   （needs が全部 null の品目、例: お菓子・果物の缶詰は計算から除外）
 *
 * ※ この式は「人は水と食べものの両方が必要で、先に尽きる方がボトルネック」という
 *   ざっくりの目安であり、正確な栄養計算ではない。
 */
export function villageGauge(
  stocks: Stock[],
  items: StockpileItem[],
  animals: Animal[],
  family: Family
): VillageGauge {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const qtyByItemId = new Map(stocks.map((stock) => [stock.itemId, stock.qty]));
  const qtyOf = (itemId: number) => qtyByItemId.get(itemId) ?? 0;

  // ---- litCount: 12匹のうち何匹のおうちが光っているか ----
  let litCount = 0;
  for (const animal of animals) {
    const item = itemById.get(animal.itemId);
    if (!item) continue; // データ不整合は数えない
    const need = calcNeed(item, family); // 7日分の必要量
    if (plotState(qtyOf(animal.itemId), need, family) === "lit") {
      litCount += 1;
    }
  }

  // ---- 水の日数 ----
  let waterDays = 0;
  const waterItem = itemById.get(WATER_ITEM_ID);
  if (waterItem) {
    const perDay = calcNeed(waterItem, family, 1); // 家族の1日必要量合計
    if (perDay !== null && perDay > 0) {
      waterDays = qtyOf(WATER_ITEM_ID) / perDay;
    }
  }

  // ---- 食べものの日数（水以外の食品どうぶつ品目の合計） ----
  let foodDays = 0;
  for (const animal of animals) {
    if (animal.itemId === WATER_ITEM_ID) continue; // 水は別枠
    const item = itemById.get(animal.itemId);
    if (!item || item.category !== "食品") continue; // 食品どうぶつだけ数える
    const perDay = calcNeed(item, family, 1);
    if (perDay === null || perDay <= 0) continue; // needs が null の品目などは除外
    foodDays += qtyOf(animal.itemId) / perDay;
  }

  // 小数第1位までに丸める（在庫ゼロなら自然に 0 になる）
  const days = Math.round(Math.min(waterDays, foodDays) * 10) / 10;

  return { litCount, total: animals.length, days };
}
