"use client";
// 詳細ページの動物: 登場ポップ+呼吸+ランダム仕草+操作への反応（もぐもぐ/喜び）
// 「いまの絵と動き」の判定は lib/detailPose.ts に集約（テスト付き）
import { useEffect, useRef, useState } from "react";
import AnimalSprite from "@/components/AnimalSprite";
import { usePrefersReducedMotion } from "@/components/usePrefersReducedMotion";
import type { Animal } from "@/lib/types";
import type { Mood } from "@/lib/expiry";
import type { GrowthStage } from "@/lib/growth";
import {
  detailPose,
  gestureDelay,
  gestureDuration,
  pickGesture,
  type IdleGesture,
} from "@/lib/detailPose";

/** もぐもぐの長さ(ms)。牧場の EAT_MS と同じ */
const EAT_MS = 2500;
/** タップの喜び（2回はね）の長さ(ms)。CSSの animate-joy-hop と揃える */
const TAP_MS = 1000;

/** 親からの操作トリガー。nonce を増やすたびに演出を再生する */
export interface DetailReaction {
  type: "eat" | "tap";
  nonce: number;
}

interface Props {
  animal: Animal;
  stage: GrowthStage;
  mood: Mood;
  isLit: boolean;
  /** 星ゲットのお祝い中か（親のタイマーで2秒間true） */
  celebrating: boolean;
  reaction: DetailReaction | null;
}

export default function DetailAnimal({
  animal,
  stage,
  mood,
  isLit,
  celebrating,
  reaction,
}: Props) {
  const reduced = usePrefersReducedMotion();
  // 実行中の演出（お祝いはpropsで来るのでここには入れない）
  const [action, setAction] = useState<"eat" | "tap" | IdleGesture | null>(null);

  // 仕草スケジューラが「いま演出中か」を読むためのref（タイマー内で最新値を見る）
  const busyRef = useRef(false);
  busyRef.current = action !== null || celebrating;

  // 操作への反応: nonce が変わるたびに再生。古いタイマーが新しい演出を打ち切らないよう
  // 「まだ自分の演出のままなら消す」方式（functional update）にする
  useEffect(() => {
    if (!reaction) return;
    const { type } = reaction;
    setAction(type);
    const t = setTimeout(
      () => setAction((a) => (a === type ? null : a)),
      type === "eat" ? EAT_MS : TAP_MS
    );
    return () => clearTimeout(t);
  }, [reaction]);

  // ランダム仕草: 10〜20秒ごとに1回。演出中なら今回は見送って次の機会に
  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(fire, gestureDelay(Math.random()));
    };
    const fire = () => {
      if (busyRef.current) {
        schedule();
        return;
      }
      const g = pickGesture(Math.random());
      setAction(g);
      timer = setTimeout(() => {
        setAction((a) => (a === g ? null : a));
        schedule();
      }, gestureDuration(g));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduced]);

  const pose = detailPose({
    action: celebrating ? "celebrate" : action,
    mood,
    isLit,
    reduced,
  });

  return (
    // 外側=登場→呼吸 / 中間=演出の動き / 内側=左右反転。transformを層で分けて共存させる
    <span className={`block ${reduced ? "" : "animate-arrive"}`}>
      <span className={`block ${pose.motion}`}>
        <span
          className="block transition-transform"
          style={{ transform: `scaleX(${pose.flipped ? -1 : 1})` }}
        >
          <AnimalSprite
            animal={animal}
            stage={stage}
            expression={pose.expression}
            sizeClass="h-32 w-32"
            fallbackClass="text-6xl"
          />
        </span>
      </span>
    </span>
  );
}
