"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Bell, X, BellOff, BellRing, Clock, RefreshCw, Plus, Shuffle, RotateCcw, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import Avatar from "@/components/Avatar";
import { registerPush } from "@/components/PushSubscriber";
import MoodCard from "@/components/today/MoodCard";
import CoffeeRunCard from "@/components/today/CoffeeRunCard";
import VoteCard from "@/components/today/VoteCard";
import DutyPickerCard from "@/components/today/DutyPickerCard";
import PraiseCard from "@/components/today/PraiseCard";

type Location = "3층" | "옥상" | "편의점";
type Status = "going" | "waiting" | "cant";
type PageTab = "gather" | "today" | "games";
type GameTab = "ladder" | "random" | "oddeven" | "reaction" | "mole" | "2048";

interface ChatMessage {
  id: string;
  name: string;
  imageUrl: string | null;
  text: string;
  createdAt: string;
}
interface GatherLog {
  id: string;
  location: string;
  message: string;
  calledBy: string;
  calledAt: string;
  checkins: (string | Checkin)[];
}

interface Checkin {
  name: string;
  imageUrl?: string | null;
  status: Status;
  reason?: string;
}
interface GatherCall {
  id: string;
  location: Location;
  message: string;
  calledBy: string;
  calledAt: string;
  checkins: (string | Checkin)[];
}

