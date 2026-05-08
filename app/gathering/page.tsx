"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MapPin, CheckCircle2, Circle, Bell, X } from "lucide-react";
import { isAdmin } from "@/lib/auth";

type Location = "3층" | "옥상" | "편의점";

interface GatherCall {
  id: string;
  location: Location;
  message: string;
  calledBy: string;
  calledAt: string;
  checkins: string[]; // 체크인한 유저 이름 목록
}

const LOCATIONS: { value: Location; emoji: string }[] = [
  { value: "3층", emoji: "🏢" },
  { value: "옥상", emoji: "🌤️" },
  { value: "편의점", emoji: "🏪" },
];

export default function GatheringPage() {
  const { user, isLoaded } = useUser();
  const [call, setCall] = useState<GatherCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<Location>("3층");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];

  const load = async () => {
    try {
      const res = await fetch("/api/gather");
      const data = await res.json();
      setCall(data.call ?? null);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isLoaded) load();
    const interval = setInterval(load, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, [isLoaded]);

  const callGather = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selectedLoc, message, calledBy: myName }),
      });
      setShowForm(false);
      setMessage("");
      await load();
    } finally { setSaving(false); }
  };

  const cancelGather = async () => {
    if (!confirm("집합 해제할까요?")) return;
    await fetch("/api/gather", { method: "DELETE" });
    await load();
  };

  const checkin = async () => {
    if (!call) return;
    setSaving(true);
    try {
      await fetch("/api/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", name: myName }),
      });
      await load();
    } finally { setSaving(false); }
  };

  const myCheckedIn = call?.checkins.includes(myName) ?? false;

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">🚨 집합</h1>
        {admin && call && (
          <button type="button" onClick={cancelGather}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-xl px-3 py-1.5">
            <X size={13} /> 해제
          </button>
        )}
        {admin && !call && !showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-red-500 text-white rounded-xl px-3 py-2 text-sm font-medium">
            <Bell size={15} /> 집합 발령
          </button>
        )}
      </div>

      {/* 관리자 발령 폼 */}
      {admin && showForm && (
        <div className="card mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">📍 집합 장소 선택</h2>
          <div className="grid grid-cols-3 gap-2">
            {LOCATIONS.map(({ value, emoji }) => (
              <button key={value} type="button"
                onClick={() => setSelectedLoc(value)}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  selectedLoc === value
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-600"
                }`}>
                <div className="text-2xl mb-1">{emoji}</div>
                {value}
              </button>
            ))}
          </div>
          <input type="text" placeholder="추가 메시지 (선택)" value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          <div className="flex gap-2">
            <button type="button" onClick={callGather} disabled={saving}
              className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {saving ? "발령 중..." : "🚨 발령하기"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 현재 집합 없음 */}
      {!call && !showForm && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">😴</div>
          <p className="text-gray-500 text-sm">현재 집합 없음</p>
          {admin && <p className="text-xs text-gray-400 mt-1">위 버튼으로 집합 발령하세요</p>}
        </div>
      )}

      {/* 집합 발령 중 */}
      {call && (
        <>
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-4 text-center">
            <div className="text-4xl mb-2">🚨</div>
            <p className="text-lg font-bold text-red-700">집합!</p>
            <div className="text-3xl mt-2 mb-1">
              {LOCATIONS.find((l) => l.value === call.location)?.emoji}
            </div>
            <p className="text-xl font-bold text-gray-900">{call.location}</p>
            {call.message && (
              <p className="text-sm text-gray-600 mt-1">"{call.message}"</p>
            )}
            <p className="text-xs text-gray-400 mt-2">by {call.calledBy}</p>
          </div>

          {/* 내 체크인 버튼 */}
          {!admin && (
            <button type="button" onClick={checkin} disabled={myCheckedIn || saving}
              className={`w-full py-4 rounded-2xl text-base font-semibold mb-4 transition-all ${
                myCheckedIn
                  ? "bg-green-100 text-green-700 border-2 border-green-300"
                  : "bg-blue-600 text-white"
              }`}>
              {myCheckedIn ? "✅ 확인했어요!" : "나 갈게요 👋"}
            </button>
          )}

          {/* 체크인 현황 */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              참석 현황 <span className="text-blue-600">{call.checkins.length}명</span>
            </h2>
            {call.checkins.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">아직 아무도 없어요...</p>
            ) : (
              <div className="space-y-2">
                {call.checkins.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="text-sm text-gray-800">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
