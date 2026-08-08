// どうぶつのセリフをAIが作る（Gemini 3.6 Flash）
// キーが無い・失敗した場合はクライアント側のローカル定型文がそのまま使われる（デモの保険）
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const MOOD_NOTE: Record<string, string> = {
  calm: "きげんはまだ先。のんびり平和な気分",
  restless: "きげんが2週間以内に近づいてきて、そわそわしている",
  begging: "きげんが1週間以内！「あそんで！（=たべて、買いたして）」と元気にせがむ",
  sad: "きげんが すぎてしまったかも。しょんぼり。でも怖がらせない",
};

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no-api-key" }, { status: 503 });
  }

  try {
    const { name, species, itemName, mood, daysLeft } = (await req.json()) as {
      name: string;
      species: string;
      itemName: string;
      mood: string;
      daysLeft: number | null;
    };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          text: [
            `あなたは防災備蓄アプリに住む、ゆるかわいい${species}のキャラ「${name}」です。`,
            `担当する備蓄品: ${itemName}。期限までの残り日数: ${daysLeft ?? "不明"}日。`,
            `いまの気分: ${MOOD_NOTE[mood] ?? MOOD_NOTE.calm}`,
            "",
            "ユーザー（子どもも使う）に話しかける短いセリフを1つだけ作ってください。",
            "ルール:",
            "- 35文字以内。ひらがな多め。絵文字は使わない",
            "- 「死」「腐る」「危険」など怖い言葉は使わない",
            "- 期限が近いときは「たべて、買いたしてね」の方向へ誘う",
            "- セリフの文だけを出力（カギカッコや説明は不要）",
          ].join("\n"),
        },
      ],
      config: { temperature: 1.0 },
    });

    const line = (response.text ?? "").trim().replace(/^「|」$/g, "");
    if (!line) throw new Error("empty");
    return NextResponse.json({ line: line.slice(0, 60) });
  } catch (e) {
    console.error("voice failed:", e);
    return NextResponse.json({ error: "voice-failed" }, { status: 502 });
  }
}
