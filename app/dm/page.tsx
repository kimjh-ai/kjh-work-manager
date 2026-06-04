"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, ClipboardList } from "lucide-react";
import Avatar from "@/components/Avatar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const TOPICS = [
  { id: "general", name: "전체",   emoji: "💬" },
  { id: "work",    name: "업무",   emoji: "💼" },
  { id: "daily",   name: "일상",   emoji: "☀️" },
  { id: "lunch",   name: "점심",   emoji: "🍽️" },
];

interface ChatMsg {
  id: string;
  from: string;
  fromImage: string | null;
  text: string;
  createdAt: string;
}

interface InboxEntry {
  roomId: string;
  partnerName: string;
  partnerImage: string | null;
  lastMsg: string;
  lastAt: string;
  unread: number;
}

type ChatTarget =
  | { type: "topic"; topicId: string; name: string; emoji: string }
  | { type: "dm"; roomId: string; partnerName: string; partnerImage: string | null };

function msgTime(iso: string) {
  return format(new Date(iso), "a h:mm", { locale: ko });
}

export default function DmPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
  const myImage = user?.imageUrl ?? null;

  const [view, setView] = useState<"sidebar" | "chat">("sidebar");
  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inbox, setInbox] = useState<InboxEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [onlineNames, setOnlineNames] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoaded && !user) router.replace("/sign-in");
  }, [isLoaded, user, router]);

  useEffect(() => {
    fetch("/api/profiles").then(r => r.json()).then(d => setProfiles(d.profiles ?? {})).catch(() => {});
  }, []);

  // 온라인 상태 폴링
  useEffect(() => {
    const load = () => {
      fetch("/api/online").then(r => r.json()).then(d => {
        setOnlineNames(new Set((d.users ?? []).map((u: { name: string }) => u.name)));
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const loadInbox = useCallback(() => {
    if (!myName) return;
    fetch(`/api/dm/inbox?user=${encodeURIComponent(myName)}`)
      .then(r => r.json()).then(d => setInbox(d.inbox ?? [])).catch(() => {});
  }, [myName]);

  useEffect(() => {
    if (!myName) return;
    loadInbox();
    const t = setInterval(loadInbox, 5000);
    return () => clearInterval(t);
  }, [loadInbox]);

  const loadMessages = useCallback(async () => {
    if (!target) return;
    const url = target.type === "topic"
      ? `/api/topic?topicId=${encodeURIComponent(target.topicId)}`
      : `/api/dm?roomId=${encodeURIComponent(target.roomId)}`;
    try {
      const d = await fetch(url).then(r => r.json());
      setMessages(d.messages ?? []);
    } catch { /* no-op */ }
  }, [target]);

  useEffect(() => {
    if (view !== "chat" || !target) return;
    loadMessages();
    const t = setInterval(loadMessages, 3000);
    return () => clearInterval(t);
  }, [view, target, loadMessages]);

  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, view]);

  useEffect(() => {
    if (view === "chat" && target?.type === "dm" && myName) {
      fetch("/api/dm/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: myName, roomId: target.roomId }),
      }).catch(() => {});
      setInbox(prev => prev.map(e => e.roomId === target.roomId ? { ...e, unread: 0 } : e));
    }
  }, [view, target, myName]);

  function openTopic(topic: typeof TOPICS[0]) {
    setTarget({ type: "topic", topicId: topic.id, name: topic.name, emoji: topic.emoji });
    setMessages([]);
    setInput("");
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function openDm(partnerName: string, partnerImage: string | null) {
    const roomId = [myName, partnerName].sort().join("|||");
    setTarget({ type: "dm", roomId, partnerName, partnerImage });
    setMessages([]);
    setInput("");
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendMessage() {
    if (!input.trim() || !target || !myName || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    setMessages(prev => [...prev, {
      id: `opt_${Date.now()}`,
      from: myName, fromImage: myImage,
      text, createdAt: new Date().toISOString(),
    }]);

    try {
      if (target.type === "topic") {
        await fetch("/api/topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId: target.topicId, name: myName, imageUrl: myImage, text }),
        });
      } else {
        await fetch("/api/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: myName, fromImage: myImage, to: target.partnerName, toImage: target.partnerImage, text }),
        });
      }
      await loadMessages();
    } catch { /* no-op */ } finally {
      setSending(false);
    }
  }

  if (!isLoaded || !user) return null;

  const userList = Object.entries(profiles)
    .filter(([name]) => name !== myName)
    .map(([name, imageUrl]) => ({ name, imageUrl }));

  const totalUnread = inbox.reduce((sum, e) => sum + (e.unread ?? 0), 0);

  // ── SIDEBAR ─────────────────────────────────────────────────────────────
  if (view === "sidebar") {
    return (
      <div className="min-h-screen pb-20" style={{ background: "#1a1d2e" }}>
        {/* Header */}
        <div className="px-5 pt-14 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-[20px] font-bold text-white">메시지</h1>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-bold rounded-full px-2 py-0.5">{totalUnread}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {myImage
              ? <img src={myImage} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full bg-white/20" />
            }
            <span className="text-[13px] text-white/50">{myName}</span>
          </div>
        </div>

        <div className="px-3 pt-5 pb-4 space-y-7">
          {/* 토픽 + 게시판 */}
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              토픽
            </p>
            <div className="space-y-0.5">
              {TOPICS.map((topic) => (
                <button key={topic.id} onClick={() => openTopic(topic)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors active:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.65)" }}>
                  <span className="text-[17px] w-6 text-center">{topic.emoji}</span>
                  <span className="text-[14px] font-medium"># {topic.name}</span>
                </button>
              ))}
              {/* 게시판 바로가기 */}
              <Link href="/board"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors active:bg-white/10"
                style={{ color: "rgba(255,255,255,0.65)" }}>
                <ClipboardList size={17} className="w-6 flex-shrink-0" />
                <span className="text-[14px] font-medium">게시판</span>
              </Link>
            </div>
          </div>

          {/* 채팅 (1:1) */}
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              채팅
            </p>
            <div className="space-y-0.5">
              {userList.length === 0 ? (
                <p className="text-[13px] px-3 py-6 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                  아직 등록된 팀원이 없어요
                </p>
              ) : userList.map(({ name, imageUrl }) => {
                const entry = inbox.find(e => e.partnerName === name);
                const unread = entry?.unread ?? 0;
                const isOnline = onlineNames.has(name);
                return (
                  <button key={name} onClick={() => openDm(name, imageUrl)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors active:bg-white/10">
                    <div className="relative flex-shrink-0">
                      <Avatar imageUrl={imageUrl} name={name} size={36} />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#1a1d2e]"
                        style={{ background: isOnline ? "#4ade80" : "#6b7280" }} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[14px] font-medium truncate"
                        style={{ color: unread > 0 ? "#ffffff" : "rgba(255,255,255,0.65)", fontWeight: unread > 0 ? 600 : 400 }}>
                        {name}
                      </p>
                      {entry?.lastMsg && (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {entry.lastMsg}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CHAT ─────────────────────────────────────────────────────────────────
  const chatLabel = target?.type === "topic"
    ? `${target.emoji} ${target.name}`
    : target?.partnerName ?? "";

  return (
    <div className="flex flex-col h-screen" style={{ background: "#f0f2f5" }}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-12 flex-shrink-0"
        style={{ background: "#1a1d2e", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button type="button" aria-label="뒤로가기" onClick={() => { setView("sidebar"); loadInbox(); }} className="p-1.5 -ml-1.5 rounded-xl active:bg-white/10">
          <ArrowLeft size={20} className="text-white" />
        </button>
        {target?.type === "dm" && (
          <Avatar imageUrl={target.partnerImage} name={target.partnerName} size={32} />
        )}
        {target?.type === "topic" && (
          <span className="text-[20px]">{target.emoji}</span>
        )}
        <p className="text-[16px] font-bold text-white flex-1 truncate">
          {target?.type === "topic" ? `# ${target.name}` : chatLabel}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-gray-400 py-16">
            {target?.type === "topic" ? "토픽에 첫 메시지를 남겨보세요!" : `${chatLabel}님과 대화를 시작해보세요 👋`}
          </p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.from === myName;
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const showName = !isMe && target?.type === "topic" && prevMsg?.from !== msg.from;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {!isMe && (
                <Avatar imageUrl={msg.fromImage} name={msg.from} size={30} />
              )}
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {showName && (
                  <p className="text-[11px] text-gray-500 px-1 mb-0.5">{msg.from}</p>
                )}
                <div className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed break-words ${
                  isMe
                    ? "text-white rounded-br-sm"
                    : "bg-white text-gray-900 shadow-sm rounded-bl-sm"
                }`} style={isMe ? { background: "#1a1d2e" } : {}}>
                  {msg.text}
                </div>
                <p className="text-[10px] text-gray-400 px-1">{msgTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe flex items-center gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={target?.type === "topic" ? `# ${target.name}에 메시지 보내기` : `${chatLabel}에게 메시지 보내기`}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-[14px] outline-none placeholder:text-gray-400"
        />
        <button type="button" aria-label="전송" onClick={sendMessage} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-30 active:scale-95"
          style={{ background: "#1a1d2e" }}>
          <Send size={15} className="text-white" />
        </button>
      </div>
    </div>
  );
}
