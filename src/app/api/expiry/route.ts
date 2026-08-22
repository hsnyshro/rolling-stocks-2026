// 商品のアップ写真 → 期限の日付を読み取る
// ① Workers AI（Cloudflareのエッジ、写真が外部サービスに出ない・無料枠あり）
// ② Gemini（GOOGLE_API_KEY があるときだけの保険）
// 読み取った日付は「確認済み」への昇格に使う。読めなければ手動入力に誘導
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { askVision, extractJson, getAiBinding } from "@/lib/workersAiVision";

export const maxDuration = 30;

type ExpiryResult = { found?: boolean; date?: string; kind?: string };

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "期限の日付が読み取れたか" },
    date: {
      type: "string",
      description: "読み取れた期限 (YYYY-MM-DD)。日が無い表記(2027.04など)は月末にする",
    },
    kind: {
      type: "string",
      enum: ["best-before", "use-by"],
      description: "「賞味期限」なら best-before、「消費期限」なら use-by。不明なら best-before",
    },
  },
  required: ["found"],
} as const;

const PROMPT = [
  "この写真は食品パッケージのアップです。",
  "賞味期限または消費期限の日付を探して読み取ってください。",
  "「27.04.15」のような表記は 2027-04-15 と解釈します（年.月.日の順）。",
  "日が書かれていない場合（例: 2027.04）はその月の末日にしてください。",
  "はっきり読み取れない場合は found=false にしてください（推測しない）。",
].join("\n");

/** ① Workers AI で読み取り */
async function viaWorkersAI(image: string, mimeType: string): Promise<ExpiryResult | null> {
  const ai = getAiBinding();
  if (!ai) return null;
  const text = await askVision(
    ai,
    image,
    mimeType,
    PROMPT +
      '\n\n出力は次のJSONだけ: {"found":true|false,"date":"YYYY-MM-DD","kind":"best-before"|"use-by"}（kindは「賞味期限」ならbest-before、「消費期限」ならuse-by）',
    200
  );
  return extractJson<ExpiryResult>(text);
}

/** ② Gemini で読み取り（保険） */
async function viaGemini(image: string, mimeType: string): Promise<ExpiryResult | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ inlineData: { data: image, mimeType } }, { text: PROMPT }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESULT_SCHEMA,
        temperature: 0,
      },
    });
    return JSON.parse(response.text ?? "{}") as ExpiryResult;
  } catch (e) {
    console.error("gemini expiry failed:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { image, mimeType } = (await req.json()) as {
      image: string;
      mimeType: string;
    };

    const parsed =
      (await viaWorkersAI(image, mimeType)) ?? (await viaGemini(image, mimeType));
    if (!parsed) {
      return NextResponse.json(
        { error: "expiry-failed", message: "読み取れなかった。手で入れてね" },
        { status: 502 }
      );
    }
    if (!parsed.found || !parsed.date || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({
      found: true,
      date: parsed.date,
      kind: parsed.kind === "use-by" ? "use-by" : "best-before",
    });
  } catch (e) {
    console.error("expiry scan failed:", e);
    return NextResponse.json(
      { error: "expiry-failed", message: "読み取れなかった。手で入れてね" },
      { status: 502 }
    );
  }
}
