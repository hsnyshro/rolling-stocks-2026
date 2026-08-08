// 出典表示（全画面の下に必ず出す。企画の確定ルール）
export default function SourceFooter() {
  return (
    <footer className="mt-auto px-4 py-3 text-center text-[10px] leading-relaxed text-stone-500">
      <p>
        出典:{" "}
        <a
          href="https://www.bichiku.metro.tokyo.lg.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          東京備蓄ナビ 品目データ（東京都）
        </a>
        ・MITライセンス
      </p>
      <p>本アプリは東京都の認定・推奨を受けたものではありません</p>
    </footer>
  );
}
