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
import { usePrefersReducedMotion } from "@/components/usePrefersReducedMotion";
import { growthStage } from "@/lib/growth";
import type { SpriteExpression } from "@/lib/growth";

/** 1回の歩行にかける時間(ms)。CSS transition の duration と揃えること */
const WALK_MS = 4000;
/** 歩きコマの切り替え間隔(ms) */
const FRAME_MS = 300;
/** もぐもぐタイムの長さ(ms) */
const EAT_MS = 2500;

interface Props {
  animal: Animal;
  item: StockpileItem;
  stock: Stock | undefined;
  family: Family;
  today: Date;
  territory: Territory;
  /** 家（テント/光るおうち）と看板を描くか。グループの帯では帯側が家を1つだけ描くので false */
  showHome?: boolean;
  /** リンクの読み上げ名。グループの個体は「動物名（品目名）」で区別する */
  ariaLabel?: string;
}

export default function PastureAnimal({
  animal,
  item,
  stock,
  family,
  today,
  territory: t,
  showHome = true,
  ariaLabel,
}: Props) {
  const qty = stock?.qty ?? 0;
  const eff = effectiveNeed(item, family);
  const state = plotState(qty, eff.isFallback ? null : eff.value, family);

  // 期限が一番近い記録から気分を決める（グリッド時代と同じルール）
  const lot = stock ? soonestExpiry(stock) : undefined;
  const days = lot ? daysUntil(lot.expiresOn, today) : null;
  const mood = state !== "empty" && days !== null ? moodOf(days) : "calm";

  // 成長段階: 星の数で決まる（0〜1=赤ちゃん / 2〜4=子ども / 5〜=大人）
  const stage = growthStage(stock?.stars ?? 0);
  const sizeClass =
    stage === "baby" ? "h-12 w-12" : stage === "child" ? "h-15 w-15" : "h-18 w-18";
  const fallbackClass =
    stage === "baby" ? "text-3xl" : stage === "child" ? "text-4xl" : "text-5xl";

  // 歩行: 初期位置はなわばり中心（SSRと一致する決め打ち値）。マウント後に歩き始める
  const [pos, setPos] = useState({ x: t.cx, y: t.cy });
  const [facing, setFacing] = useState<1 | -1>(1);
  const posRef = useRef(pos);
  const reduced = usePrefersReducedMotion();

  const [activity, setActivity] = useState<"walk" | "rest" | "eat">("rest");
  const [frame, setFrame] = useState(0); // 歩きコマ: 0=normal, 1=walk

  useEffect(() => {
    if (reduced || state === "empty") return;
    let timer: ReturnType<typeof setTimeout>;
    const walk = () => {
      const next = pickWaypoint(t);
      // 左へ向かうときは絵を左右反転
      setFacing(next.x < posRef.current.x ? -1 : 1);
      posRef.current = next;
      setPos(next);
      setActivity("walk");
      timer = setTimeout(rest, WALK_MS);
    };
    const rest = () => {
      // 休憩。3回に1回くらいは、もぐもぐタイム
      const eating = Math.random() < 1 / 3;
      setActivity(eating ? "eat" : "rest");
      const restMs = eating ? EAT_MS : 1000 + Math.random() * 2000;
      timer = setTimeout(walk, restMs);
    };
    // 全員が同時に動き出さないよう出だしをばらす
    timer = setTimeout(walk, Math.random() * 2000);
    return () => clearTimeout(timer);
  }, [reduced, state, t]);

  // 歩いている間だけコマを交互に切り替える（パラパラ漫画）
  // state==="empty" になった時も止める: 在庫が尽きて歩行effectが停止しても
  // activity="walk" のまま凍りうるため、このeffect単独でも空判定が必要
  useEffect(() => {
    if (activity !== "walk" || reduced || state === "empty") {
      setFrame(0);
      return;
    }
    const iv = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), FRAME_MS);
    return () => clearInterval(iv);
  }, [activity, reduced, state]);

  // 絵の優先順位: せがみ > もぐもぐ > 歩きコマ > 満タン&機嫌よし > ふつう
  const expression: SpriteExpression =
    mood === "begging"
      ? "begging"
      : activity === "eat"
        ? "eating"
        : activity === "walk" && frame === 1
          ? "walk"
          : state === "lit" && (mood === "calm" || mood === "restless")
            ? "happy"
            : "normal";
  // 体の動き: せがみ/しょんぼりは既存アニメ優先。歩行中はトコトコ、もぐもぐ中は脈動
  const motionClass =
    mood === "begging"
      ? "animate-hop"
      : mood === "sad"
        ? "animate-droop"
        : activity === "walk" && !reduced
          ? "animate-trot"
          : activity === "eat" && !reduced
            ? "animate-munch"
            : "";

  // 画面の下にいるほど手前に描画（重なりが自然に見える）
  const z = Math.round(pos.y);

  return (
    <>
      {/* 家: テント → 光るおうち。位置は固定。飾りなのでタップ対象にしない */}
      {showHome && state !== "empty" && (
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
        showHome ? (
          <Link
            href={`/item/${item.id}`}
            aria-label={`${item.name}（まだ動物園にいない）`}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl transition-transform active:scale-90"
            style={{ left: `${t.homeX}%`, top: `${t.homeY}%`, zIndex: Math.round(t.homeY) }}
          >
            🪧
          </Link>
        ) : null
      ) : (
        <Link
          href={`/item/${item.id}`}
          aria-label={ariaLabel ?? animal.name}
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
          <span className="block" style={{ transform: `scaleX(${facing})` }}>
            <span className={`block ${motionClass}`}>
              <AnimalSprite
                animal={animal}
                expression={expression}
                stage={stage}
                sizeClass={sizeClass}
                fallbackClass={fallbackClass}
              />
            </span>
          </span>
        </Link>
      )}
    </>
  );
}
