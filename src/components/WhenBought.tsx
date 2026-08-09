"use client";
// 「いつ買った？」の1タップ絞り込み（期限の3段階の2段階目）
// 買った時期から期限を計算し直して、「たぶん」→「だいたい」に上げる
import { narrowExpiry } from "@/lib/expiry";

const CHOICES = [
  { key: "recent", label: "最近" },
  { key: "lastMonth", label: "先月ごろ" },
  { key: "halfYear", label: "半年前ごろ" },
  { key: "overYear", label: "1年以上前" },
] as const;

interface Props {
  shelfLifeMonths: number;
  today: Date;
  onPick: (expiresOn: string) => void;
}

export default function WhenBought({ shelfLifeMonths, today, onPick }: Props) {
  return (
    <div className="mt-1 rounded-xl bg-sky/50 p-2">
      <p className="text-[11px] font-bold text-stone-600">🛒 いつ買った？</p>
      <div className="mt-1 grid grid-cols-2 gap-1">
        {CHOICES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(narrowExpiry(c.key, shelfLifeMonths, today))}
            className="rounded-full bg-card px-2 py-1.5 text-xs font-bold shadow-sm active:scale-95"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
