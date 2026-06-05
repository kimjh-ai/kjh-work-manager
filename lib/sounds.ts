let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* no-op */ }
}

export const sounds = {
  // 메시지 전송 — 아주 짧은 '틱' (50ms, 고음에서 내려옴)
  send() {
    const c = getCtx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(2000, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1000, c.currentTime + 0.05);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
    o.start(); o.stop(c.currentTime + 0.07);
    vibrate(15);
  },

  // 메시지 수신 — '딩~동~' 두 음 (E5 → C5, 넉넉한 간격)
  receive() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime;
    // E5 (659Hz)
    const o1 = c.createOscillator(), g1 = c.createGain();
    o1.connect(g1); g1.connect(c.destination);
    o1.type = "sine"; o1.frequency.value = 659;
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o1.start(t); o1.stop(t + 0.23);
    // C5 (523Hz), 0.18초 후
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.connect(g2); g2.connect(c.destination);
    o2.type = "sine"; o2.frequency.value = 523;
    g2.gain.setValueAtTime(0.25, t + 0.18);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o2.start(t + 0.18); o2.stop(t + 0.46);
    vibrate([50, 40, 80]);
  },

  // 집합 발령 — LFO 사이렌 (주파수가 물결처럼 흔들리는 진짜 경보음)
  gather() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime;

    // LFO (4Hz로 진동) → 메인 오실레이터 주파수에 연결
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const mainOsc = c.createOscillator();
    const mainGain = c.createGain();

    lfo.connect(lfoGain);
    lfoGain.connect(mainOsc.frequency);
    mainOsc.connect(mainGain);
    mainGain.connect(c.destination);

    lfo.type = "sine";
    lfo.frequency.value = 5;      // 초당 5회 떨림
    lfoGain.gain.value = 250;     // ±250Hz 범위로 흔들림 → 550~1050Hz 사이렌

    mainOsc.type = "square";      // 거친 경보 음색
    mainOsc.frequency.value = 800;

    mainGain.gain.setValueAtTime(0.45, t);
    mainGain.gain.setValueAtTime(0.45, t + 1.3);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    lfo.start(t); lfo.stop(t + 1.5);
    mainOsc.start(t); mainOsc.stop(t + 1.5);

    vibrate([200, 80, 200, 80, 350]);
  },

  // 체크인 — 상승하는 두 음 C5→G5 "빠-빵"
  checkin() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime;
    [[523, t], [784, t + 0.13]].forEach(([freq, at]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "triangle"; o.frequency.value = freq as number;
      g.gain.setValueAtTime(0.22, at as number);
      g.gain.exponentialRampToValueAtTime(0.001, (at as number) + 0.15);
      o.start(at as number); o.stop((at as number) + 0.16);
    });
    vibrate([30, 20, 50]);
  },

  // 좋아요 — 반짝이는 고음 3연타
  like() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime;
    [1046, 1318, 1568].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine"; o.frequency.value = freq;
      const at = t + i * 0.07;
      g.gain.setValueAtTime(0.16, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
      o.start(at); o.stop(at + 0.11);
    });
    vibrate(25);
  },

  // 게시판 글 등록 — 팡파레 스타일 (삼화음 상승)
  post() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime;
    [[440, 0], [554, 0.12], [659, 0.24], [880, 0.36]].forEach(([freq, d]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "triangle"; o.frequency.value = freq as number;
      const at = t + (d as number);
      g.gain.setValueAtTime(0.2, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
      o.start(at); o.stop(at + 0.26);
    });
    vibrate(40);
  },

  // 수박게임 — 드롭 (둔탁한 저음)
  drop() {
    const c = getCtx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(200, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.07);
    g.gain.setValueAtTime(0.3, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    o.start(); o.stop(c.currentTime + 0.09);
    vibrate(10);
  },

  // 수박게임 — 합체 (tier마다 음정&길이 증가)
  merge(tier: number) {
    const c = getCtx(); if (!c) return;
    const base = 180 + tier * 100;
    const dur = 0.1 + tier * 0.02;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(base, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(base * 2.0, c.currentTime + dur * 0.35);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, c.currentTime + dur);
    g.gain.setValueAtTime(0.28, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur + 0.05);
    o.start(); o.stop(c.currentTime + dur + 0.06);
    vibrate(6 + tier * 8);
  },

  // 수박게임 — 게임오버 (내려가는 슬픈 3음)
  gameOver() {
    const c = getCtx(); if (!c) return;
    const t = c.currentTime;
    [[392, 0], [330, 0.32], [262, 0.64]].forEach(([freq, d]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sawtooth"; o.frequency.value = freq as number;
      const at = t + (d as number);
      g.gain.setValueAtTime(0.3, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
      o.start(at); o.stop(at + 0.31);
    });
    vibrate([200, 100, 200, 100, 400]);
  },
};
