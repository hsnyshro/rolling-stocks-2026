"use client";
// 家族のことを入れる → 東京都のすすめる備蓄量（7日分）が出る
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/store/useApp";
import type { Family } from "@/lib/types";
import Stepper from "@/components/Stepper";
import RecommendList from "@/components/RecommendList";
import ConsentCard from "@/components/ConsentCard";
import SourceFooter from "@/components/SourceFooter";
import { useHydrated } from "@/store/useHydrated";

const DEFAULT_FAMILY: Family = {
  adults: 2,
  teens: 0,
  kids: 0,
  babies: 0,
  seniors: 0,
  pets: 0,
};

export default function StartPage() {
  const router = useRouter();
  const { family, setFamily, consented } = useApp();
  const [draft, setDraft] = useState<Family>(family ?? DEFAULT_FAMILY);
  const [showList, setShowList] = useState(family !== null);
  // localStorage 復元完了を待つ + 復元後に保存済みの家族構成を下書きに反映
  const ready = useHydrated();
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!ready || restored) return;
    const f = useApp.getState().family;
    if (f) {
      setDraft(f);
      setShowList(true);
    }
    setRestored(true);
  }, [ready, restored]);

  if (!ready) return null;

  // はじめての人には、まず「おやくそく」（同意画面）
  if (!consented) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 p-4">
        <ConsentCard />
        <SourceFooter />
      </main>
    );
  }

  const set = (k: keyof Family) => (v: number) => {
    setDraft({ ...draft, [k]: v });
    setShowList(false);
  };

  const memberCount =
    draft.adults + draft.teens + draft.kids + draft.babies + draft.seniors;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
      <h1 className="text-center text-xl font-extrabold">
        かぞくの こと おしえて
      </h1>
      <p className="text-center text-xs text-stone-600">
        東京備蓄ナビ（東京都）の計算で、7日分の必要量が出るよ
      </p>

      <Stepper label="おとな（18〜64さい）" emoji="🧑" value={draft.adults} onChange={set("adults")} />
      <Stepper label="中学生・高校生" emoji="🎒" value={draft.teens} onChange={set("teens")} />
      <Stepper label="こども（小学生以下）" emoji="🧒" value={draft.kids} onChange={set("kids")} />
      <Stepper label="あかちゃん（0〜2さい）" emoji="👶" value={draft.babies} onChange={set("babies")} />
      <Stepper label="65さい以上" emoji="🧓" value={draft.seniors} onChange={set("seniors")} />
      <Stepper label="ペット" emoji="🐾" value={draft.pets} onChange={set("pets")} />

      <button
        type="button"
        disabled={memberCount === 0}
        onClick={() => {
          setFamily(draft);
          setShowList(true);
        }}
        className="mt-2 rounded-full bg-grass-deep py-3 text-lg font-bold text-white shadow-lg active:scale-95 disabled:opacity-40"
      >
        ひつような そなえを 見る
      </button>

      {showList && (
        <>
          <RecommendList family={draft} />
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-sun py-3 text-lg font-bold shadow-lg active:scale-95"
          >
            むらへ いく →
          </button>
        </>
      )}

      <SourceFooter />
    </main>
  );
}
