"use client";
// 全ページ共通ヘッダー
// ・ハンバーガーメニュー: サイトの全体像（どんなページがあるか）を一覧で見せる
// ・パンくずリスト: いま自分がどこにいるかを「村 › ◯◯」の形で見せる
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";
import type { Animal, StockpileItem } from "@/lib/types";

const items = stockpileData.items as StockpileItem[];
const animals = animalsData.animals as Animal[];

// サイトの全体像（メニューに出す一覧）
const SITE_MAP = [
  {
    href: "/",
    emoji: "🏘️",
    label: "村（ホーム）",
    note: "どうぶつと備蓄の一覧・図鑑",
  },
  {
    href: "/start",
    emoji: "👪",
    label: "家族の設定・おすすめ",
    note: "人数を入れると必要な量がわかる",
  },
  {
    href: "/scan",
    emoji: "📷",
    label: "棚卸し",
    note: "棚の写真か手入力で、今の数を登録",
  },
];

/** いまのURLから、パンくず（現在地の道すじ）を作る */
function crumbsFor(pathname: string): { href: string; label: string }[] {
  const home = { href: "/", label: "村" };
  if (pathname === "/start") return [home, { href: "/start", label: "家族の設定" }];
  if (pathname === "/scan") return [home, { href: "/scan", label: "棚卸し" }];
  const m = pathname.match(/^\/item\/(\d+)/);
  if (m) {
    const id = Number(m[1]);
    const animal = animals.find((a) => a.itemId === id);
    const item = items.find((i) => i.id === id);
    return [
      home,
      { href: pathname, label: animal?.name ?? item?.name ?? "品物" },
    ];
  }
  return [home];
}

export default function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ページが変わったらメニューを閉じる
  useEffect(() => setOpen(false), [pathname]);

  // メニューが開いている間は後ろをスクロールさせない + Escで閉じる
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const crumbs = crumbsFor(pathname);

  return (
    <>
      <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 pt-3">
        {/* ハンバーガーボタン */}
        <button
          type="button"
          aria-label="メニューを開く"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl bg-card shadow active:scale-90"
        >
          <span className="h-[2.5px] w-4.5 rounded-full bg-ink" />
          <span className="h-[2.5px] w-4.5 rounded-full bg-ink" />
          <span className="h-[2.5px] w-4.5 rounded-full bg-ink" />
        </button>

        {/* パンくずリスト（いまどこにいるか） */}
        <nav aria-label="現在地" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1 text-sm">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={c.href} className="flex min-w-0 items-center gap-1">
                  {i > 0 && (
                    <span aria-hidden className="text-stone-400">
                      ›
                    </span>
                  )}
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="truncate font-extrabold"
                    >
                      {i === 0 && "🏘️ "}
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      href={c.href}
                      className="shrink-0 font-bold text-grass-deep underline-offset-2 hover:underline"
                    >
                      {i === 0 && "🏘️ "}
                      {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* スライドメニュー本体 */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="メニュー">
          {/* うしろの暗い幕（タップで閉じる） */}
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col gap-1 overflow-y-auto bg-sky p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-extrabold">ローリングストックス</p>
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-lg font-bold shadow active:scale-90"
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-stone-500">
              おうちの備蓄で、どうぶつの村が育つアプリ
            </p>
            {SITE_MAP.map((page) => {
              const isHere =
                page.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(page.href);
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  aria-current={isHere ? "page" : undefined}
                  className={`rounded-2xl p-3 shadow-sm active:scale-95 ${
                    isHere ? "bg-sun/60" : "bg-card"
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold">
                    <span aria-hidden>{page.emoji}</span>
                    {page.label}
                    {isHere && (
                      <span className="ml-auto rounded-full bg-grass-deep px-2 py-0.5 text-[10px] font-bold text-white">
                        いまここ
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block pl-7 text-xs text-stone-500">
                    {page.note}
                  </span>
                </Link>
              );
            })}
            <p className="mt-2 pl-1 text-xs leading-relaxed text-stone-500">
              🐾 どうぶつのページは、村でキャラクターをタップすると開くよ
            </p>
          </div>
        </div>
      )}
    </>
  );
}
