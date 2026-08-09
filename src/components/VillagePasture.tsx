"use client";
// 牧場ビュー全体: 草原の背景 + 飾り + 12匹（家・動物・看板）
import PastureAnimal from "@/components/PastureAnimal";
import type { Animal, Family, Stock, StockpileItem } from "@/lib/types";
import { territoryOf } from "@/lib/pasture";

/** 背景の飾り（木・花・岩）。タップの邪魔をしないよう pointer-events は切る */
const DECORATIONS: { emoji: string; x: number; y: number; size: string }[] = [
  { emoji: "🌳", x: 5,  y: 20, size: "text-3xl" },
  { emoji: "🌳", x: 95, y: 44, size: "text-2xl" },
  { emoji: "🌼", x: 35, y: 24, size: "text-base" },
  { emoji: "🌼", x: 68, y: 48, size: "text-base" },
  { emoji: "🌷", x: 28, y: 70, size: "text-base" },
  { emoji: "🪨", x: 70, y: 92, size: "text-xl" },
  { emoji: "🌲", x: 4,  y: 93, size: "text-3xl" },
];

interface Props {
  animals: Animal[];
  items: StockpileItem[];
  stocks: Record<number, Stock>;
  family: Family;
  today: Date;
}

export default function VillagePasture({
  animals,
  items,
  stocks,
  family,
  today,
}: Props) {
  return (
    <section
      aria-label="どうぶつの村"
      className="relative mx-auto w-full max-w-md flex-1 overflow-hidden bg-linear-to-b from-sky via-[#d9efc0] to-grass/60"
      style={{ minHeight: 420 }}
    >
      {DECORATIONS.map((d, i) => (
        <span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none ${d.size}`}
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
        >
          {d.emoji}
        </span>
      ))}
      {animals.map((animal) => {
        const item = items.find((i) => i.id === animal.itemId);
        const territory = territoryOf(animal.itemId);
        if (!item || !territory) return null; // データ不整合は描画しない
        return (
          <PastureAnimal
            key={animal.itemId}
            animal={animal}
            item={item}
            stock={stocks[animal.itemId]}
            family={family}
            today={today}
            territory={territory}
          />
        );
      })}
    </section>
  );
}
