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
  if (!audioCtx) {
    audioCtx = new AC();
    // iPhoneはブラウザ内で作る音を「環境音」扱いにして消音スイッチ中は鳴らさない。
    // 他のアプリや動画と同じ「再生」扱いにして、消音スイッチに関係なく鳴るようにする
    // （iOS 17以降で有効。消したいときは🔇ボタンで止められる）
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = "playback";
      } catch {
        // 未対応ブラウザでは何もしない
      }
    }
  }
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

// ---- BGM（Suno自作曲「Honeydew Village」をループ再生） ----
// 効果音と同じAudioContextを使う。デコード済みの曲データ・再生中の部品は
// モジュール変数に持つ（ReactのStrictModeでEffectが2回走っても二重再生しないため）

const BGM_URL = "/bgm/honeydew-village.mp3";
const BGM_GAIN = 0.25; // 効果音（0.14〜0.18）より控えめ。実機で聞いて調整する
const BGM_FADE_IN = 1.5; // 秒
const BGM_FADE_OUT = 1.5; // 秒

let bgmBuffer: AudioBuffer | null = null;
let bgmLoading: Promise<AudioBuffer | null> | null = null;
let bgmSource: AudioBufferSourceNode | null = null;
let bgmGain: GainNode | null = null;
let bgmPlaying = false;

/** 曲データを取得してデコードする（1回だけ。結果はキャッシュ） */
function loadBgm(ac: AudioContext): Promise<AudioBuffer | null> {
  if (bgmBuffer) return Promise.resolve(bgmBuffer);
  if (!bgmLoading) {
    bgmLoading = fetch(BGM_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .then((data) => ac.decodeAudioData(data))
      .then((buf) => (bgmBuffer = buf))
      .catch(() => {
        bgmLoading = null; // 失敗したら次回もう一度試せるようにする
        return null;
      });
  }
  return bgmLoading;
}

/** BGMが再生中か */
export function bgmIsPlaying(): boolean {
  return bgmPlaying;
}

/** BGMを始める（すでに再生中・音OFFなら何もしない）。ジェスチャー内から呼ぶこと */
export function startBgm() {
  if (bgmPlaying || !soundEnabled()) return;
  const ac = ctx();
  if (!ac) return;
  bgmPlaying = true;
  loadBgm(ac).then((buf) => {
    // 読み込み中にOFFにされた／読み込み失敗なら始めない
    if (!buf || !bgmPlaying || !soundEnabled()) {
      bgmPlaying = false;
      return;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ac.createGain();
    const t = ac.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(BGM_GAIN, t + BGM_FADE_IN);
    src.connect(g).connect(ac.destination);
    src.start();
    bgmSource = src;
    bgmGain = g;
  });
}

/** BGMをフェードアウトして止める（再生していなければ何もしない） */
export function stopBgm() {
  if (!bgmPlaying) return;
  bgmPlaying = false;
  const src = bgmSource;
  const g = bgmGain;
  bgmSource = null;
  bgmGain = null;
  if (!src || !g || !audioCtx) return;
  const t = audioCtx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.setTargetAtTime(0, t, 0.3); // 0へはexponentialRampが使えないのでこちら
  src.stop(t + BGM_FADE_OUT);
}

/**
 * 画面が隠れた/戻ったときの音量調整（BGMは止めずに音量だけ上げ下げ）。
 * 戻るときはAudioContextが止められていることがあるのでresumeを試す
 */
export function setBgmHidden(hidden: boolean) {
  if (!bgmPlaying || !bgmGain || !audioCtx) return;
  const ac = audioCtx;
  const g = bgmGain;
  if (hidden) {
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.setTargetAtTime(0, t, 0.1);
    return;
  }
  if (!soundEnabled()) return;
  const restore = () => {
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(BGM_GAIN, t + 0.5);
  };
  // resumeが拒否されても（Safariの割り込み中など）次の操作でctx()が再開する
  ac.resume().then(restore, () => {});
}
