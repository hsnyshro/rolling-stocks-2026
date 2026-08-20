// 音まわりの一元管理: 効果音（Web Audioで合成・音源ファイル不要）。
// ON/OFFはlocalStorageに保存。
// モバイルはユーザー操作の外で音を出せないため、再生関数は必ず
// クリックなどのジェスチャー内から呼ぶこと（AudioContextのresumeもその中で行う）

const SOUND_KEY = "rolling-stocks-sound"; // "off" のときだけ消音（初期値はON）

/** いま音を出してよいか（初期値はON。サーバー側では常にtrue扱い） */
export function soundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** 音のON/OFFを切り替えて保存する */
export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // プライベートモード等で保存できなくても、その場のON/OFFは効かせる
  }
}

// ---- 効果音（Web Audioで合成） ----

let audioCtx: AudioContext | null = null;

/** AudioContextを用意する（ジェスチャー内で呼ばれる前提。停止中ならresume） */
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

type Note = {
  /** 開始周波数(Hz) */
  freq: number;
  /** 終了周波数。省略時はfreqのまま */
  to?: number;
  /** 鳴らし始め（秒。いまから何秒後か） */
  at: number;
  /** 長さ（秒） */
  dur: number;
  type: OscillatorType;
  /** 音量（子ども向けに小さめ・最大0.2程度に抑える） */
  gain: number;
};

/** 短い音を並べて1つの効果音にする */
function play(notes: Note[]) {
  if (!soundEnabled()) return;
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.freq, t0 + n.at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.dur);
    // ぷつっというノイズが出ないよう、音量はなめらかに上げ下げする
    amp.gain.setValueAtTime(0, t0 + n.at);
    amp.gain.linearRampToValueAtTime(n.gain, t0 + n.at + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + n.at + n.dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.dur + 0.05);
  }
}

/** タップ音: ぽんっと明るくはねる */
export function playTap() {
  play([{ freq: 500, to: 950, at: 0, dur: 0.1, type: "sine", gain: 0.15 }]);
}

/** もぐもぐ音: 低めの音を3回（食べている感じ） */
export function playMunch() {
  play([
    { freq: 220, to: 150, at: 0, dur: 0.09, type: "triangle", gain: 0.18 },
    { freq: 220, to: 150, at: 0.22, dur: 0.09, type: "triangle", gain: 0.18 },
    { freq: 220, to: 150, at: 0.44, dur: 0.09, type: "triangle", gain: 0.18 },
  ]);
}

/** 星ゲット音: ドミソド↑のきらきら上昇 */
export function playStar() {
  play([
    { freq: 523.25, at: 0, dur: 0.12, type: "triangle", gain: 0.14 },
    { freq: 659.25, at: 0.09, dur: 0.12, type: "triangle", gain: 0.14 },
    { freq: 783.99, at: 0.18, dur: 0.12, type: "triangle", gain: 0.14 },
    { freq: 1046.5, at: 0.27, dur: 0.25, type: "triangle", gain: 0.14 },
    { freq: 2093, at: 0.3, dur: 0.2, type: "sine", gain: 0.05 },
  ]);
}

/** おかえり音: ピンポン♪とやさしい2音（買い足しの登録完了） */
export function playWelcome() {
  play([
    { freq: 659.25, at: 0, dur: 0.12, type: "sine", gain: 0.14 },
    { freq: 880, at: 0.14, dur: 0.22, type: "sine", gain: 0.14 },
  ]);
}
