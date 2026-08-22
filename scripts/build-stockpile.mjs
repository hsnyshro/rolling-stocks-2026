// 東京備蓄ナビのCSV → src/data/stockpile.json に変換するスクリプト
// 実行: node scripts/build-stockpile.mjs
// 元データ: data/source/stockpile_list.csv
//   出典: 東京備蓄ナビ（東京都） MITライセンス
//   https://github.com/Tokyo-Metro-Gov/bichiku-navi/
//   CSV化: code4fukui/tokyobichikunavi
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/source/stockpile_list.csv";
const OUT = "src/data/stockpile.json";

// ---- CSVを読む（引用符・BOM対応の小さなパーサ）----
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else field += c;
    } else if (c === '"') inQuote = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const text = readFileSync(SRC, "utf8").replace(/^﻿/, "");
const [header, ...lines] = parseCSV(text);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

// 数値列（1人1日あたりの必要量）。空欄は null（=人数比例ではない品目）
const NEED_COLS = [
  "infantsMale", "infantsFemale",
  "child1Male", "child1Female",
  "child2Male", "child2Female",
  "adultMale", "adultFemale",
  "agedMale", "agedFemale",
  "pet",
];

const items = lines.map((cols) => {
  const get = (k) => (cols[idx[k]] ?? "").trim();
  const needs = {};
  for (const k of NEED_COLS) {
    const v = get(k);
    needs[k] = v === "" ? null : Number(v);
  }
  return {
    id: Number(get("id")),
    name: get("item_ja"),
    unit: get("unit_ja"),
    category: get("category_ja"),
    description: get("description_ja"),
    image: get("image"),
    needs, // 1人1日あたりの必要量（東京備蓄ナビの計算表そのまま）
  };
});

writeFileSync(OUT, JSON.stringify({
  source: {
    name: "東京備蓄ナビ 品目データ（東京都）",
    license: "MIT License / Copyright (c) 2021 Tokyo Metropolitan Government and other contributors.",
    url: "https://www.bichiku.metro.tokyo.lg.jp/",
    csv: "https://code4fukui.github.io/tokyobichikunavi/csv/stockpile_list.csv",
    note: "本アプリは東京都の認定・推奨を受けたものではありません",
  },
  items,
}, null, 2));

console.log(`OK: ${items.length}品目 → ${OUT}`);
const cats = {};
for (const it of items) cats[it.category] = (cats[it.category] ?? 0) + 1;
console.log(cats);
