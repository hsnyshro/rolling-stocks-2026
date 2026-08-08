import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Workers AI（AIバインディング）は `npm run preview` と本番デプロイでのみ有効。
// next dev では使わない（リモート接続に Cloudflare 認証が必須で、未ログインだと起動ごと失敗するため）。
// /api/voice は Workers AI → Gemini → 定型文の三段構えなので、dev でも動作は壊れない。
// dev でもバインディングを使いたくなったら、wrangler login 後に ↓ を有効化する:
// import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
// if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
