"use client";
// 牧場の1匹分: 家（テント/光るおうち/看板）+ なわばり内を歩き回る動物
// 位置は牧場コンテナに対する%。移動はCSS transitionに任せ、JSは目的地を選ぶだけ
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AnimalSprite from "@/components/AnimalSprite";
import type { Animal, Family, Stock, StockpileItem } from "@/lib/types";
import type { Territory } from "@/lib/pasture";
import { pickWaypoint } from "@/lib/pasture";
import { plotState } from "@/lib/village";
import { effectiveNeed } from "@/lib/need";
import { daysUntil, moodOf, soonestExpiry } from "@/lib/expiry";

/** 1回の歩行にかける時間(ms)。CSS transition の duration と揃えること */
const WALK_MS = 4000;

/** OSの「視差効果を減らす」設定の人には歩きを止める */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

interface Props {
  animal: Animal;
  item: StockpileItem;
  stock: Stock | undefined;
  family: Family;
  today: Date;
  territory: Territory;
}

export default function PastureAnimal({
  animal,
  item,
  stock,
  family,
  today,
  territory: t,
}: Props) {
  const qty = stock?.qty ?? 0;
  const eff = effectiveNeed(item, family);
  const state = plotState(qty, eff.isFallback ? null : eff.value, family);

  // 期限が一番近い記録から気分を決める（グリッド時代と同じルール）
  const lot = stock ? soonestExpiry(stock) : undefined;
  const days = lot ? daysUntil(lot.expiresOn, today) : null;
  const mood = state !== "empty" && days !== null ? moodOf(days) : "calm";

  // 歩行: 初期位置はなわばり中心（SSRと一致する決め打ち値）。マウント後に歩き始める
  const [pos, setPos] = useState({ x: t.cx, y: t.cy });
  const [facing, setFacing] = useState<1 | -1>(1);
  const posRef = useRef(pos);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || state === "empty") return;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const next = pickWaypoint(t);
      // 左へ向かうときは絵を左右反転
      setFacing(next.x < posRef.current.x ? -1 : 1);
      posRef.current = next;
      setPos(next);
      // 歩き終わってから1〜3秒ひと休みして次の地点へ
      timer = setTimeout(step, WALK_MS + 1000 + Math.random() * 2000);
    };
    // 全員が同時に動き出さないよう出だしをばらす
    timer = setTimeout(step, Math.random() * 2000);
    return () => clearTimeout(timer);
  }, [reduced, state, t]);

  // 画面の下にいるほど手前に描画（重なりが自然に見える）
  const z = Math.round(pos.y);

  return (
    <>
      {/* 家: テント → 光るおうち。位置は固定。飾りなのでタップ対象にしない */}
      {state !== "empty" && (
        <span
          aria-hidden
          className={`absolute -translate-x-1/2 -translate-y-1/2 text-2xl ${
            state === "lit" ? "animate-glow rounded-full" : ""
          }`}
          style={{ left: `${t.homeX}%`, top: `${t.homeY}%`, zIndex: Math.round(t.homeY) }}
        >
          {state === "lit" ? "🏠" : "⛺"}
        </span>
      )}

      {/* 動物（歩き回る）or 看板（まだいない）。タップで詳細ページへ */}
      {state === "empty" ? (
        <Link
          href={`/item/${item.id}`}
          aria-label={`${item.name}（まだ村にいない）`}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl transition-transform active:scale-90"
          style={{ left: `${t.homeX}%`, top: `${t.homeY}%`, zIndex: Math.round(t.homeY) }}
        >
          🪧
        </Link>
      ) : (
        <Link
          href={`/item/${item.id}`}
          aria-label={animal.name}
          className="absolute -translate-x-1/2 -translate-y-1/2 active:scale-90"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            zIndex: z,
            transition: `left ${WALK_MS}ms linear, top ${WALK_MS}ms linear`,
          }}
        >
          {/* せがみ・しょんぼりの吹き出し（ゲームの核なので牧場でも出す） */}
          {mood === "begging" && (
            <span className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-alert px-2 py-0.5 text-[10px] font-bold text-white shadow">
              あそんで！
            </span>
          )}
          {mood === "sad" && (
            <span className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-400 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              見てね…
            </span>
          )}
          <span
            className={`block ${
              mood === "begging"
                ? "animate-hop"
                : mood === "sad"
                  ? "animate-droop"
                  : ""
            }`}
            style={{ transform: `scaleX(${facing})` }}
          >
            <AnimalSprite
              animal={animal}
              expression={
                mood === "begging"
                  ? "begging"
                  : state === "lit" && (mood === "calm" || mood === "restless")
                    ? "happy"
                    : "normal"
              }
              sizeClass="h-12 w-12"
              fallbackClass="text-3xl"
            />
          </span>
        </Link>
      )}
    </>
  );
}
