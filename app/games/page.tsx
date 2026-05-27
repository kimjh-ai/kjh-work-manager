"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, X, Shuffle, RotateCcw, ChevronLeft } from "lucide-react";

type GameTab = "suika" | "reaction" | "mole" | "ladder" | "random" | "oddeven" | "ranking";

/* ─────────────────────────────────────────────
   🍉 수박게임 (Canvas Physics)
───────────────────────────────────────────── */
const CW = 300, CH = 460;
const WALL = 7, FLOOR = 7;
const DROP_Y = 52;
const DANGER_Y = 60;
const GRAVITY = 0.42;
const BOUNCE = 0.32;
const FRICTION = 0.987;

const FRUIT_DATA = [
  { r: 13, color: "#e11d48", darkColor: "#9f1239", emoji: "🍒", pts: 1,  label: "체리" },
  { r: 18, color: "#f43f5e", darkColor: "#be123c", emoji: "🍓", pts: 3,  label: "딸기" },
  { r: 24, color: "#a855f7", darkColor: "#7e22ce", emoji: "🍇", pts: 6,  label: "포도" },
  { r: 31, color: "#f97316", darkColor: "#c2410c", emoji: "🍊", pts: 10, label: "귤"  },
  { r: 39, color: "#eab308", darkColor: "#a16207", emoji: "🍋", pts: 15, label: "레몬" },
  { r: 48, color: "#ef4444", darkColor: "#b91c1c", emoji: "🍎", pts: 21, label: "사과" },
  { r: 58, color: "#84cc16", darkColor: "#4d7c0f", emoji: "🍐", pts: 28, label: "배"  },
  { r: 71, color: "#22c55e", darkColor: "#15803d", emoji: "🍉", pts: 36, label: "수박" },
];

interface SBall {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  type: number;
  age: number;
}

