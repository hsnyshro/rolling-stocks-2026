// 在庫の操作（置き換え / 買い足し / 食べた）
// すべて純関数: 引数の Stock は変更せず、新しいオブジェクトを返す
import type { ExpiryLot, Stock } from "./types";
import { toYMD } from "./expiry";

/**
 * 棚スキャンの「置き換え」: いま見えている数で qty を上書きする。
 * lots は必ず保持する（= 数え直しても、確認済みの期限は消えない。企画の確定ルール）。
 */
export function replaceCount(stock: Stock, newQty: number): Stock {
  return { ...stock, qty: Math.max(0, newQty) };
}

/**
 * 買い足し: qty を delta 増やし、期限のまとまり（lot）があれば lots に追加する。
 * さらに pendingRotations が残っていれば 1 消費して星を 1 つ増やす
 * （「期限前に食べて買い足した」= ローリングストック1周で星1つ、のルール）。
 */
export function addCount(stock: Stock, delta: number, lot?: ExpiryLot): Stock {
  const next: Stock = {
    ...stock,
    qty: Math.max(0, stock.qty + delta),
    lots: lot ? [...stock.lots, lot] : stock.lots,
  };
  if (next.pendingRotations > 0) {
    next.stars += 1;
    next.pendingRotations -= 1;
  }
  return next;
}

/**
 * 食べた: qty を n 減らす（最小0）。
 * lots は期限が一番近いものから減らす（古い方から食べる = ローリングストックの基本）。
 * qty が 0 になった lot は削除する。
 * 食べた分の期限が today より後（= 期限前に食べた）なら pendingRotations を 1 増やす。
 */
export function consume(stock: Stock, today: Date, n = 1): Stock {
  if (n <= 0 || stock.qty <= 0) return stock; // 食べるものがない

  const todayStr = toYMD(today);

  // 期限が近い順に並べる（"YYYY-MM-DD" は文字列比較で時系列順になる）
  const sorted = [...stock.lots].sort((a, b) =>
    a.expiresOn < b.expiresOn ? -1 : a.expiresOn > b.expiresOn ? 1 : 0
  );

  let remaining = n;
  let ateBeforeExpiry = false; // 期限前の分を食べたか
  const newLots: ExpiryLot[] = [];
  for (const lot of sorted) {
    if (remaining <= 0) {
      newLots.push(lot); // もう食べ終わった → そのまま残す
      continue;
    }
    const eaten = Math.min(lot.qty, remaining);
    remaining -= eaten;
    if (eaten > 0 && lot.expiresOn > todayStr) {
      ateBeforeExpiry = true; // 期限が今日より後の分を食べた
    }
    const left = lot.qty - eaten;
    if (left > 0) {
      newLots.push({ ...lot, qty: left });
    }
    // left === 0 の lot は削除（push しない）
  }

  return {
    ...stock,
    qty: Math.max(0, stock.qty - n),
    lots: newLots,
    pendingRotations: stock.pendingRotations + (ateBeforeExpiry ? 1 : 0),
  };
}
