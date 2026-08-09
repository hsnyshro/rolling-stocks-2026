"use client";
// どうぶつの絵。画像を表示し、読み込めない時は絵文字で表示（フォールバック）
import { useState } from "react";
import type { Animal } from "@/lib/types";

export type AnimalExpression = "normal" | "begging" | "happy";

interface Props {
  animal: Animal;
  expression?: AnimalExpression;
  /** 画像のサイズ用クラス（例: "h-16 w-16"） */
  sizeClass?: string;
  /** 絵文字フォールバック時の文字サイズ用クラス（例: "text-4xl"） */
  fallbackClass?: string;
  className?: string;
}

export default function AnimalSprite({
  animal,
  expression = "normal",
  sizeClass = "h-16 w-16",
  fallbackClass = "text-4xl",
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`${fallbackClass} ${className}`} aria-hidden>
        {animal.emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 静的アセットの小さな画像なので最適化不要
    <img
      src={`/animals/${animal.slug}-${expression}.png`}
      alt={animal.name}
      className={`${sizeClass} select-none object-contain ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