function hexLighten(hex: string, amt = 60): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amt);
  const g = Math.min(255, ((n >> 8)  & 0xff) + amt);
  const b = Math.min(255, ( n        & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}
function randFruit() { return Math.floor(Math.random() * 4); }

function SuikaGame({ playerName }: { playerName: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const ballsRef     = useRef<SBall[]>([]);
  const scoreRef     = useRef(0);
  const idRef        = useRef(0);
  const canDropRef   = useRef(true);
  const dropXRef     = useRef(CW / 2);
  const curTypeRef   = useRef(randFruit());
  const nextTypeRef  = useRef(randFruit());
  const animRef      = useRef(0);
  const submittedRef = useRef(false);
  const overRef      = useRef(false);
  const nameRef      = useRef(playerName);
  useEffect(() => { nameRef.current = playerName; }, [playerName]);

  const [score,       setScore]       = useState(0);
  const [best,        setBest]        = useState(0);
  const [over,        setOver]        = useState(false);
  const [newBest,     setNewBest]     = useState(false);
  const [curDisplay,  setCurDisplay]  = useState(() => curTypeRef.current);
  const [nextDisplay, setNextDisplay] = useState(() => nextTypeRef.current);

  /* ── draw ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CW, CH);

    /* 배경 */
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, "#fef9ee"); bg.addColorStop(1, "#fef3c7");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

    /* 위험선 */
    ctx.save();
    ctx.fillStyle = "rgba(239,68,68,0.06)";
    ctx.fillRect(WALL, 0, CW - WALL * 2, DANGER_Y);
    ctx.strokeStyle = "rgba(239,68,68,0.35)";
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(WALL, DANGER_Y); ctx.lineTo(CW - WALL, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();

    /* 벽 & 바닥 (입체감) */
    const drawWall = (x: number, w: number, flip: boolean) => {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(flip ? 0 : 0, flip ? "#d97706" : "#92400e");
      g.addColorStop(flip ? 1 : 1, flip ? "#92400e" : "#d97706");
      ctx.fillStyle = g; ctx.fillRect(x, 0, w, CH);
    };
    drawWall(0, WALL, false);
    drawWall(CW - WALL, WALL, true);
    /* 바닥 — 3D 느낌 */
    const fg = ctx.createLinearGradient(0, CH - FLOOR, 0, CH);
    fg.addColorStop(0, "#d97706"); fg.addColorStop(1, "#92400e");
    ctx.fillStyle = fg; ctx.fillRect(0, CH - FLOOR, CW, FLOOR);

    /* 드롭 가이드 */
    if (canDropRef.current && !overRef.current) {
      const fd = FRUIT_DATA[curTypeRef.current];
      const gx = Math.max(WALL + fd.r, Math.min(CW - WALL - fd.r, dropXRef.current));
      /* 세로 점선 */
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, DROP_Y + fd.r); ctx.lineTo(gx, CH - FLOOR); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      /* 고스트 과일 */
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(gx, DROP_Y, fd.r, 0, Math.PI * 2);
      const hg = ctx.createRadialGradient(gx - fd.r * 0.3, DROP_Y - fd.r * 0.3, fd.r * 0.1, gx, DROP_Y, fd.r);
      hg.addColorStop(0, hexLighten(fd.color)); hg.addColorStop(1, fd.color);
      ctx.fillStyle = hg; ctx.fill();
      ctx.font = `${fd.r * 1.35}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(fd.emoji, gx, DROP_Y);
      ctx.globalAlpha = 1;
    }

    /* 볼 */
    for (const b of ballsRef.current) {
      const fd = FRUIT_DATA[b.type];
      /* 그라디언트 원 */
      const gr = ctx.createRadialGradient(
        b.x - fd.r * 0.3, b.y - fd.r * 0.35, fd.r * 0.05,
        b.x, b.y, fd.r
      );
      gr.addColorStop(0, hexLighten(fd.color, 80));
      gr.addColorStop(0.6, fd.color);
      gr.addColorStop(1, fd.darkColor);
      ctx.beginPath(); ctx.arc(b.x, b.y, fd.r, 0, Math.PI * 2);
      ctx.fillStyle = gr; ctx.fill();
      /* 테두리 */
      ctx.strokeStyle = fd.darkColor + "55"; ctx.lineWidth = 1.5; ctx.stroke();
      /* 광택 하이라이트 */
      const hl = ctx.createRadialGradient(
        b.x - fd.r * 0.3, b.y - fd.r * 0.4, 0,
        b.x - fd.r * 0.2, b.y - fd.r * 0.3, fd.r * 0.5
      );
      hl.addColorStop(0, "rgba(255,255,255,0.55)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(b.x, b.y, fd.r, 0, Math.PI * 2);
      ctx.fillStyle = hl; ctx.fill();
      /* 이모지 — fillStyle 반드시 불투명 색으로 리셋 후 렌더링 */
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.font = `${fd.r * 1.3}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(fd.emoji, b.x, b.y + 1);
    }
  }, []);

  /* ── tick (physics loop) ── */
  const tick = useCallback(() => {
    if (overRef.current) return;
    const balls = ballsRef.current;

    /* 물리 */
    for (const b of balls) {
      b.vy += GRAVITY; b.vx *= FRICTION;
      b.x += b.vx; b.y += b.vy; b.age++;
      const r = FRUIT_DATA[b.type].r;
      if (b.x - r < WALL)       { b.x = WALL + r;       b.vx =  Math.abs(b.vx) * BOUNCE; }
      if (b.x + r > CW - WALL)  { b.x = CW - WALL - r;  b.vx = -Math.abs(b.vx) * BOUNCE; }
      if (b.y + r > CH - FLOOR) { b.y = CH - FLOOR - r; b.vy = -Math.abs(b.vy) * BOUNCE; }
    }

    /* 합체 감지 (충돌 해결 전 — 자연 겹침 기준) */
    const merged = new Set<number>();
    let scoreDelta = 0;
    const toAdd: SBall[] = [];
    for (let i = 0; i < balls.length; i++) {
      if (merged.has(balls[i].id)) continue;
      for (let j = i + 1; j < balls.length; j++) {
        if (merged.has(balls[j].id)) continue;
        if (balls[i].type !== balls[j].type) continue;
        if (balls[i].type >= FRUIT_DATA.length - 1) continue;
        if (balls[i].age < 4 && balls[j].age < 4) continue;
        const dx = balls[j].x - balls[i].x, dy = balls[j].y - balls[i].y;
        const minD = FRUIT_DATA[balls[i].type].r * 2;
        if (dx * dx + dy * dy < minD * minD) {
          merged.add(balls[i].id); merged.add(balls[j].id);
          const nt = balls[i].type + 1;
          toAdd.push({
            id: idRef.current++,
            x: (balls[i].x + balls[j].x) / 2,
            y: (balls[i].y + balls[j].y) / 2,
            vx: 0, vy: -2.8, type: nt, age: 0,
          });
          scoreDelta += FRUIT_DATA[nt].pts;
          break;
        }
      }
    }
    if (merged.size > 0) {
      ballsRef.current = balls.filter(b => !merged.has(b.id)).concat(toAdd);
      scoreRef.current += scoreDelta;
      setScore(scoreRef.current);
      setBest(prev => Math.max(prev, scoreRef.current));
    }

    /* 원-원 충돌 해결 */
    const ab = ballsRef.current;
    for (let i = 0; i < ab.length; i++) {
      for (let j = i + 1; j < ab.length; j++) {
        const a = ab[i], b = ab[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy;
        const minD = FRUIT_DATA[a.type].r + FRUIT_DATA[b.type].r;
        if (dist2 < minD * minD && dist2 > 0.0001) {
          const dist = Math.sqrt(dist2);
          const nx = dx / dist, ny = dy / dist;
          const push = (minD - dist) * 0.5;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const relVn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (relVn > 0) {
            const imp = relVn * 0.52;
            a.vx -= imp * nx; a.vy -= imp * ny;
            b.vx += imp * nx; b.vy += imp * ny;
          }
        }
      }
    }

    /* 게임 오버 */
    if (ballsRef.current.some(b => b.age > 80 && b.y - FRUIT_DATA[b.type].r < DANGER_Y)) {
      overRef.current = true;
      setOver(true);
      if (!submittedRef.current && nameRef.current && scoreRef.current > 0) {
        submittedRef.current = true;
        fetch("/api/game-rank", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game: "suika", name: nameRef.current, score: scoreRef.current }),
        }).then(r => r.json()).then(d => { if (d.newBest) setNewBest(true); }).catch(() => {});
      }
      draw(); return;
    }

    draw();
    animRef.current = requestAnimationFrame(tick);
  }, [draw]);

  /* ── drop ── */
  const dropBall = useCallback((x: number) => {
    if (!canDropRef.current || overRef.current) return;
    const type = curTypeRef.current;
    const r = FRUIT_DATA[type].r;
    ballsRef.current.push({
      id: idRef.current++,
      x: Math.max(WALL + r, Math.min(CW - WALL - r, x)),
      y: DROP_Y, vx: 0, vy: 1.5, type, age: 0,
    });
    curTypeRef.current = nextTypeRef.current;
    nextTypeRef.current = randFruit();
    setCurDisplay(curTypeRef.current);
    setNextDisplay(nextTypeRef.current);
    canDropRef.current = false;
    setTimeout(() => { canDropRef.current = true; }, 680);
  }, []);

  /* ── restart ── */
  const restart = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    ballsRef.current = []; scoreRef.current = 0; idRef.current = 0;
    canDropRef.current = true; overRef.current = false; submittedRef.current = false;
    curTypeRef.current = randFruit(); nextTypeRef.current = randFruit();
    setScore(0); setBest(b => b); setOver(false); setNewBest(false);
    setCurDisplay(curTypeRef.current); setNextDisplay(nextTypeRef.current);
    animRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [tick]);

  /* ── 포인터 이벤트 ── */
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    dropXRef.current = (e.clientX - rect.left) * (CW / rect.width);
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CW / rect.width);
    dropXRef.current = x;
    dropBall(x);
  };

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="bg-gray-100 rounded-xl px-3 py-2 text-center min-w-[70px]">
          <p className="text-[11px] text-gray-400 font-semibold">점수</p>
          <p className="text-xl font-black">{score}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">현재</p>
            <span className="text-[38px] leading-none">{FRUIT_DATA[curDisplay].emoji}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">{FRUIT_DATA[curDisplay].label}</p>
          </div>
          <div className="text-gray-200 text-lg">→</div>
          <div className="text-center opacity-60">
            <p className="text-[10px] text-gray-400 mb-0.5">다음</p>
            <span className="text-[28px] leading-none">{FRUIT_DATA[nextDisplay].emoji}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">{FRUIT_DATA[nextDisplay].label}</p>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl px-3 py-2 text-center min-w-[70px]">
          <p className="text-[11px] text-yellow-500 font-semibold">최고</p>
          <p className="text-xl font-black text-yellow-600">{best}</p>
        </div>
      </div>

      {over && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-center">
          <p className="text-lg font-black">😭 게임 오버!</p>
          <p className="text-sm text-gray-500 mt-0.5">최종 점수: {score}점</p>
          {newBest && <p className="text-sm font-bold text-yellow-500 mt-1">🏆 신기록!</p>}
          <button type="button" onClick={restart}
            className="mt-2 px-5 py-1.5 bg-red-500 text-white rounded-xl text-sm font-bold">다시하기</button>
        </div>
      )}

      <canvas
        ref={canvasRef} width={CW} height={CH}
        className="w-full rounded-2xl touch-none cursor-crosshair border border-amber-200 shadow-sm"
        onPointerMove={onMove}
        onPointerDown={onDown}
      />

      {/* 과일 진화표 */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {FRUIT_DATA.map((f, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className="text-[16px]" title={f.label}>{f.emoji}</span>
            {i < FRUIT_DATA.length - 1 && <span className="text-[10px] text-gray-300">→</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400">탭해서 과일 떨어뜨리기. 같은 과일 만나면 합체!</p>
        {!over && (
          <button type="button" onClick={restart}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 bg-gray-100 rounded-xl px-2.5 py-1.5">
            <RotateCcw size={11}/> 초기화
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ⚡ 반응속도
───────────────────────────────────────────── */
function ReactionGame({ playerName }: { playerName: string }) {
  type Phase = "idle" | "waiting" | "go" | "result";
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  const start = () => {
    setPhase("waiting"); setMs(null); setTooEarly(false); setNewBest(false);
    timerRef.current = setTimeout(() => { setPhase("go"); startRef.current = Date.now(); }, 1500 + Math.random() * 3000);
  };
  const tap = () => {
    if (phase === "idle" || phase === "result") { start(); return; }
    if (phase === "waiting") { clearTimeout(timerRef.current!); setTooEarly(true); setPhase("idle"); return; }
    if (phase === "go") {
      const elapsed = Date.now() - startRef.current;
      setMs(elapsed); setPhase("result");
      if (playerName) {
        fetch("/api/game-rank", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game: "reaction", name: playerName, score: elapsed }) })
          .then(r => r.json()).then(d => { if (d.newBest) setNewBest(true); }).catch(() => {});
      }
    }
  };
  useEffect(() => () => clearTimeout(timerRef.current!), []);
  const rating = ms === null ? "" : ms < 200 ? "번개급! ⚡" : ms < 300 ? "빠름 🔥" : ms < 400 ? "보통 😊" : "느림 🐢";

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 text-center">초록색으로 바뀌면 최대한 빨리 탭!</p>
      <button type="button" onClick={tap}
        className={`w-full h-52 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors select-none ${
          phase === "go" ? "bg-green-500" : phase === "waiting" ? "bg-red-400" : "bg-gray-100"
        }`}>
        {phase === "idle"    && <><p className="text-5xl">👆</p><p className="text-gray-600 font-bold text-lg">탭해서 시작!</p></>}
        {phase === "waiting" && <><p className="text-5xl">🔴</p><p className="text-white font-bold text-lg">기다리세요...</p></>}
        {phase === "go"      && <p className="text-white font-black text-5xl">지금!</p>}
        {phase === "result" && ms !== null && (
          <>
            <p className="text-5xl font-black text-gray-800">{ms}<span className="text-2xl">ms</span></p>
            <p className="text-xl font-bold text-gray-600">{rating}</p>
            {newBest && <p className="text-sm font-bold text-yellow-500">🏆 신기록!</p>}
            <p className="text-sm text-gray-400 mt-1">탭해서 다시하기</p>
          </>
        )}
      </button>
      {tooEarly && <p className="text-red-500 font-semibold text-center">너무 빨리 눌렀어요! 😅</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   🦔 두더지 잡기
───────────────────────────────────────────── */
function WhackAMole({ playerName }: { playerName: string }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [moleIdx, setMoleIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  const showMole = (s: number) => {
    setMoleIdx(Math.floor(Math.random() * 9));
    moleRef.current = setTimeout(() => { setMoleIdx(null); showMole(s); }, Math.max(350, 850 - s * 15));
  };
  const start = () => {
    scoreRef.current = 0; setScore(0); setTimeLeft(30); setPlaying(true); setNewBest(false);
    showMole(0);
    gameRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(gameRef.current!); clearTimeout(moleRef.current!);
          setPlaying(false); setMoleIdx(null);
          setBest(b => Math.max(b, scoreRef.current));
          if (playerName && scoreRef.current > 0) {
            fetch("/api/game-rank", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ game: "mole", name: playerName, score: scoreRef.current }) })
              .then(r => r.json()).then(d => { if (d.newBest) setNewBest(true); }).catch(() => {});
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };
  const whack = (i: number) => {
    if (!playing || i !== moleIdx) return;
    clearTimeout(moleRef.current!);
    scoreRef.current += 1; setScore(s => s + 1);
    setMoleIdx(null); showMole(scoreRef.current);
  };
  useEffect(() => () => { clearTimeout(moleRef.current!); clearInterval(gameRef.current!); }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-around items-center">
        <div className="text-center"><p className="text-3xl font-black text-gray-800">{score}</p><p className="text-xs text-gray-400">점수</p></div>
        <div className="text-center"><p className={`text-3xl font-black ${timeLeft <= 10 ? "text-red-500" : "text-gray-800"}`}>{timeLeft}s</p><p className="text-xs text-gray-400">남은 시간</p></div>
        <div className="text-center"><p className="text-3xl font-black text-yellow-500">{best}</p><p className="text-xs text-gray-400">최고</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <button key={i} type="button" onClick={() => whack(i)}
            className={`aspect-square rounded-2xl text-4xl flex items-center justify-center transition-all select-none ${
              moleIdx === i ? "bg-green-100 scale-90 shadow-inner" : "bg-gray-100"
            }`}>
            {moleIdx === i ? "🦔" : ""}
          </button>
        ))}
      </div>
      {!playing && timeLeft === 0 && newBest && (
        <p className="text-yellow-500 font-bold text-center text-sm">🏆 신기록!</p>
      )}
      {!playing && (
        <button type="button" onClick={start}
          className="w-full bg-green-500 text-white rounded-2xl py-3 text-lg font-bold">
          {timeLeft === 30 ? "🦔 시작!" : `다시하기! (최고: ${best}점)`}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   🏆 랭킹
───────────────────────────────────────────── */
function RankingBoard() {
  type RankGame = "reaction" | "mole" | "suika";
  const [tab, setTab] = useState<RankGame>("suika");
  const [ranks, setRanks] = useState<{ name: string; score: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/game-rank?game=${tab}`)
      .then(r => r.json())
      .then(d => { setRanks(d.ranks ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const GAME_INFO: Record<RankGame, { label: string; unit: string; emoji: string }> = {
    suika:    { label: "수박게임", unit: "점", emoji: "🍉" },
    mole:     { label: "두더지",  unit: "점", emoji: "🦔" },
    reaction: { label: "반응속도", unit: "ms", emoji: "⚡" },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["suika", "mole", "reaction"] as RankGame[]).map(g => (
          <button key={g} type="button" onClick={() => setTab(g)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === g ? "bg-yellow-400 text-white" : "bg-gray-100 text-gray-500"
            }`}>
            {GAME_INFO[g].emoji} {GAME_INFO[g].label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : ranks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-2">🎮</p>
          <p className="text-sm text-gray-400">아직 기록이 없어요<br/><span className="text-xs">게임을 플레이하면 순위가 등록돼요!</span></p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranks.map(({ name, score }, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            return (
              <div key={name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-lg w-6 text-center flex-shrink-0">{medal}</span>
                <p className="flex-1 text-sm font-semibold text-gray-800">{name}</p>
                <p className="text-sm font-bold text-blue-600">{score.toLocaleString()}{GAME_INFO[tab].unit}</p>
              </div>
            );
          })}
          {tab === "reaction" && <p className="text-xs text-gray-400 text-center pt-1">낮을수록 빠름 ⚡</p>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   🪜 사다리 게임
───────────────────────────────────────────── */
function generateRungs(cols: number, rows: number): boolean[][] {
  const rungs: boolean[][] = Array.from({ length: rows }, () => Array(cols - 1).fill(false));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols - 1; c++)
      if (!rungs[r][c] && (c === 0 || !rungs[r][c - 1]))
        rungs[r][c] = Math.random() < 0.45;
  return rungs;
}
function tracePath(start: number, rungs: boolean[][]): number {
  let col = start;
  for (const row of rungs) {
    if (col > 0 && row[col - 1]) col--;
    else if (col < row.length && row[col]) col++;
  }
  return col;
}
function LadderGame() {
  const [players, setPlayers] = useState(["", "", ""]);
  const [prizes, setPrizes] = useState(["", "", ""]);
  const [rungs, setRungs] = useState<boolean[][] | null>(null);
  const [results, setResults] = useState<number[] | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const ROWS = 10, count = players.length;
  const W = 280, H = 320;
  const colX = (i: number) => (W / (count + 1)) * (i + 1);
  const rowY = (r: number) => 20 + (H / (ROWS + 1)) * (r + 1);

  const start = () => { const r = generateRungs(count, ROWS); setRungs(r); setResults(players.map((_, i) => tracePath(i, r))); setRevealed(new Set()); };
  const reset = () => { setRungs(null); setResults(null); setRevealed(new Set()); };
  const addSlot = () => { if (players.length >= 8) return; setPlayers([...players, ""]); setPrizes([...prizes, ""]); };
  const removeSlot = (i: number) => { setPlayers(players.filter((_, j) => j !== i)); setPrizes(prizes.filter((_, j) => j !== i)); };

  return !rungs ? (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500 px-1"><span>참가자</span><span>결과</span></div>
      {players.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={p} onChange={(e) => { const a=[...players];a[i]=e.target.value;setPlayers(a); }} placeholder={`참가자 ${i+1}`} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          <input value={prizes[i]} onChange={(e) => { const a=[...prizes];a[i]=e.target.value;setPrizes(a); }} placeholder={`결과 ${i+1}`} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
          {players.length > 2 && <button type="button" onClick={() => removeSlot(i)} aria-label="삭제" className="text-gray-300 hover:text-red-400"><X size={16}/></button>}
        </div>
      ))}
      <div className="flex gap-2">
        {players.length < 8 && <button type="button" onClick={addSlot} className="flex items-center gap-1 text-xs text-purple-600 border border-purple-200 rounded-xl px-3 py-2"><Plus size={13}/>추가</button>}
        <button type="button" onClick={start} disabled={players.some(p=>!p.trim())||prizes.some(p=>!p.trim())} className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40">🪜 사다리 시작!</button>
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg width={W} height={H+80} className="overflow-visible">
          {players.map((p,i) => <text key={i} x={colX(i)} y={14} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#6d28d9">{p||`P${i+1}`}</text>)}
          {players.map((_,i) => <line key={i} x1={colX(i)} y1={20} x2={colX(i)} y2={rowY(ROWS)} stroke="#c4b5fd" strokeWidth={2}/>)}
          {rungs.map((row,r) => row.map((has,c) => has ? <line key={`${r}-${c}`} x1={colX(c)} y1={rowY(r)} x2={colX(c+1)} y2={rowY(r)} stroke="#7c3aed" strokeWidth={2}/> : null))}
          {results && players.map((_,i) => {
            const prize = prizes[results.indexOf(i)] ?? "";
            return (
              <g key={i} onClick={() => setRevealed(prev=>new Set([...prev,i]))} className="cursor-pointer">
                <rect x={colX(i)-28} y={rowY(ROWS)+8} width={56} height={24} rx={6} fill={revealed.has(i)?"#7c3aed":"#e5e7eb"}/>
                <text x={colX(i)} y={rowY(ROWS)+24} textAnchor="middle" fontSize={10} fontWeight="bold" fill={revealed.has(i)?"white":"#9ca3af"}>{revealed.has(i)?prize:"?"}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {!revealed.size && <p className="text-center text-xs text-gray-400">결과 박스를 탭해서 확인하세요!</p>}
      {revealed.size===players.length && (
        <div className="bg-purple-50 rounded-xl p-3 space-y-1">
          {players.map((p,i) => <div key={i} className="flex items-center justify-between text-sm"><span className="font-semibold text-purple-700">{p}</span><span className="text-gray-700">{prizes[results![i]]}</span></div>)}
        </div>
      )}
      <button type="button" onClick={reset} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium"><RotateCcw size={14}/>다시하기</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   🎯 랜덤 뽑기
───────────────────────────────────────────── */
function RandomPicker() {
  const [items, setItems] = useState(["","",""]);
  const [result, setResult] = useState<string|null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const validItems = items.filter(s=>s.trim());

  const pick = () => {
    if (validItems.length<2||spinning) return;
    setSpinning(true); setResult(null);
    let count=0;
    intervalRef.current = setInterval(()=>{
      setDisplayText(validItems[Math.floor(Math.random()*validItems.length)]);
      if(++count>=20){
        clearInterval(intervalRef.current!);
        const chosen=validItems[Math.floor(Math.random()*validItems.length)];
        setResult(chosen); setDisplayText(chosen); setSpinning(false);
      }
    },80);
  };

  return (
    <div className="space-y-3">
      {items.map((v,i)=>(
        <div key={i} className="flex items-center gap-2">
          <input value={v} onChange={(e)=>{const a=[...items];a[i]=e.target.value;setItems(a);}} placeholder={`항목 ${i+1}`} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          {items.length>2 && <button type="button" onClick={()=>setItems(items.filter((_,j)=>j!==i))} aria-label="삭제" className="text-gray-300 hover:text-red-400"><X size={16}/></button>}
        </div>
      ))}
      <div className="flex gap-2">
        {items.length<10 && <button type="button" onClick={()=>setItems([...items,""])} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-xl px-3 py-2"><Plus size={13}/>추가</button>}
        <button type="button" onClick={pick} disabled={validItems.length<2||spinning} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"><Shuffle size={15}/>{spinning?"뽑는 중...":"뽑기!"}</button>
      </div>
      {(spinning||result) && <div className={`rounded-2xl p-6 text-center ${result?"bg-blue-600":"bg-blue-100"}`}><p className={`text-2xl font-bold ${result?"text-white":"text-blue-400"}`}>{displayText||"..."}</p>{result&&<p className="text-blue-200 text-xs mt-1">당첨!</p>}</div>}
      {result && <button type="button" onClick={()=>{setResult(null);setDisplayText("");}} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm"><RotateCcw size={14}/>다시뽑기</button>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   🎲 홀짝
───────────────────────────────────────────── */
function OddEvenGame() {
  const [pick, setPick] = useState<"홀"|"짝"|null>(null);
  const [result, setResult] = useState<{num:number;correct:boolean}|null>(null);
  const [spinning, setSpinning] = useState(false);

  const play = (choice:"홀"|"짝") => {
    if(spinning) return;
    setPick(choice); setResult(null); setSpinning(true);
    setTimeout(()=>{
      const num=Math.floor(Math.random()*20)+1;
      const correct=(choice==="홀"&&num%2===1)||(choice==="짝"&&num%2===0);
      setResult({num,correct}); setSpinning(false);
    },800);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">홀수 or 짝수? 맞히면 이긴다!</p>
      <div className="grid grid-cols-2 gap-3">
        {(["홀","짝"] as const).map(c=>(
          <button key={c} type="button" onClick={()=>play(c)} disabled={spinning}
            className={`py-6 rounded-2xl text-xl font-bold transition-all disabled:opacity-50 ${pick===c&&result?(result.correct?"bg-green-500 text-white":"bg-red-400 text-white"):"bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {c} {c==="홀"?"(1,3,5…)":"(2,4,6…)"}
          </button>
        ))}
      </div>
      {spinning && <div className="text-center py-4"><div className="text-4xl animate-bounce">🎲</div></div>}
      {result && (
        <>
          <div className={`rounded-2xl p-5 text-center ${result.correct?"bg-green-50 border-2 border-green-300":"bg-red-50 border-2 border-red-300"}`}>
            <p className="text-4xl font-black text-gray-800 mb-1">{result.num}</p>
            <p className="text-sm text-gray-500">{result.num%2===1?"홀수":"짝수"}</p>
            <p className={`text-lg font-bold mt-2 ${result.correct?"text-green-600":"text-red-500"}`}>{result.correct?"🎉 정답! 이겼어!":"😭 틀렸어! 졌어!"}</p>
          </div>
          <button type="button" onClick={()=>{setResult(null);setPick(null);}} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm"><RotateCcw size={14}/>다시하기</button>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   메인
───────────────────────────────────────────── */
const GAMES: { key: GameTab; emoji: string; label: string; desc: string; color: string }[] = [
  { key: "suika",    emoji: "🍉", label: "수박게임",  desc: "과일 합쳐서 수박 만들기",  color: "from-green-400 to-emerald-500" },
  { key: "reaction", emoji: "⚡", label: "반응속도",  desc: "빠를수록 최고!",           color: "from-yellow-400 to-orange-400" },
  { key: "mole",     emoji: "🦔", label: "두더지잡기", desc: "30초 동안 최대한 잡아라",  color: "from-lime-400 to-green-500" },
  { key: "ladder",   emoji: "🪜", label: "사다리",    desc: "운명을 사다리에 맡겨봐",   color: "from-purple-400 to-violet-500" },
  { key: "random",   emoji: "🎯", label: "랜덤뽑기",  desc: "공정한 당번 결정 도우미",  color: "from-blue-400 to-indigo-500" },
  { key: "oddeven",  emoji: "🎲", label: "홀짝",      desc: "홀? 짝? 찍어봐!",         color: "from-pink-400 to-rose-500" },
];

export default function GamesPage() {
  const { user } = useUser();
  const [selected, setSelected] = useState<GameTab | null>(null);
  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";

  if (selected !== null) {
    const game = [...GAMES, { key: "ranking" as GameTab, emoji: "🏆", label: "랭킹", desc: "", color: "" }].find(g => g.key === selected)!;
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => setSelected(null)}
            aria-label="게임 목록으로" title="게임 목록으로"
            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 active:bg-gray-200">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{game.emoji} {game.label}</h1>
        </div>
        <div className="card">
          {selected === "suika"    && <SuikaGame playerName={myName} />}
          {selected === "reaction" && <ReactionGame playerName={myName} />}
          {selected === "mole"     && <WhackAMole playerName={myName} />}
          {selected === "ladder"   && <LadderGame />}
          {selected === "random"   && <RandomPicker />}
          {selected === "oddeven"  && <OddEvenGame />}
          {selected === "ranking"  && <RankingBoard />}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">내기는 적당히 😄</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-5">🎮 게임</h1>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {GAMES.map(({ key, emoji, label, desc, color }) => (
          <button key={key} type="button" onClick={() => setSelected(key)}
            className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.97] transition-transform">
            <div className={`bg-gradient-to-br ${color} p-5 flex items-center justify-center`}>
              <span className="text-5xl">{emoji}</span>
            </div>
            <div className="px-3 py-2.5 text-left">
              <p className="text-[14px] font-bold text-gray-900">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      <button type="button" onClick={() => setSelected("ranking")}
        className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 flex items-center gap-4 active:opacity-90 transition-opacity shadow-sm">
        <span className="text-5xl">🏆</span>
        <div className="text-left">
          <p className="text-[16px] font-bold text-white">랭킹</p>
          <p className="text-[12px] text-yellow-100 mt-0.5">수박게임·두더지·반응속도 명예의 전당</p>
        </div>
      </button>
    </div>
  );
}
