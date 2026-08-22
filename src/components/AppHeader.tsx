"use client";
// 全ページ共通ヘッダー
// ・ハンバーガーメニュー: サイトの全体像（どんなページがあるか）を一覧で見せる
// ・パンくずリスト: いま自分がどこにいるかを「動物園 › ◯◯」の形で見せる
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import stockpileData from "@/data/stockpile.json";
import type { StockpileItem } from "@/lib/types";
import { GROUPS, animalFor } from "@/lib/zoo";
import { playTap, setSoundEnabled, soundEnabled, startBgm, stopBgm } from "@/lib/sound";

const items = stockpileData.items as StockpileItem[];

// サイトの全体像（メニューに出す一覧）
const SITE_MAP = [
  {
    href: "/",
    emoji: "🦁",
    label: "動物園（ホーム）",
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
  const home = { href: "/", label: "動物園" };
  if (pathname === "/start") return [home, { href: "/start", label: "家族の設定" }];
  if (pathname === "/scan") return [home, { href: "/scan", label: "棚卸し" }];
  const m = pathname.match(/^\/item\/(\d+)/);
  if (m) {
    const id = Number(m[1]);
    const animal = animalFor(id);
    const item = items.find((i) => i.id === id);
    return [
      home,
      { href: pathname, label: animal?.name ?? item?.name ?? "品物" },
    ];
  }
  const g = pathname.match(/^\/group\/([^/]+)/);
  if (g) {
    const group = GROUPS.find((x) => x.key === g[1]);
    return [home, { href: pathname, label: group?.animalName ?? "？" }];
  }
  return [home];
}

export default function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // 音のON/OFF。保存値はlocalStorageにあるので、描画後に読み込んで合わせる
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(soundEnabled()), []);
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) {
      playTap(); // ONにした瞬間に小さく鳴らして「音が出る」と分かるように
      startBgm(); // クリック内なのでBGMもここから始められる
    } else {
      stopBgm();
    }
  };

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
                      {i === 0 && "🦁 "}
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      href={c.href}
                      className="shrink-0 font-bold text-grass-deep underline-offset-2 hover:underline"
                    >
                      {i === 0 && "🦁 "}
                      {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* 音のON/OFFトグル */}
        <button
          type="button"
          aria-label={sound ? "音を消す" : "音を出す"}
          aria-pressed={sound}
          onClick={toggleSound}
          className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold shadow active:scale-90 ${
            sound ? "bg-grass/35 text-grass-deep" : "bg-card text-stone-400"
          }`}
        >
          {/* スピーカー。消音中は赤い太い斜め棒を重ねて一目で分かるようにする */}
          <span aria-hidden className="relative inline-flex h-7 w-7 items-center justify-center text-xl">
            {sound ? "🔊" : "🔈"}
            {!sound && (
              <span className="absolute left-1/2 top-1/2 h-[3.5px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-red-500 shadow-[0_0_0_2px_white]" />
            )}
          </span>
          <span aria-hidden>{sound ? "音 ON" : "音 OFF"}</span>
        </button>
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
              おうちの備蓄が、動物園になるアプリ
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
              🐾 どうぶつのページは、動物園でキャラクターをタップすると開くよ
            </p>
          </div>
        </div>
      )}
    </>
  );
}
