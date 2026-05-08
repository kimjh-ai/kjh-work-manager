"use client";
import { useState, useEffect } from "react";
import { SignIn } from "@clerk/nextjs";

const GATE_KEY = "wm_gate";
const GATE_PASS = "qtrototo";

export default function SignInPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(GATE_KEY) === "1") setUnlocked(true);
  }, []);

  const submit = () => {
    if (input === GATE_PASS) {
      sessionStorage.setItem(GATE_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 1500);
    }
  };

  if (unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">🐷</div>
          <h1 className="text-xl font-bold text-gray-900">Work Manager</h1>
          <p className="text-sm text-gray-500 mt-1">생산품질팀</p>
        </div>
        <SignIn />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🐷</div>
        <h1 className="text-xl font-bold text-gray-900">Work Manager</h1>
        <p className="text-sm text-gray-500 mt-1">생산품질팀 전용 앱</p>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">입장 코드를 입력하세요</p>
          <p className="text-xs text-gray-400 mt-1">팀원에게 코드를 받아 입력해주세요</p>
        </div>
        <input
          type="password"
          placeholder="입장 코드"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className={`w-full border rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-400 ring-2 ring-red-200 bg-red-50"
              : "border-gray-200 focus:ring-blue-400"
          }`}
        />
        {error && (
          <p className="text-xs text-red-500 text-center">코드가 올바르지 않습니다</p>
        )}
        <button
          type="button"
          onClick={submit}
          className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold"
        >
          입장하기
        </button>
      </div>
    </div>
  );
}
