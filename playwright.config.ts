import { defineConfig } from "@playwright/test";

// スマホ向けアプリなので、スマホ相当の画面(390×844)+タッチで実行する。
// 動物が歩き回るとクリック位置が安定しないため、OSの「動きを減らす」設定を
// エミュレートして静止させる（アプリ側は対応済み。検証対象の文言・数値・遷移は動きと無関係）
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    // 導入したPlaywrightのバージョンでは reducedMotion は use 直下ではなく
    // contextOptions 経由（BrowserContextOptions）で指定する仕様になっている
    contextOptions: { reducedMotion: "reduce" },
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
