// アプリ全体で使う型定義

// ---- 家族構成（東京備蓄ナビの年代区分そのまま）----
// UIでは簡単にするため男女を分けず、必要量が多い方（安全側）の列を使う
export interface Family {
  adults: number; // おとな（18〜64歳） → adultMale の値を使う
  teens: number; // 中高生 → child2Male
  kids: number; // こども（小学生以下） → child1Male
  babies: number; // あかちゃん（0〜2歳くらい） → infantsMale
  seniors: number; // 65歳以上 → agedMale
  pets: number; // ペット → pet
}

// ---- 備蓄ナビの品目 ----
export interface StockpileItem {
  id: number;
  name: string;
  unit: string;
  category: string;
  description: string;
  image: string;
  /** 1人1日あたりの必要量。null = 人数比例ではない品目 */
  needs: {
    infantsMale: number | null;
    infantsFemale: number | null;
    child1Male: number | null;
    child1Female: number | null;
    child2Male: number | null;
    child2Female: number | null;
    adultMale: number | null;
    adultFemale: number | null;
    agedMale: number | null;
    agedFemale: number | null;
    pet: number | null;
  };
}

// ---- どうぶつ ----
export interface Animal {
  itemId: number;
  species: string;
  name: string;
  emoji: string;
  /** 画像ファイル名の元: /animals/{slug}-{表情}.png */
  slug: string;
  /** 期限の「推測」段階で使う保存期間の目安（月・安全側） */
  shelfLifeMonths: number;
  profile: string;
}

// ---- 期限の3段階 ----
// guessed   = 種類から短め（安全側）に推測しただけ
// narrowed  = 「いつ買った？」の1タップで幅を狭めた
// confirmed = アップ撮影 or 手動入力で確認済み（数え直しても消えない）
export type ExpiryStage = "guessed" | "narrowed" | "confirmed";

/** 期限の記録。品物のまとまり（同じ日に買った分）ごとに1つ */
export interface ExpiryLot {
  id: string;
  qty: number;
  /** 期限日 (YYYY-MM-DD) */
  expiresOn: string;
  stage: ExpiryStage;
  /** 賞味期限(best-before=おいしさの目安) か 消費期限(use-by=安全の期限) か。不明はbest-before扱い */
  kind: "best-before" | "use-by";
}

// ---- 在庫（品目ごと）----
export interface Stock {
  itemId: number;
  /** いま家にある数（人がタップで確定した値） */
  qty: number;
  /** 期限の記録。qty とは独立に保存する（数え直しても confirmed は消えない） */
  lots: ExpiryLot[];
  /** 「期限前に食べて買い足した」回数 = 星の数 */
  stars: number;
  /**
   * 「期限前に食べたけど、まだ買い足していない」回数。
   * consume() で期限前に食べると +1 され、addCount()（買い足し）で 1 消費して stars が +1 される。
   * ローリングストック（食べる→買い足す）の途中状態を表すカウンタ。
   */
  pendingRotations: number;
}

// ---- グループ ----
/** 品目グループ（食品以外の55品目を8グループに分け、グループごとに世話係の動物が1種いる） */
export interface Group {
  key: string;
  /** 画面に出すグループ名（例: あかり・でんき） */
  label: string;
  animalName: string;
  species: string;
  emoji: string;
  /** 画像ファイル名の元。フェーズ2で {slug}-{stage}-{expression}.png を生成する */
  slug: string;
  profile: string;
  /** このグループが担当する品目ID */
  itemIds: number[];
}

// ---- 村の枠の3状態 ----
// empty    = 空き地（その品目が0個）
// resident = テント暮らし（1個でもある）
// lit      = おうちが建って光る（必要量に届いた）
export type PlotState = "empty" | "resident" | "lit";
