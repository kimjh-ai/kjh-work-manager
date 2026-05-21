"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, X, Shuffle, RotateCcw } from "lucide-react";

type GameTab = "suika" | "reaction" | "mole" | "ladder" | "random" | "oddeven" | "ranking";

/* ─────────────────────────────────────────────
   🍉 과일 합치기 (수박게임 스타일)
───────────────────────────────────────────── */
const SCOLS = 6, SROWS = 8;
const FRUITS = ["🍒", "🍓", "🍋", "🍊", "🍎", "🍑", "🍇", "🍉"];
const FRUIT_PTS = [1, 3, 6, 10, 15, 21, 28, 36];
type Cell = number | null;

function suikaEmpty(): Cell[][] {
  return Array.from({ length: SROWS }, () => Array(SCOLS).fill(null));
}
function suikaGravity(grid: Cell[][]): Cell[][] {
  const g = grid.map(r => [...r]);
  for (let c = 0; c < SCOLS; c++) {
    const fruits: number[] = [];
    for (let r = 0; r < SROWS; r++) { if (g[r][c] !== null) fruits.push(g[r][c] as number); g[r][c] = null; }
    for (let i = 0; i < fruits.length; i++) g[SROWS - fruits.length + i][c] = fruits[i];
  }
  return g;
}
function suikaConnected(grid: Cell[][], sr: number, sc: number): [number, number][] {
  const type = grid[sr][sc];
  if (type === null) return [];
  const seen = new Set<string>();
  const cells: [number, number][] = [];
  const q: [number, number][] = [[sr, sc]];
  seen.add(`${sr},${sc}`);
  while (q.length) {
    const [r, c] = q.shift()!;
    cells.push([r, c]);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r+dr, nc = c+dc, k = `${nr},${nc}`;
      if (nr >= 0 && nr < SROWS && nc >= 0 && nc < SCOLS && !seen.has(k) && grid[nr][nc] === type) { seen.add(k); q.push([nr, nc]); }
    }
  }
  return cells;
}
function suikaMerges(grid: Cell[][]): [Cell[][], number] {
  let g = grid, total = 0;
  for (let iter = 0; iter < SCOLS * SROWS; iter++) {
    let merged = false;
    outer: for (let r = SROWS - 1; r >= 0; r--) {
      for (let c = 0; c < SCOLS; c++) {
        if (g[r][c] === null || (g[r][c] as number) >= FRUITS.length - 1) continue;
        const type = g[r][c] as number;
        const cells = suikaConnected(g, r, c);
        if (cells.length >= 2) {
          const keep = cells.reduce((a, b) => b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a);
          const ng = g.map(row => [...row]);
          for (const [mr, mc] of cells) ng[mr][mc] = null;
          ng[keep[0]][keep[1]] = type + 1;
          total += FRUIT_PTS[type + 1] * cells.length;
          g = suikaGravity(ng);
          merged = true; break outer;
        }
      }
    }
    if (!merged) break;
  }
  return [g, total];
}

function SuikaGame({ playerName }: { playerName: string }) {
  const [grid, setGrid] = useState<Cell[][]>(suikaEmpty);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [next, setNext] = useState(() => Math.floor(Math.random() * 4));
  const [over, setOver] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const scoreRef = useRef(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (over && !submittedRef.current && playerName && scoreRef.current > 0) {
      submittedRef.current = true;
      fetch("/api/game-rank", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "suika", name: playerName, score: scoreRef.current }) })
        .then(r => r.json()).then(d => { if (d.newBest) setNewBest(true); }).catch(() => {});
    }
  }, [over, playerName]);

  const drop = (col: number) => {
    if (over || grid[0][col] !== null) return;
    const nextFruit = next;
    setNext(Math.floor(Math.random() * 4));
    setGrid(g => {
      const ng = g.map(r => [...r]);
      for (let r = SROWS - 1; r >= 0; r--) { if (ng[r][col] === null) { ng[r][col] = nextFruit; break; } }
      const [merged, pts] = suikaMerges(ng);
      if (pts > 0) {
        setScore(s => { const ns = s + pts; scoreRef.current = ns; setBest(b => Math.max(b, ns)); return ns; });
      }
      if (merged[0].every(cell => cell !== null)) setOver(true);
      return merged;
    });
  };

  const restart = () => {
    setGrid(suikaEmpty()); setScore(0); setOver(false); setNewBest(false);
    setNext(Math.floor(Math.random() * 4)); scoreRef.current = 0; submittedRef.current = false;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="bg-gray-100 rounded-xl px-3 py-2 text-center min-w-[70px]">
          <p className="text-[11px] text-gray-400 font-semibold">점수</p>
          <p className="text-xl font-black">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-gray-400 mb-0.5">다음</p>
          <span className="text-4xl leading-none">{FRUITS[next]}</span>
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
          <button type="button" onClick={restart} className="mt-2 px-5 py-1.5 bg-red-500 text-white rounded-xl text-sm font-bold">다시하기</button>
        </div>
      )}

      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-2">
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: SCOLS }).map((_, c) => (
            <button key={c} type="button" onClick={() => drop(c)}
              disabled={over || grid[0][c] !== null}
              className="flex flex-col gap-0.5 rounded-xl transition-colors active:bg-amber-300/40 disabled:opacity-50 select-none touch-none">
              {Array.from({ length: SROWS }).map((_, r) => (
                <div key={r} className={`aspect-square rounded-md flex items-center justify-center text-lg ${
                  grid[r][c] !== null ? "bg-white shadow-sm" : "bg-amber-100"
                }`}>
                  {grid[r][c] !== null ? FRUITS[grid[r][c] as number] : ""}
                </div>
              ))}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400 flex-1">
          열을 탭해 과일을 떨어뜨리세요. 같은 과일끼리 붙으면 합쳐져요!
          &nbsp;🍒→🍓→🍋→🍊→🍎→🍑→🍇→🍉
        </p>
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
const GAMES: { key: GameTab; emoji: string; label: string }[] = [
  { key: "suika",    emoji: "🍉", label: "수박게임" },
  { key: "reaction", emoji: "⚡", label: "반응속도" },
  { key: "mole",     emoji: "🦔", label: "두더지" },
  { key: "ladder",   emoji: "🪜", label: "사다리" },
  { key: "random",   emoji: "🎯", label: "랜덤뽑기" },
  { key: "oddeven",  emoji: "🎲", label: "홀짝" },
  { key: "ranking",  emoji: "🏆", label: "랭킹" },
];

export default function GamesPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<GameTab>("suika");
  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">🎮 게임</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {GAMES.map(({ key, emoji, label }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap ${
              tab === key ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"
            }`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "suika"    && <SuikaGame playerName={myName} />}
        {tab === "reaction" && <ReactionGame playerName={myName} />}
        {tab === "mole"     && <WhackAMole playerName={myName} />}
        {tab === "ladder"   && <LadderGame />}
        {tab === "random"   && <RandomPicker />}
        {tab === "oddeven"  && <OddEvenGame />}
        {tab === "ranking"  && <RankingBoard />}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">내기는 적당히 😄</p>
    </div>
  );
}
