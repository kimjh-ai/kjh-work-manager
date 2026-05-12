"use client";

import { useState, useRef } from "react";
import { Plus, X, Shuffle, RotateCcw } from "lucide-react";

/* ──────────────────────────────────────────
   사다리 게임
────────────────────────────────────────── */
function generateRungs(cols: number, rows: number): boolean[][] {
  const rungs: boolean[][] = Array.from({ length: rows }, () => Array(cols - 1).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (!rungs[r][c] && (c === 0 || !rungs[r][c - 1])) {
        rungs[r][c] = Math.random() < 0.45;
      }
    }
  }
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
  const W = 280;
  const H = 320;
  const colX = (i: number) => (W / (count + 1)) * (i + 1);
  const rowY = (r: number) => 20 + (H / (ROWS + 1)) * (r + 1);

  const start = () => {
    const r = generateRungs(count, ROWS);
    const res = players.map((_, i) => tracePath(i, r));
    setRungs(r);
    setResults(res);
    setRevealed(new Set());
  };

  const reset = () => { setRungs(null); setResults(null); setRevealed(new Set()); };

  const addSlot = () => {
    if (players.length >= 8) return;
    setPlayers([...players, ""]);
    setPrizes([...prizes, ""]);
  };
  const removeSlot = (i: number) => {
    setPlayers(players.filter((_, j) => j !== i));
    setPrizes(prizes.filter((_, j) => j !== i));
  };

  return (
    <div>
      {!rungs ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500 px-1">
            <span>참가자</span><span>결과</span>
          </div>
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p} onChange={(e) => {
                const a = [...players]; a[i] = e.target.value; setPlayers(a);
              }} placeholder={`참가자 ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <input value={prizes[i]} onChange={(e) => {
                const a = [...prizes]; a[i] = e.target.value; setPrizes(a);
              }} placeholder={`결과 ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              {players.length > 2 && (
                <button type="button" onClick={() => removeSlot(i)} aria-label="삭제"
                  className="text-gray-300 hover:text-red-400"><X size={16} /></button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            {players.length < 8 && (
              <button type="button" onClick={addSlot}
                className="flex items-center gap-1 text-xs text-purple-600 border border-purple-200 rounded-xl px-3 py-2">
                <Plus size={13} /> 추가
              </button>
            )}
            <button type="button" onClick={start}
              disabled={players.some((p) => !p.trim()) || prizes.some((p) => !p.trim())}
              className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40">
              🪜 사다리 시작!
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SVG 사다리 */}
          <div className="flex justify-center">
            <svg width={W} height={H + 80} className="overflow-visible">
              {/* 참가자 이름 (상단) */}
              {players.map((p, i) => (
                <text key={i} x={colX(i)} y={14} textAnchor="middle"
                  fontSize={11} fontWeight="bold" fill="#6d28d9">{p || `P${i + 1}`}</text>
              ))}
              {/* 세로선 */}
              {players.map((_, i) => (
                <line key={i} x1={colX(i)} y1={20} x2={colX(i)} y2={rowY(ROWS)}
                  stroke="#c4b5fd" strokeWidth={2} />
              ))}
              {/* 가로 연결선 */}
              {rungs!.map((row, r) =>
                row.map((has, c) => has ? (
                  <line key={`${r}-${c}`}
                    x1={colX(c)} y1={rowY(r)} x2={colX(c + 1)} y2={rowY(r)}
                    stroke="#7c3aed" strokeWidth={2} />
                ) : null)
              )}
              {/* 결과 이름 (하단) */}
              {results && players.map((_, i) => {
                const resultIdx = results.indexOf(i);
                const prize = prizes[resultIdx] ?? "";
                return (
                  <g key={i} onClick={() => setRevealed((prev) => new Set([...prev, i]))}
                    style={{ cursor: "pointer" }}>
                    <rect x={colX(i) - 28} y={rowY(ROWS) + 8} width={56} height={24} rx={6}
                      fill={revealed.has(i) ? "#7c3aed" : "#e5e7eb"} />
                    <text x={colX(i)} y={rowY(ROWS) + 24} textAnchor="middle"
                      fontSize={10} fontWeight="bold"
                      fill={revealed.has(i) ? "white" : "#9ca3af"}>
                      {revealed.has(i) ? prize : "?"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {!revealed.size && (
            <p className="text-center text-xs text-gray-400">결과 박스를 탭해서 확인하세요!</p>
          )}

          {revealed.size === players.length && (
            <div className="bg-purple-50 rounded-xl p-3 space-y-1">
              {players.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-purple-700">{p}</span>
                  <span className="text-gray-700">{prizes[results![i]]}</span>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={reset}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium">
            <RotateCcw size={14} /> 다시하기
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   랜덤 뽑기
────────────────────────────────────────── */
function RandomPicker() {
  const [items, setItems] = useState(["", "", ""]);
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validItems = items.filter((s) => s.trim());

  const pick = () => {
    if (validItems.length < 2 || spinning) return;
    setSpinning(true);
    setResult(null);
    let count = 0;
    const total = 20;
    intervalRef.current = setInterval(() => {
      setDisplayText(validItems[Math.floor(Math.random() * validItems.length)]);
      count++;
      if (count >= total) {
        clearInterval(intervalRef.current!);
        const chosen = validItems[Math.floor(Math.random() * validItems.length)];
        setResult(chosen);
        setDisplayText(chosen);
        setSpinning(false);
      }
    }, 80);
  };

  const reset = () => {
    setResult(null);
    setDisplayText("");
  };

  return (
    <div className="space-y-3">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={v} onChange={(e) => {
            const a = [...items]; a[i] = e.target.value; setItems(a);
          }} placeholder={`항목 ${i + 1}`}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {items.length > 2 && (
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))}
              aria-label="삭제" className="text-gray-300 hover:text-red-400"><X size={16} /></button>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        {items.length < 10 && (
          <button type="button" onClick={() => setItems([...items, ""])}
            className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-xl px-3 py-2">
            <Plus size={13} /> 추가
          </button>
        )}
        <button type="button" onClick={pick} disabled={validItems.length < 2 || spinning}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40">
          <Shuffle size={15} /> {spinning ? "뽑는 중..." : "뽑기!"}
        </button>
      </div>

      {(spinning || result) && (
        <div className={`rounded-2xl p-6 text-center transition-all ${result ? "bg-blue-600" : "bg-blue-100"}`}>
          <p className={`text-2xl font-bold ${result ? "text-white" : "text-blue-400"}`}>
            {displayText || "..."}
          </p>
          {result && <p className="text-blue-200 text-xs mt-1">당첨!</p>}
        </div>
      )}

      {result && (
        <button type="button" onClick={reset}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm">
          <RotateCcw size={14} /> 다시뽑기
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   홀짝 (짝수/홀수 맞추기)
────────────────────────────────────────── */
function OddEvenGame() {
  const [pick, setPick] = useState<"홀" | "짝" | null>(null);
  const [result, setResult] = useState<{ num: number; correct: boolean } | null>(null);
  const [spinning, setSpinning] = useState(false);

  const play = (choice: "홀" | "짝") => {
    if (spinning) return;
    setPick(choice);
    setResult(null);
    setSpinning(true);
    setTimeout(() => {
      const num = Math.floor(Math.random() * 20) + 1;
      const isOdd = num % 2 === 1;
      const correct = (choice === "홀" && isOdd) || (choice === "짝" && !isOdd);
      setResult({ num, correct });
      setSpinning(false);
    }, 800);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">홀수 or 짝수? 맞히면 이긴다!</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => play("홀")} disabled={spinning}
          className={`py-6 rounded-2xl text-xl font-bold transition-all disabled:opacity-50 ${pick === "홀" && result ? (result.correct ? "bg-green-500 text-white" : "bg-red-400 text-white") : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          홀 (1,3,5…)
        </button>
        <button type="button" onClick={() => play("짝")} disabled={spinning}
          className={`py-6 rounded-2xl text-xl font-bold transition-all disabled:opacity-50 ${pick === "짝" && result ? (result.correct ? "bg-green-500 text-white" : "bg-red-400 text-white") : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          짝 (2,4,6…)
        </button>
      </div>

      {spinning && (
        <div className="text-center py-4">
          <div className="text-4xl animate-bounce">🎲</div>
        </div>
      )}

      {result && (
        <div className={`rounded-2xl p-5 text-center ${result.correct ? "bg-green-50 border-2 border-green-300" : "bg-red-50 border-2 border-red-300"}`}>
          <p className="text-4xl font-black text-gray-800 mb-1">{result.num}</p>
          <p className="text-sm text-gray-500">{result.num % 2 === 1 ? "홀수" : "짝수"}</p>
          <p className={`text-lg font-bold mt-2 ${result.correct ? "text-green-600" : "text-red-500"}`}>
            {result.correct ? "🎉 정답! 이겼어!" : "😭 틀렸어! 졌어!"}
          </p>
        </div>
      )}

      {result && (
        <button type="button" onClick={() => { setResult(null); setPick(null); }}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm">
          <RotateCcw size={14} /> 다시하기
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   메인 페이지
────────────────────────────────────────── */
type GameTab = "ladder" | "random" | "oddeven";

const GAMES: { key: GameTab; emoji: string; label: string }[] = [
  { key: "ladder",  emoji: "🪜", label: "사다리" },
  { key: "random",  emoji: "🎯", label: "랜덤뽑기" },
  { key: "oddeven", emoji: "🎲", label: "홀짝" },
];

export default function GamesPage() {
  const [tab, setTab] = useState<GameTab>("ladder");

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">🎮 게임</h1>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {GAMES.map(({ key, emoji, label }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "ladder"  && <LadderGame />}
        {tab === "random"  && <RandomPicker />}
        {tab === "oddeven" && <OddEvenGame />}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">내기는 적당히 😄</p>
    </div>
  );
}
