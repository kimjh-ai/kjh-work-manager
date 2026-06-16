"use client";

import React, { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Bell, X, BellOff, BellRing, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { format } from "date-fns";
import Avatar from "@/components/Avatar";
import { registerPush } from "@/components/PushSubscriber";
import MoodCard from "@/components/today/MoodCard";
import CoffeeRunCard from "@/components/today/CoffeeRunCard";
import VoteCard from "@/components/today/VoteCard";
import DutyPickerCard from "@/components/today/DutyPickerCard";
import PraiseCard from "@/components/today/PraiseCard";

function renderHighlightedInput(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part === "@ALL") return <span key={i} className="text-orange-500 font-bold">{part}</span>;
    if (part.startsWith("@")) return <span key={i} className="text-blue-600 font-medium">{part}</span>;
    return <span key={i} className="text-gray-900">{part}</span>;
  });
}

function renderMentionText(text: string, knownUsers: string[], isMine: boolean) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part === "@ALL") {
      return <span key={i} className={isMine ? "font-bold bg-white/30 rounded px-0.5" : "font-bold text-orange-500"}>{part}</span>;
    }
    if (part.startsWith("@") && knownUsers.includes(part.slice(1))) {
      return <span key={i} className={isMine ? "font-bold bg-white/30 rounded px-0.5" : "font-bold text-blue-600"}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

type Location = "3층" | "옥상" | "편의점";
type Status = "going" | "waiting" | "cant";
type PageTab = "gather" | "today";

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

export default function GatheringPage() {
  const { user, isLoaded } = useUser();
  const [pageTab, setPageTab] = useState<PageTab>("gather");
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
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [gatherLogs, setGatherLogs] = useState<GatherLog[]>([]);
  const [gatherStats, setGatherStats] = useState({ day: 0, week: 0, month: 0 });
  const [callerStats, setCallerStats] = useState<{ name: string; count: number }[]>([]);
  const [locStats, setLocStats] = useState<{ location: string; count: number }[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [statsTab, setStatsTab] = useState<"count" | "caller" | "loc">("count");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];
  const myImage = user?.imageUrl ?? null;

  const [allUsers, setAllUsers] = useState<{ name: string; imageUrl: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => setAllUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  // 멘션 후보: Clerk에 등록된 전체 유저 (사진 유무 무관)
  const mentionCandidates = React.useMemo(() => {
    const nameMap = new Map<string, string | null>();
    allUsers.forEach(u => nameMap.set(u.name, u.imageUrl));
    nameMap.delete(myName);
    return nameMap;
  }, [allUsers, myName]);

  const allProfileNames = [myName, ...Array.from(mentionCandidates.keys())];

  function handleChatInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setChatText(val);
    setMentionIdx(0);
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0) {
      const after = val.slice(atIdx + 1);
      if (!after.includes(" ")) {
        const partial = after.toLowerCase();
        const all = ["ALL", ...Array.from(mentionCandidates.keys())];
        setMentionSuggestions(partial === "" ? all : all.filter(n => n.toLowerCase().startsWith(partial)));
        return;
      }
    }
    setMentionSuggestions([]);
  }

  function selectChatMention(name: string) {
    const atIdx = chatText.lastIndexOf("@");
    const before = atIdx >= 0 ? chatText.slice(0, atIdx) : chatText;
    setChatText(`${before}@${name} `);
    setMentionSuggestions([]);
    setMentionIdx(0);
    setTimeout(() => chatInputRef.current?.focus(), 0);
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const suggestions = mentionSuggestions.slice(0, 5);
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (suggestions[mentionIdx]) selectChatMention(suggestions[mentionIdx]);
        return;
      }
      if (e.key === "Escape") {
        setMentionSuggestions([]);
        setMentionIdx(0);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

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

  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "instant" }), 0);
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
      const el = chatContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } finally { setChatSending(false); }
  };

  const callGather = async () => {
    if (saving) return;
    setSaving(true);
    sounds.gather();
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
    try { await fetch("/api/gather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "renotify", name: myName, imageUrl: myImage }) }); }
    finally { setRenotifying(false); }
  };

  const submitCheckin = async (status: Status, r?: string) => {
    if (!call) return;
    setSaving(true);
    sounds.checkin();
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
            <div className="flex border-b border-gray-100">
              {([["count","📊 기간별"],["caller","👤 발령자"],["loc","📍 장소별"]] as ["count"|"caller"|"loc", string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setStatsTab(key)}
                  className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${statsTab === key ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-400"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
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
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
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
                {myCheckin && !isChanging && pendingStatus === null && (
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${STATUS_CONFIG[myCheckin.status].light}`}>
                    <span className="text-sm font-semibold">{STATUS_CONFIG[myCheckin.status].emoji} {STATUS_CONFIG[myCheckin.status].label}</span>
                    <button type="button" onClick={() => setIsChanging(true)}
                      className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50">변경</button>
                  </div>
                )}
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
                              {renderMentionText(msg.text, allProfileNames, isMine)}
                            </div>
                            <p className="text-[10px] text-gray-300 px-1">{format(new Date(msg.createdAt), "HH:mm")}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  {mentionSuggestions.length > 0 && (
                    <div className="border-t border-gray-100 max-h-[150px] overflow-y-auto">
                      {mentionSuggestions.slice(0, 6).map((name, idx) => (
                        <button key={name} type="button"
                          onMouseDown={(e) => { e.preventDefault(); selectChatMention(name); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0 transition-colors ${idx === mentionIdx ? "bg-blue-50" : "hover:bg-gray-50 active:bg-gray-100"}`}>
                          {name === "ALL"
                            ? <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[12px]">🔔</span>
                            : <Avatar imageUrl={mentionCandidates.get(name) ?? null} name={name} size={24} />
                          }
                          <span className={`text-[13px] font-semibold ${name === "ALL" ? "text-orange-500" : "text-blue-600"}`}>@{name}</span>
                          {name === "ALL" && <span className="text-[11px] text-gray-400 ml-auto">전체 알림</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 flex items-center gap-2 px-3 py-2.5">
                    <Avatar imageUrl={myImage} name={myName} size={28} />
                    <div className="relative flex-1">
                      <div className="absolute inset-0 bg-gray-100 rounded-2xl pointer-events-none" />
                      {!isComposing && (
                        <div className="absolute inset-0 flex items-center px-3.5 text-[14px] pointer-events-none overflow-hidden">
                          {chatText
                            ? renderHighlightedInput(chatText)
                            : <span className="text-gray-400">메시지 입력...</span>
                          }
                        </div>
                      )}
                      <input
                        ref={chatInputRef}
                        value={chatText}
                        onChange={handleChatInputChange}
                        onKeyDown={handleChatKeyDown}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        aria-label="메시지 입력"
                        className="relative w-full bg-transparent rounded-2xl px-3.5 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                        style={{ color: isComposing ? "#111827" : "transparent", caretColor: "#374151" }}
                      />
                    </div>
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
