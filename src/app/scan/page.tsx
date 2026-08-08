"use client";
// 棚のたなおろし画面。
// いまは「じぶんで数える」版。カメラ×AI判別はこの上に重ねる（開発中でも一周回るための保険）
// ルール: ここでの登録は「置き換え」= いま棚にある数の申告。何回やっても数は増えない
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/store/useApp";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Animal, StockpileItem } from "@/lib/types";
import { toCleanJpegBase64 } from "@/lib/photo";
import { useHydrated } from "@/store/useHydrated";
import SourceFooter from "@/components/SourceFooter";

const items = stockpileData.items as StockpileItem[];
const animals = animalsData.animals as Animal[];

export default function ScanPage() {
  const router = useRouter();
  const { stocks, scanReplace } = useApp();
  // いまの在庫を初期値にする（置き換え方式）。
  // 保存データの復元完了(useHydrated)を待ってから1回だけ読み込む
  const hydrated = useHydrated();
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!hydrated || ready) return;
    setCounts(
      Object.fromEntries(
        animals.map((a) => [a.itemId, stocks[a.itemId]?.qty ?? 0])
      )
    );
    setReady(true);
    // 復元完了時に1回だけ。以降は編集中の値を上書きしない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ready]);

  // ---- 写真でのAI判別 ----
  // 注意: フックは早期return（下の if (!ready)）より必ず前に置くこと
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<
    | { kind: "idle" }
    | { kind: "busy" }
    | { kind: "done"; hits: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const set = (itemId: number, v: number) =>
    setCounts({ ...counts, [itemId]: Math.max(0, v) });

  const onPhoto = async (file: File) => {
    setScanState({ kind: "busy" });
    try {
      // 位置情報などのメタデータを消してから送る（企画の約束）
      const { base64, mimeType } = await toCleanJpegBase64(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanState({ kind: "error", message: data.message ?? "読み取れなかった" });
        return;
      }
      const found = data.found as { itemId: number; count: number }[];
      // AIの数は「仮の値」としてリストに入れるだけ。確定は下のボタンで人がやる
      const next = { ...counts };
      for (const f of found) next[f.itemId] = f.count;
      setCounts(next);
      setScanState({ kind: "done", hits: found.length });
    } catch {
      setScanState({ kind: "error", message: "通信できなかった。手で数えてね" });
    }
  };

  if (!ready) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
      <Link href="/" className="text-sm font-bold text-grass-deep">
        ← むらへ もどる
      </Link>
      <h1 className="text-center text-xl font-extrabold">たなおろし</h1>

      {/* カメラ撮影 → AI判別（数は仮の値。下のリストで人が確定する） */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(f);
          e.target.value = ""; // 同じ写真をもう一度選べるように
        }}
      />
      <button
        type="button"
        disabled={scanState.kind === "busy"}
        onClick={() => fileRef.current?.click()}
        className="rounded-3xl border-2 border-dashed border-grass-deep/50 bg-card/70 p-4 text-center active:scale-95 disabled:opacity-60"
      >
        <p className="text-3xl">{scanState.kind === "busy" ? "🔍" : "📷"}</p>
        <p className="mt-1 text-sm font-bold text-grass-deep">
          {scanState.kind === "busy"
            ? "AIが数えているよ…"
            : "たなの しゃしんを とって AIに 数えてもらう"}
        </p>
        <p className="text-[10px] text-stone-500">
          AIの数は仮の値。下のリストで確かめて直してね（最終判断は人間！）
        </p>
      </button>
      {scanState.kind === "done" && (
        <p className="rounded-2xl bg-grass/20 px-4 py-2 text-center text-sm font-bold text-grass-deep">
          {scanState.hits > 0
            ? `${scanState.hits}種類 見つけたよ！ 数を確かめてね`
            : "この写真からは見つからなかった。角度を変えてもう一枚どうぞ"}
        </p>
      )}
      {scanState.kind === "error" && (
        <p className="rounded-2xl bg-alert/20 px-4 py-2 text-center text-sm font-bold text-stone-600">
          {scanState.message}
        </p>
      )}

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
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v}
                  onChange={(e) => set(a.itemId, Number(e.target.value) || 0)}
                  aria-label={`${item.name}のかず`}
                  className="w-14 rounded-lg border border-sky bg-sky/40 py-1 text-center font-extrabold"
                />
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
