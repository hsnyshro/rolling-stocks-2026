"use client";
// 村（ホーム画面）= 図鑑。1画面で2役
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/store/useApp";
import { useHydrated } from "@/store/useHydrated";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Animal, StockpileItem } from "@/lib/types";
import { villageGauge } from "@/lib/village";
import VillagePlot from "@/components/VillagePlot";
import SourceFooter from "@/components/SourceFooter";

const items = stockpileData.items as StockpileItem[];
const animals = animalsData.animals as Animal[];

export default function VillagePage() {
  const { family, stocks, today, fastForward, demoOffsetDays } = useApp();
  // localStorage 復元完了前のチラつき・誤表示防止
  const ready = useHydrated();
  // タイトル7回タップで時間早送り（デモ用の隠しボタン）
  const [taps, setTaps] = useState(0);

  if (!ready) return null;

  if (!family) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-wide">
          ローリングストックス
        </h1>
        <p className="text-sm leading-relaxed text-stone-600">
          おうちの備蓄で、どうぶつの村が育つ。
          <br />
          まずは家族のことを教えてね。
        </p>
        <Link
          href="/start"
          className="rounded-full bg-grass-deep px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95"
        >
          村を始める
        </Link>
        <SourceFooter />
      </main>
    );
  }

  const gauge = villageGauge(Object.values(stocks), items, animals, family);
  const now = today();

  return (
    <main className="flex flex-1 flex-col">
      {/* 上部ゲージ */}
      <header className="sticky top-0 z-20 bg-sky/90 px-4 pb-2 pt-4 backdrop-blur">
        <h1
          className="text-center text-xl font-extrabold tracking-wide"
          onClick={() => {
            const n = taps + 1;
            setTaps(n);
            if (n >= 7) {
              fastForward(30);
              setTaps(0);
            }
          }}
        >
          ローリングストックス
          {demoOffsetDays > 0 && (
            <span className="ml-1 align-middle text-[10px] font-normal text-alert">
              (+{demoOffsetDays}日早送り中)
            </span>
          )}
        </h1>
        <div className="mx-auto mt-2 flex max-w-md items-center justify-between rounded-full bg-card px-4 py-2 shadow">
          <span className="text-sm font-bold">
            🏠 {gauge.litCount}/{gauge.total} 点灯
          </span>
          <span className="text-sm font-bold text-grass-deep">
            ざっくり {gauge.days} 日分の備え
          </span>
        </div>
      </header>

      {/* 村（12枠のグリッド） */}
      <section className="mx-auto grid w-full max-w-md grid-cols-3 gap-3 p-4">
        {animals.map((animal) => {
          const item = items.find((i) => i.id === animal.itemId)!;
          return (
            <VillagePlot
              key={animal.itemId}
              item={item}
              animal={animal}
              stock={stocks[animal.itemId]}
              family={family}
              today={now}
            />
          );
        })}
      </section>

      {/* 下部ボタン */}
      <nav className="sticky bottom-0 mt-auto flex justify-center gap-3 bg-sky/90 p-4 backdrop-blur">
        <Link
          href="/scan"
          className="flex-1 rounded-full bg-grass-deep py-3 text-center text-base font-bold text-white shadow-lg active:scale-95"
        >
          📷 棚を撮る
        </Link>
        <Link
          href="/start"
          className="rounded-full bg-card px-5 py-3 text-base font-bold shadow active:scale-95"
        >
          おすすめ
        </Link>
      </nav>

      <SourceFooter />
    </main>
  );
}
