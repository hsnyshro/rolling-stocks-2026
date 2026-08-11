"use client";
// グループの帯: 見出し + 横長のなわばり。在庫のある品目の数だけ同じ動物が歩き回る
import Link from "next/link";
import PastureAnimal from "@/components/PastureAnimal";
import type { Family, Group, Stock, StockpileItem } from "@/lib/types";
import type { Territory } from "@/lib/pasture";
import { animalFor, stockedItemIds } from "@/lib/zoo";

interface Props {
  group: Group;
  items: StockpileItem[];
  stocks: Record<number, Stock>;
  family: Family;
  today: Date;
}

/**
 * 帯の中の個体ごとのなわばり。横位置を均等にずらして重なりを減らす
 * （帯の左端は家が使うので 24%〜88% に配置）
 */
function bandTerritory(itemId: number, index: number, count: number): Territory {
  const cx = count === 1 ? 55 : 24 + (64 * index) / (count - 1);
  return { itemId, cx, cy: 55, rx: 10, ry: 16, homeX: 0, homeY: 0 };
}

export default function GroupBand({ group, items, stocks, family, today }: Props) {
  const stocked = stockedItemIds(group, stocks);
  return (
    <section aria-label={group.label} className="mx-auto w-full max-w-md px-2 pb-1">
      <h2 className="flex items-baseline gap-1 px-2 pt-2 text-sm font-bold">
        <span aria-hidden>{group.emoji}</span>
        {group.label}
        <span className="text-[10px] font-normal text-stone-500">
          {stocked.length}/{group.itemIds.length} 備え中
        </span>
      </h2>
      <div className="isolate relative mt-1 h-28 overflow-hidden rounded-2xl bg-linear-to-b from-[#e2f2cd] to-grass/50">
        {/* 家: 在庫が1つでもあればテント、ゼロなら看板。タップでグループ紹介へ */}
        <Link
          href={`/group/${group.key}`}
          aria-label={`${group.label}の紹介`}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl transition-transform active:scale-90"
          style={{ left: "10%", top: "42%", zIndex: 100 }}
        >
          {stocked.length > 0 ? "⛺" : "🪧"}
        </Link>
        {stocked.map((id, i) => {
          const item = items.find((it) => it.id === id);
          const animal = animalFor(id);
          if (!item || !animal) return null; // データ不整合は描画しない
          return (
            <PastureAnimal
              key={id}
              animal={animal}
              item={item}
              stock={stocks[id]}
              family={family}
              today={today}
              territory={bandTerritory(id, i, stocked.length)}
              showHome={false}
              ariaLabel={`${animal.name}（${item.name}）`}
            />
          );
        })}
      </div>
    </section>
  );
}
