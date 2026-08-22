"use client";

import { useEffect } from "react";
import { setBgmHidden, startBgm } from "@/lib/sound";

/**
 * BGMの開始係（画面には何も描画しない）。
 * モバイルはユーザー操作の外で音を出せないので、最初のタップ/クリック/キー操作を
 * 待ってからBGMを始める。ルートレイアウトに置くのでページ移動しても生き続ける
 */
export default function BgmPlayer() {
  useEffect(() => {
    const events = ["click", "touchend", "keydown"] as const;
    const onGesture = () => {
      // ジェスチャー内で同期的に呼ぶ（中でAudioContextのresumeもする）
      startBgm();
      // 読み込み失敗などで始まらなかった場合は、次の操作でまた試せるよう再登録する
      events.forEach((ev) => document.removeEventListener(ev, onGesture));
      // 音OFF中は次の操作でも何も起きないが、トグルONで別途startBgmされるので問題ない
    };
    events.forEach((ev) => document.addEventListener(ev, onGesture, { passive: true }));

    const onVisibility = () => setBgmHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, onGesture));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
