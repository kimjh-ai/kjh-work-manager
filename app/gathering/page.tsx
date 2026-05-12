"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, Bell, X, BellOff, BellRing, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { isAdmin } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import { registerPush } from "@/components/PushSubscriber";

type Location = "3층" | "옥상" | "편의점";
type Status = "going" | "waiting" | "cant";

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
  if (typeof c === "string") return { name: c, status: "going" };
  return c;
}

export default function GatheringPage() {
  const { user, isLoaded } = useUser();
  const [call, setCall] = useState<GatherCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<Location>("3층");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [reason, setReason] = useState("");
  const [renotifying, setRenotifying] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];
  const myImage = user?.imageUrl ?? null;

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
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  useEffect(() => {
    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    setNotifStatus(
      Notification.permission === "granted" ? "granted"
      : Notification.permission === "denied" ? "denied"
      : "unknown"
    );
  }, []);

  const enableNotif = async () => {
    const result = await registerPush();
    setNotifStatus(result);
  };

  const callGather = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selectedLoc, message, calledBy: myName }),
      });
      setShowForm(false); setMessage("");
      await load();
    } finally { setSaving(false); }
  };

  const cancelGather = async () => {
    if (!confirm("집합 해제할까요?")) return;
    await fetch("/api/gather", { method: "DELETE" });
    await load();
  };

  const renotify = async () => {
    setRenotifying(true);
    try {
      await fetch("/api/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renotify" }),
      });
    } finally { setRenotifying(false); }
  };

  const submitCheckin = async (status: Status, r?: string) => {
    if (!call) return;
    setSaving(true);
    try {
      await fetch("/api/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", name: myName, imageUrl: myImage, status, reason: r ?? "" }),
      });
      setPendingStatus(null); setReason("");
      await load();
    } finally { setSaving(false); }
  };

  const checkins = (call?.checkins ?? []).map(normalizeCheckin);
  const myCheckin = checkins.find((c) => c.name === myName);
  const grouped = {
    going:   checkins.filter((c) => c.status === "going"),
    waiting: checkins.filter((c) => c.status === "waiting"),
    cant:    checkins.filter((c) => c.status === "cant"),
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 알림 상태 배너 */}
      {notifStatus === "unknown" && (
        <button type="button" onClick={enableNotif}
          className="w-full flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-medium mb-4">
          <BellRing size={15} /> 집합 알림 받기 (탭해서 켜기)
        </button>
      )}
      {notifStatus === "denied" && (
        <div className="w-full flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl px-4 py-2.5 text-sm mb-4">
          <BellOff size={15} /> 알림 차단됨 — 브라우저 설정에서 허용해야 해요
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">🚨 집합</h1>
        <div className="flex items-center gap-2">
          {admin && call && (
            <>
              <button type="button" onClick={renotify} disabled={renotifying}
                className="flex items-center gap-1 text-xs text-orange-500 border border-orange-200 rounded-xl px-3 py-1.5">
                <RefreshCw size={12} className={renotifying ? "animate-spin" : ""} /> 재알림
              </button>
              <button type="button" onClick={cancelGather}
                className="flex items-center gap-1 text-xs text-red-400 border border-red-200 rounded-xl px-3 py-1.5">
                <X size={12} /> 해제
              </button>
            </>
          )}
          {!call && !showForm && (
            <button type="button" onClick={() => setShowForm(true)}
              className="flex items-center gap-1 bg-red-500 text-white rounded-xl px-3 py-2 text-sm font-medium">
              <Bell size={15} /> 집합 발령
            </button>
          )}
        </div>
      </div>

      {/* 발령 폼 */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">📍 집합 장소 선택</h2>
          <div className="grid grid-cols-3 gap-2">
            {LOCATIONS.map(({ value, emoji }) => (
              <button key={value} type="button" onClick={() => setSelectedLoc(value)}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  selectedLoc === value ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600"
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
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium">취소</button>
          </div>
        </div>
      )}

      {!call && !showForm && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">😴</div>
          <p className="text-gray-500 text-sm">현재 집합 없음</p>
        </div>
      )}

      {call && (
        <>
          {/* 집합 카드 */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-4 text-center">
            <div className="text-4xl mb-2">🚨</div>
            <p className="text-lg font-bold text-red-700">집합!</p>
            <div className="text-3xl mt-2 mb-1">
              {LOCATIONS.find((l) => l.value === call.location)?.emoji}
            </div>
            <p className="text-xl font-bold text-gray-900">{call.location}</p>
            {call.message && <p className="text-sm text-gray-600 mt-1">"{call.message}"</p>}
            <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-2">
              <Clock size={11} />
              <span>{format(new Date(call.calledAt), "HH:mm")} 발령</span>
              <span>· by {call.calledBy}</span>
            </div>
          </div>

          {/* 내 응답 */}
          <div className="card mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">내 응답</p>
            {myCheckin ? (
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${STATUS_CONFIG[myCheckin.status].light}`}>
                <span className="text-sm font-semibold">
                  {STATUS_CONFIG[myCheckin.status].emoji} {STATUS_CONFIG[myCheckin.status].label}
                </span>
                <button type="button" onClick={() => { setPendingStatus(null); setReason(""); }}
                  className="text-xs underline opacity-70"
                  onClickCapture={() => setPendingStatus(myCheckin.status)}>
                  변경
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(["going", "waiting", "cant"] as Status[]).map((s) => (
                  <button key={s} type="button"
                    onClick={() => s === "going" ? submitCheckin("going") : setPendingStatus(s)}
                    className={`py-2.5 rounded-xl text-xs font-semibold ${STATUS_CONFIG[s].color}`}>
                    {STATUS_CONFIG[s].emoji}<br />{STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}

            {/* 사유 입력 */}
            {pendingStatus && pendingStatus !== "going" && (
              <div className="mt-3 space-y-2">
                <input type="text"
                  placeholder={`사유 입력 (선택)`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitCheckin(pendingStatus, reason); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => submitCheckin(pendingStatus, reason)}
                    disabled={saving}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${pendingStatus === "waiting" ? "bg-yellow-400" : "bg-red-400"}`}>
                    {STATUS_CONFIG[pendingStatus].emoji} {STATUS_CONFIG[pendingStatus].label}
                  </button>
                  <button type="button" onClick={() => { setPendingStatus(null); setReason(""); }}
                    className="flex-1 py-2 rounded-xl text-sm bg-gray-100 text-gray-600">취소</button>
                </div>
              </div>
            )}
          </div>

          {/* 참석 현황 */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">
              참석 현황 <span className="text-blue-600">{checkins.length}명 응답</span>
            </h2>

            {checkins.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">아직 아무도 없어요...</p>
            )}

            {(["going", "waiting", "cant"] as Status[]).map((s) => grouped[s].length > 0 && (
              <div key={s}>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  {STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label} ({grouped[s].length}명)
                </p>
                <div className="space-y-2">
                  {grouped[s].map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Avatar imageUrl={c.imageUrl} name={c.name} size={30} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800">{c.name}</span>
                        {c.reason && (
                          <p className="text-xs text-gray-400 truncate">{c.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
