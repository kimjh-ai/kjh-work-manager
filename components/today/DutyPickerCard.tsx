"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle, RotateCcw, X } from "lucide-react";

interface Props {
  myName: string;
}

export default function DutyPickerCard({ myName }: Props) {
  const [names, setNames] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/mood")
      .then((r) => r.json())
      .then((data) => {
        const participants = Object.keys(data.moods ?? {});
        const merged = Array.from(new Set([myName, ...participants]));
        setNames(merged);
      })
      .catch(() => setNames([myName]));
  }, [myName]);

  const addName = () => {
    const n = input.trim();
    if (!n || names.includes(n)) return;
    setNames([...names, n]);
    setInput("");
  };

  const pick = () => {
    if (names.length < 1 || spinning) return;
    setSpinning(true);
    setResult(null);
    let count = 0;
    intervalRef.current = setInterval(() => {
      setDisplayText(names[Math.floor(Math.random() * names.length)]);
      if (++count >= 24) {
        clearInterval(intervalRef.current!);
        const chosen = names[Math.floor(Math.random() * names.length)];
        setResult(chosen);
        setDisplayText(chosen);
        setSpinning(false);
      }
    }, 75);
  };

  return (
    <div className="card mb-3">
      <h2 className="text-sm font-bold text-gray-800 mb-3">🎰 오늘의 당번</h2>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {names.map((name) => (
          <span key={name}
            className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-700">
            {name}
            {names.length > 1 && (
              <button type="button" onClick={() => setNames(names.filter((n) => n !== name))}
                className="text-gray-400 hover:text-red-400 leading-none ml-0.5">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addName(); }}
          placeholder="이름 추가..."
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <button type="button" onClick={addName} disabled={!input.trim()}
          className="bg-orange-100 text-orange-600 rounded-xl px-3 text-sm font-medium disabled:opacity-40">
          추가
        </button>
      </div>

      {(spinning || result) && (
        <div className={`rounded-2xl p-5 text-center mb-3 transition-all ${result ? "bg-orange-500" : "bg-orange-100"}`}>
          <p className={`text-2xl font-bold ${result ? "text-white" : "text-orange-400"}`}>
            {displayText || "..."}
          </p>
          {result && <p className="text-orange-200 text-sm mt-1">오늘의 당번! 🎉</p>}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={pick} disabled={names.length < 1 || spinning}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40">
          <Shuffle size={15} /> {spinning ? "뽑는 중..." : "당번 뽑기!"}
        </button>
        {result && (
          <button type="button" onClick={() => { setResult(null); setDisplayText(""); }}
            className="flex items-center justify-center bg-gray-100 text-gray-600 rounded-xl px-4 text-sm">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
