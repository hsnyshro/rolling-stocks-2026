"use client";
// 人数を +/− で入れる部品
interface Props {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
}

export default function Stepper({ label, emoji, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-sm">
      <span className="text-sm font-bold">
        <span className="mr-2 text-xl align-middle">{emoji}</span>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label}を減らす`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-9 w-9 rounded-full bg-sky text-lg font-bold active:scale-90 disabled:opacity-30"
          disabled={value === 0}
        >
          −
        </button>
        <span className="w-6 text-center text-lg font-extrabold">{value}</span>
        <button
          type="button"
          aria-label={`${label}を増やす`}
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 rounded-full bg-grass text-lg font-bold text-white active:scale-90"
        >
          ＋
        </button>
      </div>
    </div>
  );
}
