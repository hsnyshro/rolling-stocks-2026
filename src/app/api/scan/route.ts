// 棚の写真 → 品目と個数のJSON（Gemini 3.6 Flash）
// 写真だけを外に送る。判別した数は「仮の値」で、確定は人がやる（企画の確定ルール）
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import stockpileData from "@/data/stockpile.json";
import animalsData from "@/data/animals.json";

export const maxDuration = 60;

// 村のどうぶつ品目だけを判別対象にする（67品目全部を候補にすると誤判別が増えるため）
const targets = animalsData.animals.map((a) => {
  const item = stockpileData.items.find((i) => i.id === a.itemId)!;
  return { id: item.id, name: item.name, unit: item.unit };
});

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    found: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemId: { type: "integer", description: "品目ID（下の一覧のid）" },
          count: { type: "integer", description: "写真の中に見えた個数" },
          confidence: {
            type: "string",
            enum: ["high", "low"],
            description: "自信の度合い",
          },
        },
        required: ["itemId", "count", "confidence"],
      },
    },
  },
  required: ["found"],
} as const;

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // キー未設定でもアプリは壊さない（手動たなおろしに誘導）
    return NextResponse.json(
      { error: "no-api-key", message: "AI判別はまだ準備中。手で数えてね" },
      { status: 503 }
    );
  }

  try {
    const { image, mimeType } = (await req.json()) as {
      image: string; // base64（EXIF等のメタデータはクライアント側で再エンコード時に消えている）
      mimeType: string;
    };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { inlineData: { data: image, mimeType } },
        {
          text: [
            "この写真は家庭の食料備蓄の棚です。",
            "次の品目一覧に当てはまるものが写真の中にいくつ見えるか数えてください。",
            "確実に見えるものだけを数え、写っていない品目は含めないでください。",
            "水はペットボトルの本数ではなくリットル数（2Lボトル1本=2）で数えてください。",
            "",
            "品目一覧:",
            ...targets.map((t) => `- id=${t.id}: ${t.name}（単位: ${t.unit}）`),
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
      found?: { itemId: number; count: number; confidence: string }[];
    };
    // 知らないIDや0以下の数は捨てる（AIの出力は信用しすぎない）
    const validIds = new Set(targets.map((t) => t.id));
    const found = (parsed.found ?? []).filter(
      (f) => validIds.has(f.itemId) && f.count > 0
    );
    return NextResponse.json({ found });
  } catch (e) {
    console.error("scan failed:", e);
    return NextResponse.json(
      { error: "scan-failed", message: "読み取れなかった。もう一度撮るか、手で数えてね" },
      { status: 502 }
    );
  }
}
