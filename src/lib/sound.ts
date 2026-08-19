// 音まわりの一元管理: 効果音（Web Audioで合成・音源ファイル不要）と
// セリフ読み上げ（Web Speech API・ブラウザ内蔵）。ON/OFFはlocalStorageに保存。
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

/** 音のON/OFFを切り替えて保存する。OFFにしたら読み上げも止める */
export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // プライベートモード等で保存できなくても、その場のON/OFFは効かせる
  }
  if (!on && "speechSynthesis" in window) window.speechSynthesis.cancel();
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

// ---- セリフ読み上げ（Web Speech API） ----

/** 動物ごとの声の個性（高さpitch: 0〜2、速さrate: 0.1〜10）。speciesから決める */
const VOICE_PROFILES: Record<string, { pitch: number; rate: number }> = {
  // 既存12匹
  カワウソ: { pitch: 1.3, rate: 1.05 },
  ハムスター: { pitch: 1.8, rate: 1.2 },
  クマ: { pitch: 0.6, rate: 0.9 },
  ネコ: { pitch: 1.4, rate: 1.0 },
  ウサギ: { pitch: 1.5, rate: 1.1 },
  ネズミ: { pitch: 1.9, rate: 1.2 },
  タヌキ: { pitch: 0.9, rate: 0.95 },
  ニワトリ: { pitch: 1.6, rate: 1.1 },
  リス: { pitch: 1.7, rate: 1.15 },
  サル: { pitch: 1.2, rate: 1.1 },
  ペンギン: { pitch: 1.1, rate: 1.0 },
  カメ: { pitch: 0.5, rate: 0.8 }, // かんぶつじい: 低くゆっくり
  // グループ8匹
  キリン: { pitch: 1.0, rate: 0.95 },
  アライグマ: { pitch: 1.3, rate: 1.05 },
  ハリネズミ: { pitch: 1.4, rate: 1.0 },
  ブタ: { pitch: 0.8, rate: 1.0 },
  フクロウ: { pitch: 0.7, rate: 0.9 },
  ビーバー: { pitch: 1.1, rate: 1.05 },
  カンガルー: { pitch: 1.25, rate: 0.95 }, // ぽけっと: やさしいお母さん声
  イヌ: { pitch: 1.0, rate: 1.1 },
};

/** speciesに対応する声の設定。未知の動物はふつうの声 */
export function voiceProfile(species?: string): { pitch: number; rate: number } {
  return (species && VOICE_PROFILES[species]) || { pitch: 1.2, rate: 1.0 };
}

/** セリフを読み上げる。前の読み上げが残っていたら止めてから読む */
export function speak(text: string, species?: string) {
  if (!soundEnabled()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const v = voiceProfile(species);
  u.pitch = v.pitch;
  u.rate = v.rate;
  u.volume = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * 読み上げ中でなければ読む（AIセリフへの差し替え用）。
 * 定型文をまだ読んでいる途中に割り込むと二重読みに聞こえるため、静かな時だけ読む
 */
export function speakIfIdle(text: string, species?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
  speak(text, species);
}
