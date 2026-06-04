let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  vol = 0.18,
  delay = 0,
  freqEnd?: number
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  const t = c.currentTime + delay;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration * 0.8);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* no-op */ }
}

export const sounds = {
  // 메시지 전송 - 짧고 경쾌한 스윕
  send() {
    tone(380, 0.13, "sine", 0.16, 0, 860);
    vibrate(30);
  },

  // 메시지 수신 - 카톡 스타일 더블팝 + 진동
  receive() {
    tone(680, 0.09, "sine", 0.16, 0);
    tone(860, 0.09, "sine", 0.14, 0.1);
    vibrate([40, 30, 60]);
  },

  // 집합 발령 - 긴급 트리플 경보 + 강한 진동
  gather() {
    tone(880, 0.14, "square", 0.28, 0);
    tone(880, 0.14, "square", 0.25, 0.2);
    tone(1100, 0.18, "square", 0.3, 0.4);
    vibrate([100, 80, 100, 80, 200]);
  },

  // 체크인 응답 - 경쾌한 확인음 + 짧은 진동
  checkin() {
    tone(600, 0.07, "sine", 0.16, 0);
    tone(900, 0.10, "sine", 0.14, 0.09);
    vibrate([20, 20, 40]);
  },

  // 좋아요 - 귀여운 팝 + 짧은 진동
  like() {
    tone(900, 0.05, "sine", 0.15, 0);
    tone(1200, 0.08, "sine", 0.12, 0.05);
    vibrate(25);
  },

  // 게시판 글 등록 - 올라가는 3음계
  post() {
    tone(440, 0.08, "sine", 0.15, 0);
    tone(660, 0.10, "sine", 0.13, 0.09);
    tone(880, 0.12, "sine", 0.10, 0.18);
    vibrate(40);
  },

  // 수박게임 - 과일 드롭 (진동만)
  drop() {
    tone(180, 0.06, "sine", 0.10, 0, 120);
    vibrate(15);
  },

  // 수박게임 - 과일 합체 (tier에 따라 음높이 변화 + 진동 세기)
  merge(tier: number) {
    const c = getCtx();
    if (!c) return;
    const freq = 260 + tier * 85;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    const t = c.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.18);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.23);
    vibrate(10 + tier * 8);
  },

  // 수박게임 - 게임오버 + 패턴 진동
  gameOver() {
    tone(300, 0.25, "sawtooth", 0.22, 0, 180);
    tone(200, 0.35, "sawtooth", 0.18, 0.2, 120);
    tone(100, 0.5, "sawtooth", 0.15, 0.45, 80);
    vibrate([200, 100, 200, 100, 400]);
  },
};
