"use client";
// おすすめストック品リスト（東京備蓄ナビ67品目・7日分の必要量つき）
import { useState } from "react";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Family, StockpileItem } from "@/lib/types";
import { calcNeed, formatQty, isVagueUnit } from "@/lib/need";
import AnimalSprite from "@/components/AnimalSprite";

const items = stockpileData.items as StockpileItem[];

/** カテゴリの表示順: 食品を最初に */
function categoryOrder(cat: string): number {
  if (cat === "食品") return 0;
  if (cat === "トイレ") return 1;
  return 2;
}

export default function RecommendList({ family }: { family: Family }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ 食品: true });

  // 家族構成に関係する品目だけに絞る（例: 赤ちゃん0人ならミルクは出さない）
  const relevant = items.filter((it) => {
    const need = calcNeed(it, family);
    if (need === null) return true; // 人数比例でない品目（懐中電灯など）は常に出す
    return need > 0;
  });

  const categories = [...new Set(relevant.map((i) => i.category))].sort(
    (a, b) => categoryOrder(a) - categoryOrder(b)
  );

  const animalOf = (itemId: number) =>
    animalsData.animals.find((a) => a.itemId === itemId);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="mt-2 text-center text-base font-extrabold">
        7日分の おすすめストック（{relevant.length}品目）
      </h2>
      {categories.map((cat) => {
        const list = relevant.filter((i) => i.category === cat);
        const isOpen = open[cat] ?? false;
        return (
          <div key={cat} className="rounded-2xl bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setOpen({ ...open, [cat]: !isOpen })}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold"
            >
              <span>{cat}（{list.length}）</span>
              <span>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <ul className="border-t border-sky px-4 py-1">
                {list.map((it) => {
                  const need = calcNeed(it, family);
                  const animal = animalOf(it.id);
                  return (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-2 border-b border-sky/60 py-2 last:border-b-0"
                    >
                      <span className="text-sm">
                        {animal && (
                          <span
                            className="mr-1 inline-block align-middle"
                            title={`${animal.name}がむらに来るよ`}
                          >
                            <AnimalSprite
                              animal={animal}
                              sizeClass="h-6 w-6"
                              fallbackClass=""
                            />
                          </span>
                        )}
                        {it.name}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-grass-deep">
                        {need !== null && !isVagueUnit(it.unit)
                          ? `${formatQty(need, it.unit)}${it.unit}`
                          : "あると安心"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      <p className="text-center text-[10px] text-stone-500">
        🐾つきの品物は、そろえると どうぶつが村に来るよ
      </p>
    </section>
  );
}
