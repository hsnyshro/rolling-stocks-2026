// Workers AI（Cloudflareのエッジで動くAI）に写真を渡して、文章で答えてもらう共通部品
// scan（棚の品目カウント）と expiry（期限の読み取り）の両方で使う
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 写真が読めるモデル。実験（scripts/try-workers-ai-vision.mjs）で
// 棚のカウント・期限の読み取りともに最も安定していた
export const VISION_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

type AiBinding = { run: (model: string, input: unknown) => Promise<unknown> };

/** Workers AI の binding を取り出す。ローカルや未設定のときは null */
export function getAiBinding(): AiBinding | null {
  try {
    const { env } = getCloudflareContext();
    return (env as { AI?: AiBinding }).AI ?? null;
  } catch {
    return null;
  }
}

/** 写真＋指示文を送って、モデルの返事（文章）を受け取る。失敗時は null */
export async function askVision(
  ai: AiBinding,
  image: string, // base64
  mimeType: string,
  prompt: string,
  maxTokens = 600
): Promise<string | null> {
  try {
    const result = (await ai.run(VISION_MODEL, {
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}` } },
            { type: "text", text: prompt },
          ],
        },
      ],
    })) as {
      response?: string;
      choices?: { message?: { content?: string } }[];
    };
    // 返事の形はモデルや呼び方で2通りある（response / choices）ので両方見る
    return result.response ?? result.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error("workers-ai vision failed:", e);
    return null;
  }
}

/**
 * 返事の文章からJSON部分だけを取り出して parse する。
 * モデルは「```json ... ```」や前置きの文を付けてくることがあるので、
 * 最初の「{」から最後の「}」までを切り出す。parseできなければ null
 */
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
