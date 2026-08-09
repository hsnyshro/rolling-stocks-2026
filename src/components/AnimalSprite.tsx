"use client";
// どうぶつの絵。成長段階(stage)と絵の種類(expression)で画像を選ぶ。
// 読み込めない時は「段階の絵→大人の同表情→大人のnormal→絵文字」の順で切り替える
import { useState } from "react";
import type { Animal } from "@/lib/types";
import {
  spriteFile,
  type GrowthStage,
  type SpriteExpression,
} from "@/lib/growth";

export type AnimalExpression = SpriteExpression;

/** 404だったURLの記録（全AnimalSprite共有）。同じ欠品画像を何度も取りに行かない */
const missingSprites = new Set<string>();

interface Props {
  animal: Animal;
  expression?: SpriteExpression;
  /** 成長段階。省略時は大人（既存の呼び出し箇所は従来どおり大人の絵になる） */
  stage?: GrowthStage;
  /** 画像のサイズ用クラス（例: "h-16 w-16"） */
  sizeClass?: string;
  /** 絵文字フォールバック時の文字サイズ用クラス（例: "text-4xl"） */
  fallbackClass?: string;
  className?: string;
}

export default function AnimalSprite({
  animal,
  expression = "normal",
  stage = "adult",
  sizeClass = "h-16 w-16",
  fallbackClass = "text-4xl",
  className = "",
}: Props) {
  // 404を検知したら再描画して次の候補に進むためのカウンタ
  const [, setRetry] = useState(0);

  // 候補を順に試す（重複は除く）
  const candidates = [
    spriteFile(animal.slug, stage, expression),
    spriteFile(animal.slug, "adult", expression),
    spriteFile(animal.slug, "adult", "normal"),
  ].filter((src, i, arr) => arr.indexOf(src) === i);
  const src = candidates.find((s) => !missingSprites.has(s));

  if (!src) {
    return (
      <span className={`${fallbackClass} ${className}`} aria-hidden>
        {animal.emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的アセットの小さな画像なので最適化不要
    <img
      src={src}
      alt={animal.name}
      className={`${sizeClass} select-none object-contain ${className}`}
      draggable={false}
      onError={() => {
        missingSprites.add(src);
        setRetry((n) => n + 1);
      }}
    />
  );
}
