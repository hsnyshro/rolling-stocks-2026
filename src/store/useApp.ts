"use client";
// アプリの状態（家族構成・在庫・同意）を端末の中だけに保存する
// ※サーバには何も送らない（外に出るのは棚の写真だけ、が企画の約束）
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExpiryLot, Family, Stock } from "@/lib/types";
import { addCount, consume, replaceCount } from "@/lib/inventory";
import { guessExpiry } from "@/lib/expiry";
import { animalFor } from "@/lib/zoo";

function emptyStock(itemId: number): Stock {
  return { itemId, qty: 0, lots: [], stars: 0, pendingRotations: 0 };
}

function shelfLifeOf(itemId: number): number {
  return animalFor(itemId)?.shelfLifeMonths ?? 12;
}

interface AppState {
  family: Family | null;
  /** itemId → 在庫 */
  stocks: Record<number, Stock>;
  consented: boolean;
  /** デモ用の時間早送り（日数）。発表で「ここから早送りします」と正直に使う */
  demoOffsetDays: number;

  /** アプリ内の「今日」（早送りぶんを足した日付） */
  today: () => Date;

  setFamily: (f: Family) => void;
  giveConsent: () => void;
  /** 棚スキャン=置き換え。何回撮っても数は増えない。lots は消えない */
  scanReplace: (itemId: number, qty: number) => void;
  /** 買ってきたよ登録=追加。期限の記録つき */
  addStock: (itemId: number, delta: number, lot?: ExpiryLot) => void;
  /** 食べたよ。期限が近い分から減る */
  eat: (itemId: number) => void;
  /** 期限の記録を書き換え（絞り込み・確認済みへの昇格） */
  setLot: (itemId: number, lot: ExpiryLot) => void;
  removeLot: (itemId: number, lotId: string) => void;
  fastForward: (days: number) => void;
  resetAll: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      family: null,
      stocks: {},
      consented: false,
      demoOffsetDays: 0,

      today: () => {
        const d = new Date();
        d.setDate(d.getDate() + get().demoOffsetDays);
        return d;
      },

      setFamily: (f) => set({ family: f }),
      giveConsent: () => set({ consented: true }),

      scanReplace: (itemId, qty) =>
        set((s) => {
          const prev = s.stocks[itemId] ?? emptyStock(itemId);
          let next = replaceCount(prev, qty);
          // 期限の記録がまだ1つもなければ、種類から短め（安全側）に推測して1つ作る
          if (next.lots.length === 0 && qty > 0) {
            const lot: ExpiryLot = {
              id: `lot-${itemId}-${Date.now()}`,
              qty,
              expiresOn: guessExpiry(shelfLifeOf(itemId), get().today()),
              stage: "guessed",
              kind: "best-before",
            };
            next = { ...next, lots: [lot] };
          }
          return { stocks: { ...s.stocks, [itemId]: next } };
        }),

      addStock: (itemId, delta, lot) =>
        set((s) => {
          const prev = s.stocks[itemId] ?? emptyStock(itemId);
          return { stocks: { ...s.stocks, [itemId]: addCount(prev, delta, lot) } };
        }),

      eat: (itemId) =>
        set((s) => {
          const prev = s.stocks[itemId];
          if (!prev || prev.qty === 0) return s;
          return { stocks: { ...s.stocks, [itemId]: consume(prev, get().today()) } };
        }),

      setLot: (itemId, lot) =>
        set((s) => {
          const prev = s.stocks[itemId] ?? emptyStock(itemId);
          const others = prev.lots.filter((l) => l.id !== lot.id);
          return {
            stocks: {
              ...s.stocks,
              [itemId]: { ...prev, lots: [...others, lot] },
            },
          };
        }),

      removeLot: (itemId, lotId) =>
        set((s) => {
          const prev = s.stocks[itemId];
          if (!prev) return s;
          return {
            stocks: {
              ...s.stocks,
              [itemId]: { ...prev, lots: prev.lots.filter((l) => l.id !== lotId) },
            },
          };
        }),

      fastForward: (days) =>
        set((s) => ({ demoOffsetDays: s.demoOffsetDays + days })),

      resetAll: () =>
        set({ family: null, stocks: {}, consented: false, demoOffsetDays: 0 }),
    }),
    { name: "rolling-stocks-v1" }
  )
);
