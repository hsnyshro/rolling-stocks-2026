import { test, expect } from "@playwright/test";
import { seedApp } from "./helpers";

// 詳細ページの「いまの数」の数値表示（例: "5/42L" の先頭の数）
function qtyDisplay(page: import("@playwright/test").Page) {
  return page
    .locator("main section", { hasText: "いまの数" })
    .locator("span.text-2xl");
}

test("シナリオ1 初回スタート: おやくそく→家族設定→動物園へ", async ({
  page,
}) => {
  // シードなし = まっさらな状態から画面操作だけで進める
  await page.route("**/api/voice", (route) => route.abort());
  await page.goto("/start");
  // おやくそく（同意）
  await page.getByRole("button", { name: /わかった！始める/ }).click();
  // 家族設定（初期値: 大人2人）→ おすすめ備蓄量を表示
  await page.getByRole("button", { name: /必要な備えを見る/ }).click();
  // 動物園へ
  await page.getByRole("button", { name: /動物園へ行く/ }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("どうぶつえん")).toBeVisible();
});

test("シナリオ2 動物園から動物をタップして詳細へ", async ({ page }) => {
  await seedApp(page);
  await page.goto("/");
  // reducedMotion: "reduce" で動物は歩かず静止しているのでクリックが安定する
  await page.getByRole("link", { name: "みずまる" }).click();
  await expect(page).toHaveURL("/item/1");
  await expect(page.getByRole("heading", { name: "みずまる" })).toBeVisible();
});

test("シナリオ3 食べたよで数が1減る", async ({ page }) => {
  await seedApp(page);
  await page.goto("/item/1");
  await expect(qtyDisplay(page)).toHaveText(/^5\//);
  await page.getByRole("button", { name: /食べたよ/ }).click();
  await expect(qtyDisplay(page)).toHaveText(/^4\//);
});

test("シナリオ4 買ってきたよで数が戻り星ゲット", async ({ page }) => {
  await seedApp(page);
  await page.goto("/item/1");
  // 期限前に食べる → 買い足すと星が1つ増える（ローリングストックの核）
  await page.getByRole("button", { name: /食べたよ/ }).click();
  await page.getByRole("button", { name: /買ってきたよ/ }).click();
  await page.getByRole("button", { name: /この数で登録する/ }).click();
  await expect(qtyDisplay(page)).toHaveText(/^5\//);
  await expect(page.getByText("やったー！⭐ゲット！")).toBeVisible();
});

test("シナリオ5 期限を手で入れて確認済みにする", async ({ page }) => {
  await seedApp(page);
  await page.goto("/item/1");
  // 期限の行（「たぶん」バッジ）をタップして開く
  await page.getByRole("button", { name: /たぶん/ }).click();
  // 手入力欄に日付を入れて確定
  await page.getByLabel("期限を手で入れる").fill("2027-09-01");
  await page.getByRole("button", { name: /かくてい/ }).click();
  await expect(page.getByText(/確認済み/)).toBeVisible();
});
