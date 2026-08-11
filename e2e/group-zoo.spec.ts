import { test, expect } from "@playwright/test";
import { seedApp, waterStock, type SeedStock } from "./helpers";

// 指定品目に在庫5を持たせたシード（期限は約1年後の「たぶん」）
function stockFor(itemId: number): SeedStock {
  return waterStock({
    itemId,
    lots: [
      {
        id: `lot-${itemId}-e2e`,
        qty: 5,
        expiresOn: "2027-08-01",
        stage: "guessed",
        kind: "best-before",
      },
    ],
  });
}

test("グループの動物が在庫のある品目の数だけ現れる", async ({ page }) => {
  // あかり・でんきグループ: 懐中電灯(29)と乾電池(30)を備える → ぴかろうが2羽
  await seedApp(page, [stockFor(29), stockFor(30)]);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /ぴかろう/ })).toHaveCount(2);
  // 個体タップでその品目の詳細ページへ
  await page.getByRole("link", { name: "ぴかろう（乾電池）" }).click();
  await expect(page).toHaveURL("/item/30");
  await expect(page.getByRole("heading", { name: "ぴかろう" })).toBeVisible();
});

test("グループ紹介ページから品目の詳細へ行ける", async ({ page }) => {
  await seedApp(page, [stockFor(29)]);
  await page.goto("/group/power");
  await expect(page.getByRole("heading", { name: "ぴかろう" })).toBeVisible();
  // 品目一覧: 備えあり（懐中電灯）と未備え（乾電池 → まだ備えてないよ）が並ぶ
  await expect(page.getByText("まだ備えてないよ").first()).toBeVisible();
  await page.getByRole("link", { name: /乾電池/ }).click();
  await expect(page).toHaveURL("/item/30");
});
