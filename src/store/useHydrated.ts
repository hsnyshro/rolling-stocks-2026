"use client";
// localStorage からの復元（hydration）が終わったかを教えてくれるフック。
// 復元前に画面を描くと「保存したはずのデータが0に見える」バグになるため、
// 保存データを使うページは必ずこれを待ってから描画する。
import { useEffect, useState } from "react";
import { useApp } from "./useApp";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // すでに復元済みならすぐ true。まだなら復元完了イベントを待つ
    if (useApp.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}
