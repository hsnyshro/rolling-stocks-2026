import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
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
    "棚を撮ると、どうぶつが村にやってくる。期限が来る前に食べて買い足すと、村が育つ。東京備蓄ナビのデータで、家族に必要な備蓄がわかる防災×育成ゲーム。",
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
        {children}
      </body>
    </html>
  );
}
