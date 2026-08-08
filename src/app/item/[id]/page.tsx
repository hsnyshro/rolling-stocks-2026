"use client";
// 品目の詳細: どうぶつのプロフィール・数・期限・たべた/かってきた
import Link from "next/link";
import { use, useState } from "react";
import { useApp } from "@/store/useApp";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Animal, ExpiryLot, StockpileItem } from "@/lib/types";
import { calcNeed, fallbackNeed, formatQty } from "@/lib/need";
import { daysUntil, guessExpiry, stageLabel } from "@/lib/expiry";
import SourceFooter from "@/components/SourceFooter";

const items = stockpileData.items as StockpileItem[];
const animals = animalsData.animals as Animal[];

export default function ItemPage(props: PageProps<"/item/[id]">) {
  const { id } = use(props.params);
  const itemId = Number(id);
  const item = items.find((i) => i.id === itemId);
  const animal = animals.find((a) => a.itemId === itemId);

  const { family, stocks, eat, addStock, scanReplace, setLot, today } = useApp();
  const stock = stocks[itemId];
  const qty = stock?.qty ?? 0;
  const [manualDate, setManualDate] = useState("");

  if (!item || !family) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p>この品物は見つからなかったよ</p>
        <Link href="/" className="font-bold text-grass-deep underline">
          むらへ もどる
        </Link>
      </main>
    );
  }

  const need = calcNeed(item, family) ?? fallbackNeed(family);
  const now = today();

  const addWithGuess = () => {
    // 買ってきたよ = 追加。期限は種類から短め（安全側）に推測して付ける
    const lot: ExpiryLot = {
      id: `lot-${itemId}-${Date.now()}`,
      qty: 1,
      expiresOn: guessExpiry(animal?.shelfLifeMonths ?? 12, now),
      stage: "guessed",
      kind: "best-before",
    };
    addStock(itemId, 1, lot);
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Link href="/" className="text-sm font-bold text-grass-deep">
        ← むらへ もどる
      </Link>

      {/* プロフィール */}
      <section className="flex flex-col items-center gap-1 rounded-3xl bg-card p-5 shadow">
        <span className="text-6xl">{animal?.emoji ?? "📦"}</span>
        <h1 className="text-xl font-extrabold">
          {animal ? animal.name : item.name}
        </h1>
        {animal && (
          <p className="text-xs text-stone-500">
            {animal.species}｜{item.name}のせいれい
          </p>
        )}
        <p className="mt-1 text-center text-xs leading-relaxed text-stone-600">
          {animal?.profile ?? item.description}
        </p>
        {stock && stock.stars > 0 && (
          <p className="text-sm" title="期限前に食べて買いたした回数">
            {"⭐".repeat(Math.min(stock.stars, 5))}
            {stock.stars > 5 && ` ×${stock.stars}`}
          </p>
        )}
      </section>

      {/* 数メーター */}
      <section className="rounded-3xl bg-card p-4 shadow">
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold">いまのかず</span>
          <span className="text-2xl font-extrabold text-grass-deep">
            {formatQty(qty, item.unit)}
            <span className="text-sm text-stone-500">
              /{formatQty(need, item.unit)}
              {item.unit}
            </span>
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-sky">
          <div
            className="h-full rounded-full bg-grass transition-all"
            style={{ width: `${Math.min(100, (qty / need) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => eat(itemId)}
            disabled={qty === 0}
            className="flex-1 rounded-full bg-sun py-3 font-bold shadow active:scale-95 disabled:opacity-40"
          >
            🍽️ たべたよ
          </button>
          <button
            type="button"
            onClick={addWithGuess}
            className="flex-1 rounded-full bg-grass-deep py-3 font-bold text-white shadow active:scale-95"
          >
            🛒 かってきたよ
          </button>
        </div>
        {qty === 0 && (
          <button
            type="button"
            onClick={() => scanReplace(itemId, 1)}
            className="mt-2 w-full rounded-full bg-card py-2 text-sm font-bold text-grass-deep underline"
          >
            うちに あるよ（1つ 登録する）
          </button>
        )}
      </section>

      {/* 期限の記録 */}
      <section className="rounded-3xl bg-card p-4 shadow">
        <h2 className="text-sm font-bold">きげんの きろく</h2>
        {(!stock || stock.lots.length === 0) && (
          <p className="mt-2 text-xs text-stone-500">まだ きろくが ないよ</p>
        )}
        <ul className="mt-1">
          {stock?.lots
            .slice()
            .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
            .map((lot) => {
              const d = daysUntil(lot.expiresOn, now);
              return (
                <li
                  key={lot.id}
                  className="flex items-center justify-between border-b border-sky/60 py-2 text-sm last:border-b-0"
                >
                  <span>
                    {lot.expiresOn}（{formatQty(lot.qty, item.unit)}
                    {item.unit}）
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      lot.stage === "confirmed"
                        ? "bg-grass text-white"
                        : "bg-sky text-stone-600"
                    }`}
                  >
                    {stageLabel(lot.stage)}・あと{d}日
                  </span>
                </li>
              );
            })}
        </ul>

        {/* 手動入力（写真での読み取りはあとで追加） */}
        {stock && stock.lots.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="flex-1 rounded-xl border border-sky bg-sky/40 px-3 py-2 text-sm"
              aria-label="きげんを 手で入れる"
            />
            <button
              type="button"
              disabled={!manualDate}
              onClick={() => {
                const first = stock.lots[0];
                setLot(itemId, {
                  ...first,
                  expiresOn: manualDate,
                  stage: "confirmed",
                });
                setManualDate("");
              }}
              className="rounded-full bg-grass-deep px-4 py-2 text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40"
            >
              かくてい
            </button>
          </div>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
          「賞味期限」は おいしく食べられる目安。すぎても すぐ食べられなくなるわけではないよ。
          においや見た目も たしかめてね。
        </p>
      </section>

      <SourceFooter />
    </main>
  );
}
