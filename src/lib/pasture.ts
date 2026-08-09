// 牧場ビューのなわばり定義と歩行地点（waypoint）の計算
// 座標はすべて「牧場コンテナに対する%」（x: 0=左端〜100=右端, y: 0=上端〜100=下端）

export interface Territory {
  itemId: number;
  /** なわばりの中心 */
  cx: number;
  cy: number;
  /** なわばりの半径（楕円）。動物はこの範囲内だけを歩く */
  rx: number;
  ry: number;
  /** 家（テント/光るおうち/看板）を置く固定位置 */
  homeX: number;
  homeY: number;
}

/**
 * 12匹のなわばり。スマホ375px幅で吹き出しや家が重なりすぎないよう手で調整した値。
 * 並び順は animals.json と同じ（水・主食が上の方＝目につきやすい位置）
 */
export const TERRITORIES: Territory[] = [
  { itemId: 1,  cx: 20, cy: 12, rx: 12, ry: 6, homeX: 30, homeY: 6  }, // みずまる
  { itemId: 2,  cx: 52, cy: 14, rx: 12, ry: 6, homeX: 62, homeY: 8  }, // こめきち
  { itemId: 3,  cx: 83, cy: 12, rx: 11, ry: 6, homeX: 90, homeY: 6  }, // れとるくま
  { itemId: 4,  cx: 16, cy: 34, rx: 11, ry: 7, homeX: 8,  homeY: 28 }, // さばにゃん
  { itemId: 6,  cx: 48, cy: 37, rx: 12, ry: 7, homeX: 40, homeY: 30 }, // べじうさ
  { itemId: 7,  cx: 81, cy: 35, rx: 11, ry: 7, homeX: 90, homeY: 29 }, // ちーずみ
  { itemId: 10, cx: 18, cy: 58, rx: 12, ry: 7, homeX: 10, homeY: 52 }, // めんたぬ
  { itemId: 11, cx: 51, cy: 60, rx: 12, ry: 7, homeX: 60, homeY: 54 }, // おこめっこ
  { itemId: 13, cx: 84, cy: 58, rx: 10, ry: 7, homeX: 92, homeY: 52 }, // おかしりす
  { itemId: 14, cx: 17, cy: 82, rx: 11, ry: 7, homeX: 8,  homeY: 76 }, // ふるもん
  { itemId: 55, cx: 50, cy: 84, rx: 12, ry: 7, homeX: 42, homeY: 78 }, // ふりーずん
  { itemId: 56, cx: 83, cy: 82, rx: 11, ry: 7, homeX: 92, homeY: 76 }, // かんぶつじい
];

export function territoryOf(itemId: number): Territory | undefined {
  return TERRITORIES.find((t) => t.itemId === itemId);
}

/**
 * なわばりの楕円範囲内のランダムな地点を返す。
 * random は 0〜1 を返す関数（テストで固定値を注入できるよう引数にしてある）
 */
export function pickWaypoint(
  t: Territory,
  random: () => number = Math.random
): { x: number; y: number } {
  // 角度と距離をランダムに選ぶ（楕円の内側に一様っぽく散らばる）
  const angle = random() * Math.PI * 2;
  const dist = Math.sqrt(random()); // sqrt で中心偏りをならす
  return {
    x: t.cx + Math.cos(angle) * dist * t.rx,
    y: t.cy + Math.sin(angle) * dist * t.ry,
  };
}
