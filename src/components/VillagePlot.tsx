"use client";
// 村の1枠。空き地（看板）→ テント → 光るおうち の3状態
import Link from "next/link";
import AnimalSprite from "@/components/AnimalSprite";
import type { Animal, Family, Stock, StockpileItem } from "@/lib/types";
import { plotState } from "@/lib/village";
import { effectiveNeed, formatQty } from "@/lib/need";
import { daysUntil, moodOf, soonestExpiry } from "@/lib/expiry";

interface Props {
  item: StockpileItem;
  animal: Animal;
  stock: Stock | undefined;
  family: Family;
  today: Date;
}

export default function VillagePlot({ item, animal, stock, family, today }: Props) {
  const qty = stock?.qty ?? 0;
  const eff = effectiveNeed(item, family);
  const state = plotState(qty, eff.isFallback ? null : eff.value, family);

  // 期限が一番近い記録から、どうぶつの気分を決める
  const lot = stock ? soonestExpiry(stock) : undefined;
  const days = lot ? daysUntil(lot.expiresOn, today) : null;
  const mood = state !== "empty" && days !== null ? moodOf(days) : "calm";

  const anim =
    state === "empty" ? "" : mood === "begging" ? "animate-hop" : mood === "sad" ? "animate-droop" : "";

  return (
    <Link
      href={`/item/${item.id}`}
      className={`relative flex flex-col items-center rounded-2xl p-2 pt-3 transition-transform active:scale-95 ${
        state === "lit"
          ? "bg-sun/40 animate-glow"
          : state === "resident"
            ? "bg-card"
            : "bg-card/40 border-2 border-dashed border-soil/40"
      }`}
    >
      {/* せがみ吹き出し */}
      {mood === "begging" && (
        <span className="absolute -top-2 right-1 z-10 rounded-full bg-alert px-2 py-0.5 text-[10px] font-bold text-white shadow">
          あそんで！
        </span>
      )}
      {mood === "sad" && (
        <span className="absolute -top-2 right-1 z-10 rounded-full bg-stone-400 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          見てね…
        </span>
      )}

      {/* どうぶつ or 空き地の看板 */}
      {state === "empty" ? (
        <span className="text-4xl" aria-hidden>
          🪧
        </span>
      ) : (
        <AnimalSprite
          animal={animal}
          expression={
            mood === "begging"
              ? "begging"
              : state === "lit" && (mood === "calm" || mood === "restless")
                ? "happy"
                : "normal"
          }
          sizeClass="h-16 w-16"
          fallbackClass="text-4xl"
          className={anim}
        />
      )}

      {/* 状態のしるし: テント / 光るおうち */}
      <span className="text-base leading-none" aria-hidden>
        {state === "lit" ? "🏠" : state === "resident" ? "⛺" : ""}
      </span>

      <span className="mt-1 max-w-full truncate text-[11px] font-bold">
        {state === "empty" ? "まだいない" : animal.name}
      </span>

      {/* 数のメーター「3/21」 */}
      <span className="text-[10px] text-stone-500">
        {formatQty(qty, eff.unit)}/{formatQty(eff.value, eff.unit)}
        {eff.unit}
      </span>
    </Link>
  );
}
