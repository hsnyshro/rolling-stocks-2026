import { test, expect } from "@playwright/test";
import { seedApp } from "./helpers";

// スマホ幅(390px)で横スクロールが発生しない = レイアウトがはみ出していない
const pages = [
  { name: "スタート", path: "/start" },
  { name: "動物園", path: "/" },
  { name: "詳細", path: "/item/1" },
];

for (const p of pages) {
  test(`スマホ幅ではみ出さない: ${p.name} (${p.path})`, async ({ page }) => {
    await seedApp(page);
    await page.goto(p.path);
    // localStorage復元後に main が描画されるのを待つ
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    // 1pxは丸め誤差として許容
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
