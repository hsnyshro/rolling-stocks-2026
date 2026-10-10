# ローリングストックス

おうちの備蓄で、どうぶつの村が育つ。
都知事杯オープンデータ・ハッカソン2026 参加作品。

下の手順で、**自分の Cloudflare アカウントにデプロイ**して遊べます。

## どんなアプリ？

- 棚を撮る（or 手で数える）と、備蓄の品物ごとに**どうぶつが村に引っ越してくる**
- 家族の人数を入れると、**東京備蓄ナビ（東京都）の計算**で7日分の必要量がわかる
- 必要量まで揃うと、どうぶつの家が建って**光る**
- 期限が近づくと、どうぶつが「あそんで！」とせがむ → **期限が来る前に食べて、買い足す**（ローリングストック）と星がもらえる

## 使っているオープンデータ

- [東京備蓄ナビ](https://www.bichiku.metro.tokyo.lg.jp/) 品目データ（東京都）
  - MIT License / Copyright (c) 2021 Tokyo Metropolitan Government and other contributors.
  - ライセンス全文: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)（アプリ内でも `/licenses/tokyo-bichiku-navi-LICENSE.txt` として同梱）
  - 67品目の「1人1日あたり必要量（年代・性別ごと）」を必要量計算にそのまま使用
  - CSV化: [code4fukui/tokyobichikunavi](https://github.com/code4fukui/tokyobichikunavi)
- 本アプリは東京都の認定・推奨を受けたものではありません

## 動かし方

### 必要なもの

- **Node.js 22 以上**と npm（デプロイに使う wrangler が Node.js 22 以上を要求します）
- デプロイする場合のみ: **Cloudflare アカウント**（無料プランで動きます。<https://dash.cloudflare.com/sign-up>）

### 1. 自分のパソコンで動かす

```bash
git clone https://github.com/hsnyshro/rolling-stocks-2026.git
cd rolling-stocks-2026
npm install
npm run dev        # http://localhost:3000 を開く
```

家族構成・在庫の記録はブラウザの localStorage に保存されるので、これだけで遊べます。

この方法（`npm run dev`）では Cloudflare の Workers AI が使えないため、AI まわりは次のようになります。

- どうぶつのセリフ: あらかじめ用意した定型文で表示されます
- 棚の写真スキャン・期限の読み取り: 使えません（「手で数える」は使えます）
- どちらも、後述の Gemini キーを設定すれば `npm run dev` でも動きます

### 2. Cloudflare にデプロイする（自分のURLで公開）

```bash
npx wrangler login                  # ブラウザが開くので Cloudflare にログイン
npx opennextjs-cloudflare build     # Cloudflare Workers 用にビルド
npx wrangler deploy                 # デプロイ
```

- 初回は「workers.dev のサブドメイン」を登録する画面が出ます（Cloudflare ダッシュボードの Workers & Pages からも登録できます）。
- 完了すると `https://rolling-stocks.<あなたのサブドメイン>.workers.dev` のようなURLが表示されます。スマホで開けば、そのまま遊べます（ホーム画面にも追加できます）。
- **Workers AI（写真判別・セリフ生成）は追加設定なしで使えます。** [wrangler.jsonc](wrangler.jsonc) の `ai` バインディングが、デプロイしたアカウントの Workers AI につながります。無料枠を超えると従量課金になることがあるので、料金は Cloudflare の Workers AI の料金ページで確認してください。
- Worker の名前を変えたいときは、[wrangler.jsonc](wrangler.jsonc) の `name` と `services` の中の `service` を**同じ名前**に書き換えます。
- ビルドは webpack 方式に設定済み（[open-next.config.ts](open-next.config.ts)）です。変えなくて大丈夫です。

### 3. Workers AI つきで手元で試す（任意）

```bash
npx wrangler login   # AI バインディングは Cloudflare に接続するため、ログインが必要
npm run preview      # ビルドして、手元で Cloudflare Workers の環境を再現
```

### Gemini を使う（任意）

通常は不要です。AI は **Workers AI → Gemini → 定型文**の順に試すので、Gemini は「Workers AI が失敗したときの保険」です。使いたい人だけ、[Google AI Studio](https://aistudio.google.com/) で API キーを取得して設定してください。

| 使う場所 | 設定のしかた |
|---|---|
| `npm run dev` | [.env.example](.env.example) を `.env.local` にコピーし、`GOOGLE_API_KEY=` にキーを書く |
| `npm run preview` | 同じ内容を `.dev.vars` に書く |
| デプロイ先 | `npx wrangler secret put GOOGLE_API_KEY` を実行して、キーを貼り付ける |
| 外したいとき（デプロイ先） | `npx wrangler secret delete GOOGLE_API_KEY` |

- `.env*` と `.dev.vars` は `.gitignore` 済みです。**キーはコミットしないでください。**
- キーを設定したときだけ、Workers AI が失敗した場面で、写真やセリフの材料が Google の API に送られます。

### 自分のURLを公開するときの注意

写真判別やセリフ生成の API（`/api/scan` `/api/expiry` `/api/voice`）は、URLを知っていれば誰でも呼べます。広く公開するなら、Cloudflare ダッシュボードの「セキュリティ → WAF → レート制限ルール」で、`/api/` への連続アクセスを制限しておくと安心です。

## 開発コマンド

```bash
npm test                          # ロジックの単体テスト
npx playwright install chromium   # E2E テストの初回だけ
npm run test:e2e                  # 画面のE2Eテスト（スマホ画面サイズで実行）
npm run lint
node scripts/build-stockpile.mjs  # 東京備蓄ナビのCSV → src/data/stockpile.json を再生成
```

技術: Next.js 16 / TypeScript / Tailwind CSS 4 / zustand / Cloudflare Workers（OpenNext）/ Cloudflare Workers AI（写真判別: Mistral Small 3.1・セリフ: Qwen3）/ Gemini API（`GOOGLE_API_KEY` があるときだけの保険）

## プライバシー

家族構成・在庫・期限の記録は**すべて端末（ブラウザのlocalStorage）内だけ**に保存。
外部のAIに送るのは棚の写真だけで、位置情報は削除してから送ります。写真は通常、Cloudflare 内の Workers AI で処理されます。Gemini のキーを設定した場合に限り、Workers AI が失敗したときの保険として Google の API にも送られます。

## ライセンスとデータの権利

- ソースコードと、このリポジトリ独自の素材: [LICENSE](LICENSE)（MIT License）
- **データの権利の扱いは、東京備蓄ナビ（東京都）に従います。** 品目リスト・必要量などのデータ（[data/source/](data/source/)、[src/data/stockpile.json](src/data/stockpile.json)、それを使った表示・計算）は、東京備蓄ナビの MIT License（Copyright (c) 2021 Tokyo Metropolitan Government and other contributors.）の条件に従います。再利用・再配布するときは、著作権表示とライセンス文を残してください（全文は [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)）。
- 東京都の認定・推奨を受けたものではありません。
- フォント M PLUS Rounded 1c: SIL Open Font License 1.1（詳細は [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)）
