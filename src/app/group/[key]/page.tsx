"use client";
// グループ紹介: 世話係の動物のプロフィール + 担当品目の一覧（各詳細ページへの入口）
import Link from "next/link";
import { use } from "react";
import { useApp } from "@/store/useApp";
import { useHydrated } from "@/store/useHydrated";
import stockpileData from "@/data/stockpile.json";
import type { StockpileItem } from "@/lib/types";
import { GROUPS, animalFor } from "@/lib/zoo";
import { formatQty } from "@/lib/need";
import AnimalSprite from "@/components/AnimalSprite";
import SourceFooter from "@/components/SourceFooter";

const items = stockpileData.items as StockpileItem[];

export default function GroupPage(props: { params: Promise<{ key: string }> }) {
  const { key } = use(props.params);
  const group = GROUPS.find((g) => g.key === key);
  const { stocks } = useApp();
  // 保存データ(localStorage)の復元が終わるまで描画しない（チラつき・誤表示防止）
  const ready = useHydrated();

  if (!ready) return null;

  if (!group) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p>このグループは見つからなかったよ</p>
        <Link href="/" className="font-bold text-grass-deep underline">
          動物園へ戻る
        </Link>
      </main>
    );
  }

  const animal = animalFor(group.itemIds[0]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      {/* 世話係のプロフィール */}
      <section className="flex flex-col items-center gap-1 rounded-3xl bg-card p-5 shadow">
        {animal && (
          <AnimalSprite
            animal={animal}
            sizeClass="h-28 w-28"
            fallbackClass="text-6xl"
          />
        )}
        <h1 className="text-xl font-extrabold">{group.animalName}</h1>
        <p className="text-xs text-stone-500">
          {group.species}｜{group.label}の世話係
        </p>
        <p className="mt-1 text-center text-xs leading-relaxed text-stone-600">
          {group.profile}
        </p>
      </section>

      {/* 担当品目の一覧 */}
      <section className="rounded-3xl bg-card p-4 shadow">
        <h2 className="text-sm font-bold">担当している備え</h2>
        <ul className="mt-1">
          {group.itemIds.map((id) => {
            const item = items.find((i) => i.id === id);
            if (!item) return null;
            const qty = stocks[id]?.qty ?? 0;
            return (
              <li key={id} className="border-b border-sky/60 last:border-b-0">
                <Link
                  href={`/item/${id}`}
                  className="flex items-center justify-between py-2 text-sm active:opacity-60"
                >
                  <span>{item.name}</span>
                  <span
                    className={
                      qty > 0
                        ? "font-bold text-grass-deep"
                        : "text-xs text-stone-400"
                    }
                  >
                    {qty > 0
                      ? `${formatQty(qty, item.unit)}${item.unit}`
                      : "まだ備えてないよ"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <SourceFooter />
    </main>
  );
}
