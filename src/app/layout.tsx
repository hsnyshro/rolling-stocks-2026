import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

// ゆるかわ系の丸ゴシック（キャラの世界観に合わせる）
const rounded = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-rounded",
});

export const metadata: Metadata = {
  title: "ローリングストックス",
  description:
    "おうちの備蓄が、動物園になる。備えて仲間が増える、食べて育てる。東京備蓄ナビのデータで、家族に必要な備蓄がわかる防災×育成ゲーム。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8fce5e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${rounded.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-rounded bg-sky text-ink">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
