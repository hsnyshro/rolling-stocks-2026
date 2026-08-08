// 期限の3段階（たぶん→だいたい→確認済み）と残り日数の計算
// 注意: 日付はすべて「ローカル日付」で扱う。
// toISOString() は UTC に変換されて日本時間だと日付が1日ズレることがあるため使わない。
import type { ExpiryLot, ExpiryStage, Stock } from "./types";

/** Date → "YYYY-MM-DD"（ローカル日付のまま文字列にする） */
export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" → その日のローカル0時の Date */
function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * date に months ヶ月足した日付を返す。
 * 足した先に同じ「日」が無い場合（例: 1/31 の1ヶ月後）は、その月の末日に丸める
 * （2/31 → 3/3 と繰り越さず 2/28 にする。期限の推測なので短め=安全側に倒す）。
 */
function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, day);
  if (result.getDate() !== day) {
    result.setDate(0); // 繰り越した分を戻して前月（=目的の月）の末日にする
  }
  return result;
}

/**
 * 期限の「推測」段階: 今日買ったと仮定して、保存期間の目安から期限日を推測する。
 * today + shelfLifeMonths → "YYYY-MM-DD"
 */
export function guessExpiry(shelfLifeMonths: number, today: Date): string {
  return toYMD(addMonths(today, shelfLifeMonths));
}

/** 「いつ買った？」の答え → 購入推定日が今日から何ヶ月前か */
const BOUGHT_OFFSET_MONTHS = {
  recent: 0, // 最近買った = 今日
  lastMonth: 1, // 先月くらい = 1ヶ月前
  halfYear: 6, // 半年くらい前
  overYear: 12, // 1年以上前 = 12ヶ月前とみなす
} as const;

export type BoughtWhen = keyof typeof BOUGHT_OFFSET_MONTHS;

/**
 * 期限の「絞り込み」段階: 「いつ買った？」の1タップで期限の推測を狭める。
 * 購入推定日 + shelfLifeMonths → "YYYY-MM-DD"
 * 結果が過去日になってもそのまま返す（UIが「期限切れかも、確認してね」を出すため）。
 */
export function narrowExpiry(
  boughtWhen: BoughtWhen,
  shelfLifeMonths: number,
  today: Date
): string {
  const bought = addMonths(today, -BOUGHT_OFFSET_MONTHS[boughtWhen]);
  return toYMD(addMonths(bought, shelfLifeMonths));
}

/**
 * 期限日までの残り日数。今日なら 0、明日なら 1、過ぎていたらマイナス。
 * 時刻は無視して日付だけで数える。
 */
export function daysUntil(expiresOn: string, today: Date): number {
  const expiry = fromYMD(expiresOn);
  const base = fromYMD(toYMD(today)); // today の時刻部分を落としてローカル0時に揃える
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // 万一の夏時間などで数時間ズレても round で日数に吸収する
  return Math.round((expiry.getTime() - base.getTime()) / MS_PER_DAY);
}

/**
 * 在庫の中で期限が一番近い lot を返す（どうぶつの気分の判定に使う）。
 * 期限の記録が1つも無ければ undefined。
 */
export function soonestExpiry(stock: Stock): ExpiryLot | undefined {
  let soonest: ExpiryLot | undefined;
  for (const lot of stock.lots) {
    // "YYYY-MM-DD" は文字列比較で時系列順になる
    if (!soonest || lot.expiresOn < soonest.expiresOn) {
      soonest = lot;
    }
  }
  return soonest;
}

/** 期限の段階 → 表示ラベル */
export function stageLabel(stage: ExpiryStage): string {
  switch (stage) {
    case "guessed":
      return "たぶん";
    case "narrowed":
      return "だいたい";
    case "confirmed":
      return "確認済み";
  }
}

/** どうぶつの気分。残り日数が減るほどそわそわ→おねだり→悲しい */
export type Mood = "calm" | "restless" | "begging" | "sad";

/**
 * 残り日数 → 気分
 * calm: 15日以上 / restless: 8〜14日 / begging: 1〜7日 / sad: 0日以下（期限切れ含む）
 */
export function moodOf(daysLeft: number): Mood {
  if (daysLeft > 14) return "calm";
  if (daysLeft >= 8) return "restless";
  if (daysLeft >= 1) return "begging";
  return "sad";
}
