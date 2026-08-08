# ローリングストックス

おうちの備蓄で、どうぶつの村が育つ。
都知事杯オープンデータ・ハッカソン2026 参加作品。

## どんなアプリ？

- 棚を撮る（or 手で数える）と、備蓄の品物ごとに**どうぶつが村に引っ越してくる**
- 家族の人数を入れると、**東京備蓄ナビ（東京都）の計算**で7日分の必要量がわかる
- 必要量まで揃うと、どうぶつの家が建って**光る**
- 期限が近づくと、どうぶつが「あそんで！」とせがむ → **期限が来る前に食べて、買い足す**（ローリングストック）と星がもらえる

## 使っているオープンデータ

- [東京備蓄ナビ](https://www.bichiku.metro.tokyo.lg.jp/) 品目データ（東京都）
  - MIT License / Copyright (C) Tokyo Metropolitan Government
  - 67品目の「1人1日あたり必要量（年代・性別ごと）」を必要量計算にそのまま使用
  - CSV化: [code4fukui/tokyobichikunavi](https://github.com/code4fukui/tokyobichikunavi)
- 本アプリは東京都の認定・推奨を受けたものではありません

## プライバシー

家族構成・在庫・期限の記録は**すべて端末（ブラウザのlocalStorage）内だけ**に保存。
外部（クラウドAI）に送るのは棚の写真だけ（位置情報は削除）。

## 開発

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ロジックのテスト
node scripts/build-stockpile.mjs   # CSV→JSON 再生成
```

技術: Next.js 16 / TypeScript / Tailwind CSS 4 / zustand / Gemini API（写真判別・セリフ・キャラ絵）

## ドキュメント

- [開発計画](tasks/dev-plan-2026-0809.md)
- [企画書 v3.2](tasks/rolling-stocks-spec-v3.md)
- [進捗](progress-tracking.md)