const LOCATIONS: { value: Location; emoji: string }[] = [
  { value: "3층", emoji: "🏢" },
  { value: "옥상", emoji: "🌤️" },
  { value: "편의점", emoji: "🏪" },
];
const STATUS_CONFIG = {
  going:   { label: "나갈게요",     emoji: "✅", color: "bg-green-500 text-white",  light: "bg-green-50 border-green-200 text-green-700" },
  waiting: { label: "기다려주세요", emoji: "⏳", color: "bg-yellow-400 text-white", light: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  cant:    { label: "못나가요",     emoji: "❌", color: "bg-red-400 text-white",    light: "bg-red-50 border-red-200 text-red-700" },
};
function normalizeCheckin(c: string | Checkin): Checkin {
  return typeof c === "string" ? { name: c, status: "going" } : c;
}

/* ── 반응속도 ── */
function ReactionGame() {
  type Phase = "idle" | "waiting" | "go" | "result";
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  const start = () => {
    setPhase("waiting"); setMs(null); setTooEarly(false);
    timerRef.current = setTimeout(() => { setPhase("go"); startRef.current = Date.now(); }, 1500 + Math.random() * 3000);
  };
  const tap = () => {
    if (phase === "idle" || phase === "result") { start(); return; }
    if (phase === "waiting") { clearTimeout(timerRef.current!); setTooEarly(true); setPhase("idle"); return; }
    if (phase === "go") { setMs(Date.now() - startRef.current); setPhase("result"); }
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
        {phase === "idle"   && <><p className="text-5xl">👆</p><p className="text-gray-600 font-bold text-lg">탭해서 시작!</p></>}
        {phase === "waiting"&& <><p className="text-5xl">🔴</p><p className="text-white font-bold text-lg">기다리세요...</p></>}
        {phase === "go"     && <p className="text-white font-black text-5xl">지금!</p>}
        {phase === "result" && ms !== null && (
          <>
            <p className="text-5xl font-black text-gray-800">{ms}<span className="text-2xl">ms</span></p>
            <p className="text-xl font-bold text-gray-600">{rating}</p>
            <p className="text-sm text-gray-400 mt-1">탭해서 다시하기</p>
          </>
        )}
      </button>
      {tooEarly && <p className="text-red-500 font-semibold text-center">너무 빨리 눌렀어요! 😅</p>}
    </div>
  );
}

/* ── 두더지 잡기 ── */
function WhackAMole() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [moleIdx, setMoleIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [best, setBest] = useState(0);
  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  const showMole = (s: number) => {
    setMoleIdx(Math.floor(Math.random() * 9));
    moleRef.current = setTimeout(() => { setMoleIdx(null); showMole(s); }, Math.max(350, 850 - s * 15));
  };

  const start = () => {
    scoreRef.current = 0; setScore(0); setTimeLeft(30); setPlaying(true);
    showMole(0);
    gameRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(gameRef.current!); clearTimeout(moleRef.current!);
          setPlaying(false); setMoleIdx(null);
          setBest(b => Math.max(b, scoreRef.current));
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
      {!playing && (
        <button type="button" onClick={start}
          className="w-full bg-green-500 text-white rounded-2xl py-3 text-lg font-bold">
          {timeLeft === 30 ? "🦔 시작!" : `다시하기! (최고: ${best}점)`}
        </button>
      )}
    </div>
  );
}

/* ── 2048 ── */
const TILE_BG: Record<number, string> = {
  0:"bg-gray-200",2:"bg-amber-50",4:"bg-amber-100",8:"bg-orange-300",16:"bg-orange-400",
  32:"bg-orange-500",64:"bg-orange-600",128:"bg-yellow-400",256:"bg-yellow-500",
  512:"bg-yellow-600",1024:"bg-red-400",2048:"bg-red-600",
};
const TILE_FG: Record<number, string> = {
  0:"text-transparent",2:"text-gray-700",4:"text-gray-700",8:"text-white",16:"text-white",
  32:"text-white",64:"text-white",128:"text-white",256:"text-white",
  512:"text-white",1024:"text-white",2048:"text-white",
};
function g2048Init(): number[][] {
  const g: number[][] = Array.from({ length: 4 }, () => [0,0,0,0]);
  return g2048Add(g2048Add(g));
}
function g2048Add(g: number[][]): number[][] {
  const emp: [number,number][] = [];
  g.forEach((r,i)=>r.forEach((v,j)=>{ if(!v) emp.push([i,j]); }));
  if(!emp.length) return g;
  const [r,c]=emp[Math.floor(Math.random()*emp.length)];
  const ng=g.map(r=>[...r]); ng[r][c]=Math.random()<.9?2:4; return ng;
}
function g2048Slide(row: number[]): [number[], number] {
  const f=row.filter(Boolean); let s=0;
  for(let i=0;i<f.length-1;i++) if(f[i]===f[i+1]){f[i]*=2;s+=f[i];f.splice(i+1,1);}
  while(f.length<4)f.push(0); return[f,s];
}
function g2048Transpose(g: number[][]): number[][] { return g[0].map((_,c)=>g.map(r=>r[c])); }
function g2048Move(g: number[][], dir: "l"|"r"|"u"|"d"): [number[][], number] {
  let rows = dir==="r"?g.map(r=>[...r].reverse()):dir==="u"?g2048Transpose(g):dir==="d"?g2048Transpose(g).map(r=>[...r].reverse()):g.map(r=>[...r]);
  let total=0; rows=rows.map(r=>{ const[nr,s]=g2048Slide(r);total+=s;return nr; });
  if(dir==="r")rows=rows.map(r=>r.reverse());
  if(dir==="u")rows=g2048Transpose(rows);
  if(dir==="d")rows=g2048Transpose(rows.map(r=>r.reverse()));
  return[rows,total];
}
function g2048Equal(a: number[][], b: number[][]){ return a.every((r,i)=>r.every((v,j)=>v===b[i][j])); }
function g2048Over(g: number[][]){
  if(g.some(r=>r.some(v=>!v)))return false;
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    if(c<3&&g[r][c]===g[r][c+1])return false;
    if(r<3&&g[r][c]===g[r+1][c])return false;
  }return true;
}
function Game2048() {
  const [grid, setGrid] = useState<number[][]>(g2048Init);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const ts = useRef({x:0,y:0});

  const move = useCallback((dir: "l"|"r"|"u"|"d") => {
    if(over) return;
    setGrid(g => {
      const[ng,delta]=g2048Move(g,dir);
      if(g2048Equal(g,ng)) return g;
      const fin=g2048Add(ng);
      setScore(s=>{ const ns=s+delta; setBest(b=>Math.max(b,ns)); return ns; });
      if(fin.some(r=>r.includes(2048))) setWon(true);
      if(g2048Over(fin)) setOver(true);
      return fin;
    });
  }, [over]);

  useEffect(() => {
    const h=(e: KeyboardEvent)=>{
      const m: Record<string,"l"|"r"|"u"|"d">={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"};
      if(m[e.key]){e.preventDefault();move(m[e.key]);}
    };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[move]);

  const restart=()=>{setGrid(g2048Init());setScore(0);setOver(false);setWon(false);};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="bg-gray-100 rounded-xl px-4 py-2 text-center min-w-[80px]">
          <p className="text-[11px] text-gray-400 font-semibold">점수</p>
          <p className="text-xl font-black">{score}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl px-4 py-2 text-center min-w-[80px]">
          <p className="text-[11px] text-yellow-500 font-semibold">최고</p>
          <p className="text-xl font-black text-yellow-600">{best}</p>
        </div>
        <button type="button" onClick={restart} className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-sm font-semibold">새 게임</button>
      </div>
      {(over||won)&&(
        <div className={`rounded-2xl p-3 text-center ${won?"bg-yellow-50 border-2 border-yellow-300":"bg-red-50 border-2 border-red-200"}`}>
          <p className="text-lg font-black">{won?"🎉 2048 달성!":"😭 게임 오버"}</p>
          <button type="button" onClick={restart} className="mt-1 text-sm font-semibold text-blue-500">다시하기</button>
        </div>
      )}
      <div className="bg-gray-300 rounded-2xl p-2 grid grid-cols-4 gap-2 touch-none select-none"
        onTouchStart={e=>{ts.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
        onTouchEnd={e=>{
          const dx=e.changedTouches[0].clientX-ts.current.x;
          const dy=e.changedTouches[0].clientY-ts.current.y;
          if(Math.abs(dx)>Math.abs(dy))move(dx>30?"r":dx<-30?"l":"r");
          else move(dy>30?"d":dy<-30?"u":"d");
        }}>
        {grid.flat().map((v,i)=>(
          <div key={i} className={`aspect-square rounded-xl flex items-center justify-center font-black transition-all
            ${TILE_BG[v]??"bg-red-700"} ${TILE_FG[v]??"text-white"}
            ${v>=1024?"text-sm":v>=128?"text-lg":"text-2xl"}`}>
            {v||""}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center">스와이프 또는 방향키로 조작</p>
    </div>
  );
}

/* ── 사다리 게임 ── */
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
  const ROWS = 10;
  const count = players.length;
  const W = 280; const H = 320;
  const colX = (i: number) => (W / (count + 1)) * (i + 1);
  const rowY = (r: number) => 20 + (H / (ROWS + 1)) * (r + 1);

  const start = () => {
    const r = generateRungs(count, ROWS);
    setRungs(r); setResults(players.map((_, i) => tracePath(i, r))); setRevealed(new Set());
  };
  const reset = () => { setRungs(null); setResults(null); setRevealed(new Set()); };
  const addSlot = () => { if (players.length >= 8) return; setPlayers([...players, ""]); setPrizes([...prizes, ""]); };
  const removeSlot = (i: number) => { setPlayers(players.filter((_, j) => j !== i)); setPrizes(prizes.filter((_, j) => j !== i)); };

  return !rungs ? (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500 px-1"><span>참가자</span><span>결과</span></div>
      {players.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={p} onChange={(e) => { const a=[...players];a[i]=e.target.value;setPlayers(a); }} placeholder={`참가자 ${i+1}`} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          <input value={prizes[i]} onChange={(e) => { const a=[...prizes];a[i]=e.target.value;setPrizes(a); }} placeholder={`결과 ${i+1}`} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
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
            const prize = prizes[results.indexOf(i)]??"";
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

/* ── 랜덤 뽑기 ── */
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

/* ── 홀짝 ── */
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

/* ── 메인 ── */
export default function GatheringPage() {
  const { user, isLoaded } = useUser();
  const [pageTab, setPageTab] = useState<PageTab>("gather");
  const [gameTab, setGameTab] = useState<GameTab>("ladder");
  const [call, setCall] = useState<GatherCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<Location>("3층");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"unknown"|"granted"|"denied"|"unsupported">("unknown");
  const [isChanging, setIsChanging] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [reason, setReason] = useState("");
  const [renotifying, setRenotifying] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ name: string; imageUrl: string | null }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [gatherLogs, setGatherLogs] = useState<GatherLog[]>([]);
  const [gatherStats, setGatherStats] = useState({ day: 0, week: 0, month: 0 });
  const [callerStats, setCallerStats] = useState<{ name: string; count: number }[]>([]);
  const [locStats, setLocStats] = useState<{ location: string; count: number }[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [statsTab, setStatsTab] = useState<"count" | "caller" | "loc">("count");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];
  const myImage = user?.imageUrl ?? null;

  const loadChat = async (callId: string) => {
    try {
      const res = await fetch(`/api/gather-chat?callId=${encodeURIComponent(callId)}`);
      const data = await res.json();
      setChatMessages(data.messages ?? []);
    } catch { /* no-op */ }
  };

  const loadOnline = async () => {
    try {
      const res = await fetch("/api/online");
      const data = await res.json();
      setOnlineUsers(data.users ?? []);
    } catch { /* no-op */ }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/gather-history");
      const data = await res.json();
      setGatherLogs(data.history ?? []);
      setGatherStats(data.stats ?? { day: 0, week: 0, month: 0 });
      setCallerStats(data.callerStats ?? []);
      setLocStats(data.locStats ?? []);
    } catch { /* no-op */ }
  };

  const poll = async (initial = false) => {
    try {
      const res = await fetch("/api/gather");
      const data = await res.json();
      const newCall: GatherCall | null = data.call ?? null;
      setCall(newCall);
      if (initial) setLoading(false);
      if (newCall) await loadChat(newCall.id);
      else setChatMessages([]);
    } catch { if (initial) setLoading(false); }
  };

  useEffect(() => {
    if (!isLoaded) return;
    poll(true); loadOnline(); loadHistory();
    const interval = setInterval(() => poll(), 5000);
    const onlineInterval = setInterval(loadOnline, 30_000);
    return () => { clearInterval(interval); clearInterval(onlineInterval); };
  }, [isLoaded]);

  // 채팅 컨테이너 안에서만 스크롤 (이미 맨 아래 있을 때만)
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  useEffect(() => {
    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    setNotifStatus(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "unknown");
  }, []);

  const enableNotif = async () => setNotifStatus(await registerPush());

  const sendChat = async () => {
    if (!chatText.trim() || chatSending || !call) return;
    setChatSending(true);
    const text = chatText.trim();
    setChatText("");
    try {
      await fetch("/api/gather-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id, name: myName, imageUrl: myImage, text }),
      });
      await loadChat(call.id);
      // 내가 보낸 메시지는 항상 맨 아래로
      const el = chatContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } finally { setChatSending(false); }
  };

  const callGather = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/gather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: selectedLoc, message, calledBy: myName }) });
      setShowForm(false); setMessage(""); await poll();
    } finally { setSaving(false); }
  };

  const cancelGather = async () => {
    if (!confirm("집합 해제할까요?")) return;
    await fetch("/api/gather", { method: "DELETE" });
    await poll();
  };

  const renotify = async () => {
    setRenotifying(true);
    try { await fetch("/api/gather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "renotify" }) }); }
    finally { setRenotifying(false); }
  };

  const submitCheckin = async (status: Status, r?: string) => {
    if (!call) return;
    setSaving(true);
    try {
      await fetch("/api/gather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkin", name: myName, imageUrl: myImage, status, reason: r ?? "" }) });
      setPendingStatus(null); setReason(""); setIsChanging(false); await poll();
    } finally { setSaving(false); }
  };

  const checkins = (call?.checkins ?? []).map(normalizeCheckin);
  const myCheckin = checkins.find(c => c.name === myName);
  const grouped = {
    going:   checkins.filter(c => c.status === "going"),
    waiting: checkins.filter(c => c.status === "waiting"),
    cant:    checkins.filter(c => c.status === "cant"),
  };

  if (!isLoaded || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 페이지 탭 */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {([
          ["gather", "🚨 집합"],
          ["today",  "☀️ 오늘"],
          ["games",  "🎮 게임"],
        ] as [PageTab, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setPageTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pageTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 오늘 탭 ── */}
      {pageTab === "today" && (
        <div>
          <MoodCard myName={myName} myImage={myImage} />
          <CoffeeRunCard myName={myName} myImage={myImage} />
          <VoteCard myName={myName} />
          <DutyPickerCard myName={myName} />
          <PraiseCard myName={myName} />
        </div>
      )}

      {/* ── 게임 탭 ── */}
      {pageTab === "games" && (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {([
              ["ladder",  "🪜 사다리"],
              ["random",  "🎯 랜덤뽑기"],
              ["oddeven", "🎲 홀짝"],
              ["reaction","⚡ 반응속도"],
              ["mole",    "🦔 두더지"],
              ["2048",    "🎮 2048"],
            ] as [GameTab,string][]).map(([k,l])=>(
              <button key={k} type="button" onClick={()=>setGameTab(k)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  gameTab===k ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"
                }`}>{l}</button>
            ))}
          </div>
          <div className="card">
            {gameTab==="ladder"   && <LadderGame/>}
            {gameTab==="random"   && <RandomPicker/>}
            {gameTab==="oddeven"  && <OddEvenGame/>}
            {gameTab==="reaction" && <ReactionGame/>}
            {gameTab==="mole"     && <WhackAMole/>}
            {gameTab==="2048"     && <Game2048/>}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">내기는 적당히 😄</p>
        </>
      )}

      {/* ── 집합 탭 ── */}
      {pageTab === "gather" && (
        <>
          {notifStatus==="unknown" && <button type="button" onClick={enableNotif} className="w-full flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-medium mb-4"><BellRing size={15}/> 집합 알림 받기 (탭해서 켜기)</button>}
          {notifStatus==="denied" && <div className="w-full flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl px-4 py-2.5 text-sm mb-4"><BellOff size={15}/> 알림 차단됨 — 브라우저 설정에서 허용해야 해요</div>}

          {/* 온라인 접속자 */}
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-3 mb-4">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <div className="flex -space-x-1.5">
                {onlineUsers.slice(0, 8).map((u) => (
                  <Avatar key={u.name} imageUrl={u.imageUrl} name={u.name} size={26} />
                ))}
              </div>
              <p className="text-[12px] text-gray-500 ml-1">
                현재 <span className="font-semibold text-gray-800">{onlineUsers.length}명</span> 접속 중
              </p>
            </div>
          )}

          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">🚨 집합</h1>
            <div className="flex items-center gap-2">
              {call && (
                <>
                  <button type="button" onClick={renotify} disabled={renotifying}
                    className="flex items-center gap-1 text-xs text-orange-500 border border-orange-200 rounded-xl px-3 py-1.5">
                    <RefreshCw size={12} className={renotifying?"animate-spin":""}/> 재알림
                  </button>
                  <button type="button" onClick={cancelGather}
                    className="flex items-center gap-1 text-xs text-red-400 border border-red-200 rounded-xl px-3 py-1.5">
                    <X size={12}/> 해제
                  </button>
                </>
              )}
              {!call && !showForm && (
                <button type="button" onClick={() => setShowForm(true)}
                  className="flex items-center gap-1 bg-red-500 text-white rounded-xl px-3 py-2 text-sm font-medium">
                  <Bell size={15}/> 집합 발령
                </button>
              )}
            </div>
          </div>

          {/* 발령 폼 */}
          {showForm && (
            <div className="card mb-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">📍 집합 장소 선택</h2>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map(({value,emoji})=>(
                  <button key={value} type="button" onClick={()=>setSelectedLoc(value)}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${selectedLoc===value?"border-red-500 bg-red-50 text-red-700":"border-gray-200 text-gray-600"}`}>
                    <div className="text-2xl mb-1">{emoji}</div>{value}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="추가 메시지 (선택)" value={message} onChange={e=>setMessage(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
              <div className="flex gap-2">
                <button type="button" onClick={callGather} disabled={saving} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">{saving?"발령 중...":"🚨 발령하기"}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium">취소</button>
              </div>
            </div>
          )}

          {!call && !showForm && (
            <div className="card text-center py-8 mb-4">
              <div className="text-5xl mb-3">😴</div>
              <p className="text-gray-500 text-sm">현재 집합 없음</p>
            </div>
          )}

          {/* 발령 통계 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            {/* 탭 */}
            <div className="flex border-b border-gray-100">
              {([["count","📊 기간별"],["caller","👤 발령자"],["loc","📍 장소별"]] as ["count"|"caller"|"loc", string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setStatsTab(key)}
                  className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${statsTab === key ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-400"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="px-4 py-3">
              {/* 기간별 */}
              {statsTab === "count" && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {([["오늘", gatherStats.day], ["이번 주", gatherStats.week], ["이번 달", gatherStats.month]] as [string, number][]).map(([label, count]) => (
                    <div key={label} className="bg-gray-50 rounded-xl py-3">
                      <p className="text-[24px] font-black text-gray-800">{count}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 발령자 순위 */}
              {statsTab === "caller" && (
                <div className="space-y-2">
                  {callerStats.length === 0 ? (
                    <p className="text-[13px] text-gray-400 text-center py-3">이번달 기록 없음</p>
                  ) : callerStats.map(({ name, count }, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                    const maxCount = callerStats[0].count;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-[16px] w-6 text-center flex-shrink-0">{medal}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[14px] font-semibold text-gray-800 truncate">{name}</p>
                            <p className="text-[13px] font-bold text-blue-600 flex-shrink-0 ml-2">{count}회</p>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="progress-bar bg-blue-500 rounded-full h-1.5 transition-all"
                              style={{ "--progress": `${(count / maxCount) * 100}%` } as React.CSSProperties} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-gray-300 text-center pt-1">이번달 기준</p>
                </div>
              )}

              {/* 장소별 */}
              {statsTab === "loc" && (
                <div className="space-y-2">
                  {locStats.length === 0 ? (
                    <p className="text-[13px] text-gray-400 text-center py-3">이번달 기록 없음</p>
                  ) : (() => {
                    const locEmoji: Record<string, string> = { "3층": "🏢", "옥상": "🌤️", "편의점": "🏪" };
                    const maxCount = locStats[0].count;
                    return locStats.map(({ location, count }) => (
                      <div key={location} className="flex items-center gap-3">
                        <span className="text-[18px] flex-shrink-0">{locEmoji[location] ?? "📍"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[14px] font-semibold text-gray-800">{location}</p>
                            <p className="text-[13px] font-bold text-orange-500 flex-shrink-0 ml-2">{count}회</p>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="progress-bar bg-orange-400 rounded-full h-1.5 transition-all"
                              style={{ "--progress": `${(count / maxCount) * 100}%` } as React.CSSProperties} />
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  <p className="text-[11px] text-gray-300 text-center pt-1">이번달 기준</p>
                </div>
              )}
            </div>
          </div>

          {/* 최근 발령 기록 */}
          {gatherLogs.length > 0 && (() => {
            const locEmoji: Record<string, string> = { "3층": "🏢", "옥상": "🌤️", "편의점": "🏪" };
            const visible = historyExpanded ? gatherLogs : gatherLogs.slice(0, 3);
            return (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">최근 기록</p>
                  <span className="text-[11px] text-gray-300">{gatherLogs.length}건</span>
                </div>
                {visible.map((log, idx) => {
                  const going = (log.checkins ?? []).map(normalizeCheckin).filter(c => c.status === "going").length;
                  const cant  = (log.checkins ?? []).map(normalizeCheckin).filter(c => c.status === "cant").length;
                  const wait  = (log.checkins ?? []).map(normalizeCheckin).filter(c => c.status === "waiting").length;
                  return (
                    <div key={log.id} className={`flex items-center gap-3 px-4 py-3 ${idx < visible.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <span className="text-xl flex-shrink-0">{locEmoji[log.location] ?? "📍"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[14px] font-semibold text-gray-800">{log.location}</p>
                          {log.message && <p className="text-[12px] text-gray-400 truncate">"{log.message}"</p>}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {format(new Date(log.calledAt), "M/d HH:mm")} · <span className="font-medium text-gray-600">{log.calledBy}</span>
                          {log.checkins.length > 0 && <span className="ml-1">· ✅{going} ⏳{wait} ❌{cant}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {gatherLogs.length > 3 && (
                  <button type="button" onClick={() => setHistoryExpanded((v) => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-gray-50 text-[13px] font-semibold text-blue-500 hover:bg-gray-50 transition-colors">
                    <ChevronDown size={15} className={`transition-transform ${historyExpanded ? "rotate-180" : ""}`} />
                    {historyExpanded ? "접기" : `${gatherLogs.length - 3}개 더보기`}
                  </button>
                )}
              </div>
            );
          })()}

          {call && (
            <>
              {/* 집합 카드 */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-4 text-center">
                <div className="text-4xl mb-2">🚨</div>
                <p className="text-lg font-bold text-red-700">집합!</p>
                <div className="text-3xl mt-2 mb-1">{LOCATIONS.find(l=>l.value===call.location)?.emoji}</div>
                <p className="text-xl font-bold text-gray-900">{call.location}</p>
                {call.message && <p className="text-sm text-gray-600 mt-1">"{call.message}"</p>}
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-2">
                  <Clock size={11}/>
                  <span>{format(new Date(call.calledAt),"HH:mm")} 발령</span>
                  <span>· by {call.calledBy}</span>
                </div>
              </div>

              {/* 내 응답 */}
              <div className="card mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">내 응답</p>

                {/* 현재 응답 표시 */}
                {myCheckin && !isChanging && pendingStatus === null && (
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${STATUS_CONFIG[myCheckin.status].light}`}>
                    <span className="text-sm font-semibold">{STATUS_CONFIG[myCheckin.status].emoji} {STATUS_CONFIG[myCheckin.status].label}</span>
                    <button type="button" onClick={() => setIsChanging(true)}
                      className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50">변경</button>
                  </div>
                )}

                {/* 상태 선택 버튼 (초기 or 변경 모드) */}
                {(!myCheckin || isChanging) && pendingStatus === null && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(["going","waiting","cant"] as Status[]).map(s=>(
                        <button key={s} type="button"
                          onClick={() => s==="going" ? submitCheckin("going") : setPendingStatus(s)}
                          className={`py-3 rounded-xl text-xs font-semibold ${STATUS_CONFIG[s].color}`}>
                          {STATUS_CONFIG[s].emoji}<br/>{STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                    {isChanging && (
                      <button type="button" onClick={() => setIsChanging(false)}
                        className="w-full py-2 rounded-xl text-sm bg-gray-100 text-gray-600">취소</button>
                    )}
                  </div>
                )}

                {/* 사유 입력 */}
                {pendingStatus !== null && (
                  <div className="space-y-2">
                    <input type="text" placeholder="사유 입력 (선택)" value={reason} onChange={e=>setReason(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") submitCheckin(pendingStatus,reason); }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>submitCheckin(pendingStatus,reason)} disabled={saving}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${pendingStatus==="waiting"?"bg-yellow-400":"bg-red-400"}`}>
                        {STATUS_CONFIG[pendingStatus].emoji} {STATUS_CONFIG[pendingStatus].label}
                      </button>
                      <button type="button" onClick={()=>{setPendingStatus(null);setReason("");setIsChanging(false);}}
                        className="flex-1 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600">취소</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 참석 현황 */}
              <div className="card space-y-4">
                <h2 className="text-sm font-semibold text-gray-700">참석 현황 <span className="text-blue-600">{checkins.length}명 응답</span></h2>
                {checkins.length===0 && <p className="text-xs text-gray-400 text-center py-4">아직 아무도 없어요...</p>}
                {(["going","waiting","cant"] as Status[]).map(s => grouped[s].length>0 && (
                  <div key={s}>
                    <p className="text-xs font-semibold text-gray-500 mb-2">{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label} ({grouped[s].length}명)</p>
                    <div className="space-y-2">
                      {grouped[s].map((c,i)=>(
                        <div key={i} className="flex items-center gap-2">
                          <Avatar imageUrl={c.imageUrl} name={c.name} size={30}/>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800">{c.name}</span>
                            {c.reason && <p className="text-xs text-gray-400 truncate">{c.reason}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 이번 집합 채팅 */}
              <div className="mt-4">
                <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">💬 이번 집합 채팅</p>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div ref={chatContainerRef} className="h-64 overflow-y-auto p-3 space-y-3">
                    {chatMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-2xl mb-1">💬</p>
                        <p className="text-[13px] text-gray-400">이번 집합 채팅을 시작해보세요</p>
                      </div>
                    )}
                    {chatMessages.map((msg) => {
                      const isMine = msg.name === myName;
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                          {!isMine && <Avatar imageUrl={msg.imageUrl} name={msg.name} size={28} />}
                          <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                            {!isMine && <p className="text-[11px] text-gray-400 px-1">{msg.name}</p>}
                            <div className={`px-3 py-2 rounded-2xl text-[14px] leading-relaxed ${
                              isMine ? "bg-blue-500 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            }`}>
                              {msg.text}
                            </div>
                            <p className="text-[10px] text-gray-300 px-1">{format(new Date(msg.createdAt), "HH:mm")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-100 flex items-center gap-2 px-3 py-2.5">
                    <Avatar imageUrl={myImage} name={myName} size={28} />
                    <input
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      placeholder="메시지 입력..."
                      className="flex-1 bg-gray-100 rounded-2xl px-3.5 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button type="button" onClick={sendChat} disabled={chatSending || !chatText.trim()}
                      aria-label="전송" title="전송"
                      className="w-9 h-9 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
