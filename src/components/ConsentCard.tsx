"use client";
// 同意画面（企画の確定ルール: 何が端末の外に出るかをはっきり書く）
import { useApp } from "@/store/useApp";

export default function ConsentCard() {
  const { giveConsent } = useApp();

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow">
      <h2 className="text-center text-lg font-extrabold">始める前の約束</h2>

      <ul className="flex flex-col gap-3 text-sm leading-relaxed">
        <li className="flex gap-2">
          <span aria-hidden>📱</span>
          <span>
            <b>家族の人数・備えの記録は、このスマホの中だけ</b>に保存するよ。
            外のサーバには送らない。
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden>📷</span>
          <span>
            外（クラウドのAI）に送るのは<b>棚の写真だけ</b>。
            位置情報は消してから送って、サーバには残さないよ。
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden>🧑‍🧒</span>
          <span>
            <b>13歳未満の人は、保護者と一緒に</b>OKしてね。
          </span>
        </li>
      </ul>

      <button
        type="button"
        onClick={giveConsent}
        className="rounded-full bg-grass-deep py-3 text-lg font-bold text-white shadow-lg active:scale-95"
      >
        わかった！始める
      </button>
    </section>
  );
}
