"use client";
// 品目の詳細: どうぶつのプロフィール・数・期限・たべた/かってきた
import Link from "next/link";
import { use, useState } from "react";
import { useHydrated } from "@/store/useHydrated";
import { useApp } from "@/store/useApp";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Animal, ExpiryLot, StockpileItem } from "@/lib/types";
import { effectiveNeed, formatQty } from "@/lib/need";
import { daysUntil, guessExpiry, moodOf, soonestExpiry, stageLabel } from "@/lib/expiry";
import { localVoice } from "@/lib/voice";
import { toCleanJpegBase64 } from "@/lib/photo";
import WhenBought from "@/components/WhenBought";
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
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [tapCount, setTapCount] = useState(0);
  // 期限のアップ撮影（段階3: 確認済みへの昇格）
  const [expiryScan, setExpiryScan] = useState<"idle" | "busy" | "fail">("idle");

  const onExpiryPhoto = async (file: File, lotId: string) => {
    if (!stock) return;
    const lot = stock.lots.find((l) => l.id === lotId);
    if (!lot) return;
    setExpiryScan("busy");
    try {
      // 位置情報などのメタデータを消してから送る（企画の約束）
      const { base64, mimeType } = await toCleanJpegBase64(file);
      const res = await fetch("/api/expiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = await res.json();
      if (res.ok && data.found) {
        setLot(itemId, {
          ...lot,
          expiresOn: data.date,
          kind: data.kind,
          stage: "confirmed",
        });
        setExpiryScan("idle");
        setSelectedLotId(null);
      } else {
        setExpiryScan("fail"); // 読めなかった → 手動入力へ誘導
      }
    } catch {
      setExpiryScan("fail");
    }
  };
  const sortedLots = (stock?.lots ?? [])
    .slice()
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  // 保存データ(localStorage)の復元が終わるまで描画しない（チラつき・誤表示防止）
  const ready = useHydrated();

  if (!ready) return null;

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

  const eff = effectiveNeed(item, family);
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
        {/* 吹き出し（タップで返事） */}
        {bubble && (
          <p className="relative mb-1 max-w-[90%] rounded-2xl bg-sky px-4 py-2 text-center text-sm font-bold after:absolute after:-bottom-1.5 after:left-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:rotate-45 after:bg-sky">
            {bubble}
          </p>
        )}
        <button
          type="button"
          aria-label="はなしかける"
          className="text-6xl transition-transform active:scale-90"
          onClick={() => {
            if (!animal) return;
            const lot = stock ? soonestExpiry(stock) : undefined;
            const days = lot ? daysUntil(lot.expiresOn, now) : null;
            const mood = qty > 0 && days !== null ? moodOf(days) : "calm";
            const n = tapCount + 1;
            setTapCount(n);
            // まずローカルの定型文を即表示（ネット無しでも必ず返事する）
            setBubble(
              localVoice(mood, { name: animal.name, item: item.name, days }, n)
            );
            // 裏でAIセリフを取りに行き、来たら差し替える
            fetch("/api/voice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: animal.name,
                species: animal.species,
                itemName: item.name,
                mood,
                daysLeft: days,
              }),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (d?.line) setBubble(d.line);
              })
              .catch(() => {}); // 失敗しても定型文が残るだけ
          }}
        >
          {animal?.emoji ?? "📦"}
        </button>
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
            {formatQty(qty, eff.unit)}
            <span className="text-sm text-stone-500">
              /{formatQty(eff.value, eff.unit)}
              {eff.unit}
            </span>
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-sky">
          <div
            className="h-full rounded-full bg-grass transition-all"
            style={{ width: `${Math.min(100, (qty / eff.value) * 100)}%` }}
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
          {sortedLots.map((lot) => {
            const d = daysUntil(lot.expiresOn, now);
            const isSelected = lot.id === selectedLotId;
            return (
              <li
                key={lot.id}
                className="border-b border-sky/60 py-2 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLotId(isSelected ? null : lot.id)
                  }
                  className="flex w-full items-center justify-between text-sm"
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
                    {stageLabel(lot.stage)}・あと{d}日 {isSelected ? "▲" : "▼"}
                  </span>
                </button>

                {/* タップで開く: 期限をくわしくする操作 */}
                {isSelected && (
                  <div className="mt-1">
                    {/* 段階2: いつ買った？（確認済みになったら出さない） */}
                    {lot.stage !== "confirmed" && (
                      <WhenBought
                        shelfLifeMonths={animal?.shelfLifeMonths ?? 12}
                        today={now}
                        onPick={(expiresOn) => {
                          setLot(itemId, { ...lot, expiresOn, stage: "narrowed" });
                          setSelectedLotId(null);
                        }}
                      />
                    )}
                    {/* 段階3a: 期限のアップ撮影で「確認済み」に */}
                    <label className="mt-2 block">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onExpiryPhoto(f, lot.id);
                          e.target.value = "";
                        }}
                      />
                      <span className="block w-full cursor-pointer rounded-full bg-sun py-2 text-center text-sm font-bold shadow active:scale-95">
                        {expiryScan === "busy"
                          ? "🔍 よみとり中…"
                          : "📷 きげんの ひづけを さつえい"}
                      </span>
                    </label>
                    {expiryScan === "fail" && (
                      <p className="mt-1 text-center text-[11px] font-bold text-alert">
                        読み取れなかった。下から手で入れてね
                      </p>
                    )}
                    {/* 段階3b: 手で入れて「確認済み」に */}
                    <div className="mt-2 flex items-center gap-2">
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
                          setLot(itemId, {
                            ...lot,
                            expiresOn: manualDate,
                            stage: "confirmed",
                          });
                          setManualDate("");
                          setSelectedLotId(null);
                        }}
                        className="rounded-full bg-grass-deep px-4 py-2 text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40"
                      >
                        かくてい
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
          「賞味期限」は おいしく食べられる目安。すぎても すぐ食べられなくなるわけではないよ。
          においや見た目も たしかめてね。
        </p>
      </section>

      <SourceFooter />
    </main>
  );
}
