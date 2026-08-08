// 商品のアップ写真 → 期限の日付を読み取る（Gemini 3.6 Flash）
// 読み取った日付は「確認済み」への昇格に使う。読めなければ手動入力に誘導
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

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

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "no-api-key", message: "写真での読み取りは準備中。手で入れてね" },
      { status: 503 }
    );
  }

  try {
    const { image, mimeType } = (await req.json()) as {
      image: string;
      mimeType: string;
    };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { inlineData: { data: image, mimeType } },
        {
          text: [
            "この写真は食品パッケージのアップです。",
            "賞味期限または消費期限の日付を探して読み取ってください。",
            "「27.04.15」のような表記は 2027-04-15 と解釈します（年.月.日の順）。",
            "日が書かれていない場合（例: 2027.04）はその月の末日にしてください。",
            "はっきり読み取れない場合は found=false にしてください（推測しない）。",
          ].join("\n"),
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESULT_SCHEMA,
        temperature: 0,
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as {
      found?: boolean;
      date?: string;
      kind?: string;
    };
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
