"use client";
// 棚のたなおろし画面。
// いまは「じぶんで数える」版。カメラ×AI判別はこの上に重ねる（開発中でも一周回るための保険）
// ルール: ここでの登録は「置き換え」= いま棚にある数の申告。何回やっても数は増えない
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/store/useApp";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Animal, StockpileItem } from "@/lib/types";
import SourceFooter from "@/components/SourceFooter";

const items = stockpileData.items as StockpileItem[];
const animals = animalsData.animals as Animal[];

export default function ScanPage() {
  const router = useRouter();
  const { stocks, scanReplace } = useApp();
  // いまの在庫を初期値にする（置き換え方式）
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(animals.map((a) => [a.itemId, stocks[a.itemId]?.qty ?? 0]))
  );

  const set = (itemId: number, v: number) =>
    setCounts({ ...counts, [itemId]: Math.max(0, v) });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
      <Link href="/" className="text-sm font-bold text-grass-deep">
        ← むらへ もどる
      </Link>
      <h1 className="text-center text-xl font-extrabold">たなおろし</h1>

      {/* カメラ撮影（AI判別）はここに入る。いまは準備中 */}
      <div className="rounded-3xl border-2 border-dashed border-soil/40 bg-card/50 p-4 text-center">
        <p className="text-3xl">📷</p>
        <p className="mt-1 text-sm font-bold text-stone-500">
          しゃしんで数える（じゅんび中）
        </p>
        <p className="text-[10px] text-stone-400">
          いまは下のリストで、いま棚にある数を教えてね
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {animals.map((a) => {
          const item = items.find((i) => i.id === a.itemId)!;
          const v = counts[a.itemId] ?? 0;
          return (
            <li
              key={a.itemId}
              className="flex items-center justify-between rounded-2xl bg-card px-4 py-2 shadow-sm"
            >
              <span className="text-sm font-bold">
                <span className="mr-2 text-xl align-middle">{a.emoji}</span>
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`${item.name}をへらす`}
                  onClick={() => set(a.itemId, v - 1)}
                  disabled={v === 0}
                  className="h-8 w-8 rounded-full bg-sky font-bold active:scale-90 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-8 text-center font-extrabold">
                  {v}
                  <span className="text-[10px] font-normal text-stone-400">
                    {item.unit}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`${item.name}をふやす`}
                  onClick={() => set(a.itemId, v + 1)}
                  className="h-8 w-8 rounded-full bg-grass font-bold text-white active:scale-90"
                >
                  ＋
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => {
          for (const a of animals) {
            const v = counts[a.itemId] ?? 0;
            const prev = stocks[a.itemId]?.qty ?? 0;
            if (v !== prev || v > 0) scanReplace(a.itemId, v);
          }
          router.push("/");
        }}
        className="rounded-full bg-grass-deep py-3 text-lg font-bold text-white shadow-lg active:scale-95"
      >
        この かずで きろくする
      </button>
      <p className="text-center text-[10px] text-stone-500">
        ※「いま棚にある数」をそのまま入れてね（前の記録は置き換わるよ）
      </p>

      <SourceFooter />
    </main>
  );
}
