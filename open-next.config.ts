// OpenNext (Cloudflare) の設定。最小構成でOK
// キャッシュ系のオプションは使わない（このアプリはほぼ端末内で完結するため）
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
