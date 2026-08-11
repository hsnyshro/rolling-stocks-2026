import type { Page } from "@playwright/test";

// zustand persist（localStorageキー rolling-stocks-v1）に保存される形。
// src/store/useApp.ts で永続化している状態と同じ構造にすること
export interface SeedStock {
  itemId: number;
  qty: number;
  lots: {
    id: string;
    qty: number;
    expiresOn: string; // "YYYY-MM-DD"
    stage: "guessed" | "narrowed" | "confirmed";
    kind: "best-before" | "use-by";
  }[];
  stars: number;
  pendingRotations: number;
}

/** 大人2人の家族。/start の DEFAULT_FAMILY と同じ構成 */
export const FAMILY_ADULTS2 = {
  adults: 2,
  teens: 0,
  kids: 0,
  babies: 0,
  seniors: 0,
  pets: 0,
};

/** みずまる（水, itemId=1）: 在庫5・期限の記録1件（たぶん・約1年後）・星0 */
export function waterStock(overrides: Partial<SeedStock> = {}): SeedStock {
  return {
    itemId: 1,
    qty: 5,
    lots: [
      {
        id: "lot-1-e2e",
        qty: 5,
        expiresOn: "2027-08-01",
        stage: "guessed",
        kind: "best-before",
      },
    ],
    stars: 0,
    pendingRotations: 0,
    ...overrides,
  };
}

/**
 * 設定済み状態を localStorage に直接シードする。page.goto() の前に呼ぶこと。
 * あわせて、おしゃべりAI(/api/voice)への通信をブロックする
 * （アプリには定型文フォールバックがあるので画面は正常に動く）
 */
export async function seedApp(
  page: Page,
  stocks: SeedStock[] = [waterStock()]
): Promise<void> {
  await page.route("**/api/voice", (route) => route.abort());
  const state = {
    state: {
      family: FAMILY_ADULTS2,
      stocks: Object.fromEntries(stocks.map((s) => [s.itemId, s])),
      consented: true,
      demoOffsetDays: 0,
    },
    version: 0,
  };
  await page.addInitScript((json: string) => {
    window.localStorage.setItem("rolling-stocks-v1", json);
  }, JSON.stringify(state));
}
