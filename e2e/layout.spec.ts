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

// PC幅(1280px)で、グループの帯の背景（うすい緑）が牧場と同じ幅に収まる
// = 画面の端まで緑が広がらない（スマホ幅では画面幅=カード幅なので気づけない問題）
test("PC幅でも帯の背景が牧場と同じ幅に収まる", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedApp(page);
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  const pasture = await page
    .locator('section[aria-label="どうぶつえん"]')
    .boundingBox();
  // 帯8本を包む外側の要素（背景色がついている）
  const bandsWrapper = await page
    .locator('section[aria-label="えいよう・のみもの"]')
    .locator("xpath=..")
    .boundingBox();
  // 下部ボタン（棚を撮る／おすすめ）を並べている箱
  const navInner = await page
    .locator('main nav a[href="/scan"]')
    .locator("xpath=..")
    .boundingBox();
  expect(pasture).not.toBeNull();
  expect(bandsWrapper).not.toBeNull();
  expect(navInner).not.toBeNull();
  // 左端と幅が牧場と一致（1pxは丸め誤差）
  for (const box of [bandsWrapper!, navInner!]) {
    expect(Math.abs(box.x - pasture!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - pasture!.width)).toBeLessThanOrEqual(1);
  }
});
