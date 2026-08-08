// どうぶつのセリフをAIが作る
// 三段構え: ① Workers AI（エッジで速い・軽い仕事担当） → ② Gemini（保険）
//          → ③ どちらもダメならクライアント側のローカル定型文（絶対に沈黙しない）
import { GoogleGenAI } from "@google/genai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// Workers AI で使うモデル（多言語対応の軽量モデル。差し替えやすいよう定数に）
const WORKERS_AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

const MOOD_NOTE: Record<string, string> = {
  calm: "きげんはまだ先。のんびり平和な気分",
  restless: "きげんが2週間以内に近づいてきて、そわそわしている",
  begging: "きげんが1週間以内！「あそんで！（=たべて、買いたして）」と元気にせがむ",
  sad: "きげんが すぎてしまったかも。しょんぼり。でも怖がらせない",
};

interface VoiceReq {
  name: string;
  species: string;
  itemName: string;
  mood: string;
  daysLeft: number | null;
}

function buildPrompt(p: VoiceReq): string {
  return [
    `あなたは防災備蓄アプリに住む、ゆるかわいい${p.species}のキャラ「${p.name}」です。`,
    `担当する備蓄品: ${p.itemName}。期限までの残り日数: ${p.daysLeft ?? "不明"}日。`,
    `いまの気分: ${MOOD_NOTE[p.mood] ?? MOOD_NOTE.calm}`,
    "",
    "ユーザー（子どもも使う）に話しかける短いセリフを1つだけ作ってください。",
    "ルール:",
    "- 35文字以内の日本語。ひらがな多め。絵文字は使わない",
    "- 「死」「腐る」「危険」など怖い言葉は使わない",
    "- 期限が近いときは「たべて、買いたしてね」の方向へ誘う",
    "- セリフの文だけを出力（カギカッコや説明は不要）",
  ].join("\n");
}

function clean(text: string): string | null {
  const line = text.trim().replace(/^「|」$/g, "").split("\n")[0].trim();
  return line ? line.slice(0, 60) : null;
}

/** ① Workers AI（Cloudflare のエッジで動くAI）で生成 */
async function viaWorkersAI(prompt: string): Promise<string | null> {
  try {
    const { env } = getCloudflareContext();
    const ai = (env as { AI?: { run: (model: string, input: unknown) => Promise<unknown> } }).AI;
    if (!ai) return null;
    const result = (await ai.run(WORKERS_AI_MODEL, {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
    })) as { response?: string };
    return result.response ? clean(result.response) : null;
  } catch (e) {
    console.error("workers-ai voice failed:", e);
    return null;
  }
}

/** ② Gemini で生成（Workers AI が使えないときの保険） */
async function viaGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { temperature: 1.0 },
    });
    return response.text ? clean(response.text) : null;
  } catch (e) {
    console.error("gemini voice failed:", e);
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as VoiceReq;
  const prompt = buildPrompt(body);

  const line = (await viaWorkersAI(prompt)) ?? (await viaGemini(prompt));
  if (!line) {
    // ③ クライアントのローカル定型文に任せる
    return NextResponse.json({ error: "no-ai" }, { status: 503 });
  }
  return NextResponse.json({ line });
}
