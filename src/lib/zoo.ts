// 品目→動物の解決。既存12匹（1品目1匹）とグループ動物（1グループ1種）を
// 同じ Animal 型で返すので、詳細ページ・おしゃべり・スプライトは無改修で動く
import animalsData from "@/data/animals.json";
import groupsData from "@/data/groups.json";
import stockpileData from "@/data/stockpile.json";
import type { Animal, Group, Stock, StockpileItem } from "./types";

const animals = animalsData.animals as Animal[];
const stockpileItems = stockpileData.items as StockpileItem[];

/** 全グループ（表示順もこの順） */
export const GROUPS = groupsData.groups as Group[];

/** 品目が属するグループ。既存12匹の担当品目やグループ外はundefined */
export function groupOf(itemId: number): Group | undefined {
  return GROUPS.find((g) => g.itemIds.includes(itemId));
}

/**
 * 品目の担当動物。既存12匹はそのまま、グループ品目はグループの動物を
 * Animal 型に合成して返す（賞味期限の推測は安全側の12か月）
 */
export function animalFor(itemId: number): Animal | undefined {
  const own = animals.find((a) => a.itemId === itemId);
  if (own) return own;
  const g = groupOf(itemId);
  if (!g) return undefined;
  return {
    itemId,
    name: g.animalName,
    species: g.species,
    emoji: g.emoji,
    slug: g.slug,
    shelfLifeMonths: 12,
    profile: g.profile,
  };
}

/** グループ内で在庫（qty>0）のある品目ID。帯に出す個体のぶんだけ返る（itemIds順） */
export function stockedItemIds(
  group: Group,
  stocks: Record<number, Stock>
): number[] {
  return group.itemIds.filter((id) => (stocks[id]?.qty ?? 0) > 0);
}

/**
 * 品目が食品かどうか。stockpile.json の category が「食品」の品目だけを食品とみなす
 * （groupOf は使えない: nutritionグループは食品の一部しか含まず、既存12匹の食品はどのグループにも属さない）
 */
export function isFoodItem(itemId: number): boolean {
  return stockpileItems.find((i) => i.id === itemId)?.category === "食品";
}
