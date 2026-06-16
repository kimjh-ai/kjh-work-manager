"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, ClipboardList, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { sounds } from "@/lib/sounds";

const TOPICS = [
  { id: "teamchat", name: "팀채팅", emoji: "🗣️" },
  { id: "general",  name: "전체",   emoji: "💬" },
  { id: "work",     name: "업무",   emoji: "💼" },
  { id: "daily",    name: "일상",   emoji: "☀️" },
  { id: "lunch",    name: "점심",   emoji: "🍽️" },
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

function renderHighlightedInput(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-blue-600 font-medium">{part}</span>
      : <span key={i} className="text-gray-900">{part}</span>
  );
}

function renderMentionText(text: string, knownUsers: string[], isMe: boolean): React.ReactNode {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && knownUsers.includes(part.slice(1))) {
      return (
        <span key={i} className={isMe
          ? "font-bold bg-white/25 rounded px-0.5"
          : "font-bold text-indigo-600"
        }>
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function getUnread(
  msg: ChatMsg,
  reads: Record<string, string>,
  target: ChatTarget,
  profiles: Record<string, string>
): number {
  if (target.type === "dm") {
    const pr = reads[target.partnerName];
    return !pr || pr < msg.createdAt ? 1 : 0;
  }
  const others = Object.keys(profiles).filter(n => n !== msg.from);
  return others.filter(n => !reads[n] || reads[n] < msg.createdAt).length;
}

export default function DmPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
  const myImage = user?.imageUrl ?? null;

  const [view, setView] = useState<"sidebar" | "chat">("sidebar");
  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [inbox, setInbox] = useState<InboxEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [onlineNames, setOnlineNames] = useState<Set<string>>(new Set());
  const [topicUnread, setTopicUnread] = useState<Record<string, number>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef<string>("");

  useEffect(() => {
    if (isLoaded && !user) router.replace("/sign-in");
  }, [isLoaded, user, router]);

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {};
        (d.users ?? []).forEach((u: { name: string; imageUrl: string | null }) => {
          if (u.name) map[u.name] = u.imageUrl ?? "";
        });
        setProfiles(map);
      })
      .catch(() => {});
  }, []);

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

  const loadTopicUnread = useCallback(() => {
    if (!myName) return;
    fetch(`/api/topic?user=${encodeURIComponent(myName)}`)
      .then(r => r.json()).then(d => setTopicUnread(d.counts ?? {})).catch(() => {});
  }, [myName]);

  useEffect(() => {
    if (!myName) return;
    loadTopicUnread();
    const t = setInterval(loadTopicUnread, 5000);
    return () => clearInterval(t);
  }, [loadTopicUnread]);

  // 읽음 처리 - 채팅방 열 때 + 3초마다 갱신
  const markRead = useCallback(() => {
    if (!target || !myName) return;
    const readAt = new Date().toISOString();
    setReads(prev => ({ ...prev, [myName]: readAt }));
    if (target.type === "topic") {
      setTopicUnread(prev => ({ ...prev, [target.topicId]: 0 }));
    }
    if (target.type === "topic" && target.topicId === "teamchat") {
      fetch("/api/team-chat", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: myName, readAt }) }).catch(() => {});
    } else if (target.type === "topic") {
      fetch("/api/topic", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: target.topicId, user: myName, readAt }) }).catch(() => {});
    } else {
      fetch("/api/dm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: target.roomId, user: myName, readAt }) }).catch(() => {});
    }
  }, [target, myName]);

  const loadMessages = useCallback(async () => {
    if (!target) return;
    try {
      let d: { messages: ChatMsg[]; reads: Record<string, string> };
      if (target.type === "topic" && target.topicId === "teamchat") {
        const raw = await fetch("/api/team-chat").then(r => r.json());
        d = {
          messages: (raw.messages ?? []).map((m: { id: string; name: string; imageUrl: string | null; text: string; createdAt: string }) => ({
            id: m.id, from: m.name, fromImage: m.imageUrl, text: m.text, createdAt: m.createdAt,
          })),
          reads: raw.reads ?? {},
        };
      } else {
        const url = target.type === "topic"
          ? `/api/topic?topicId=${encodeURIComponent(target.topicId)}`
          : `/api/dm?roomId=${encodeURIComponent(target.roomId)}`;
        d = await fetch(url).then(r => r.json());
      }
      const msgs: ChatMsg[] = d.messages ?? [];
      // 새 메시지가 내가 아닌 사람 것이면 수신음
      if (msgs.length > 0) {
        const lastId = msgs[msgs.length - 1].id;
        const lastFrom = msgs[msgs.length - 1].from;
        if (lastId !== lastMsgIdRef.current && lastFrom !== myName && lastMsgIdRef.current !== "") {
          sounds.receive();
        }
        lastMsgIdRef.current = lastId;
      }
      setMessages(msgs);
      setReads(prev => ({ ...d.reads, [myName]: prev[myName] ?? d.reads[myName] ?? "" }));
    } catch { /* no-op */ }
  }, [target, myName]);

  useEffect(() => {
    if (view !== "chat" || !target) return;
    loadMessages();
    markRead();
    const t = setInterval(() => { loadMessages(); markRead(); }, 3000);
    return () => clearInterval(t);
  }, [view, target, loadMessages, markRead]);

  useEffect(() => {
    if (view === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, view]);

  useEffect(() => {
    if (view === "chat" && target?.type === "dm" && myName) {
      fetch("/api/dm/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: myName, roomId: target.roomId }) }).catch(() => {});
      setInbox(prev => prev.map(e => e.roomId === target.roomId ? { ...e, unread: 0 } : e));
    }
  }, [view, target, myName]);

  function openTopic(topic: typeof TOPICS[0]) {
    setTarget({ type: "topic", topicId: topic.id, name: topic.name, emoji: topic.emoji });
    setMessages([]); setReads({}); setInput("");
    lastMsgIdRef.current = "";
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function openDm(partnerName: string, partnerImage: string | null) {
    const roomId = [myName, partnerName].sort().join("|||");
    setTarget({ type: "dm", roomId, partnerName, partnerImage });
    setMessages([]); setReads({}); setInput("");
    lastMsgIdRef.current = "";
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    setMentionIdx(0);
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0) {
      const after = val.slice(atIdx + 1);
      if (!after.includes(" ")) {
        const partial = after.toLowerCase();
        const all = Object.keys(profiles).filter(n => n !== myName);
        setMentionSuggestions(partial === "" ? all : all.filter(n => n.toLowerCase().startsWith(partial)));
        return;
      }
    }
    setMentionSuggestions([]);
  }

  function selectMention(name: string) {
    const atIdx = input.lastIndexOf("@");
    const before = atIdx >= 0 ? input.slice(0, atIdx) : input;
    setInput(`${before}@${name} `);
    setMentionSuggestions([]);
    setMentionIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const suggestions = mentionSuggestions.slice(0, 6);
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
        if (suggestions[mentionIdx]) selectMention(suggestions[mentionIdx]);
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
      sendMessage();
    }
  }

  async function sendMessage() {
    if (!input.trim() || !target || !myName || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    sounds.send();
    const now = new Date().toISOString();
    setMessages(prev => [...prev, { id: `opt_${Date.now()}`, from: myName, fromImage: myImage, text, createdAt: now }]);
    setReads(prev => ({ ...prev, [myName]: now }));
    try {
      if (target.type === "topic" && target.topicId === "teamchat") {
        await fetch("/api/team-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: myName, imageUrl: myImage, text }) });
      } else if (target.type === "topic") {
        await fetch("/api/topic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: target.topicId, name: myName, imageUrl: myImage, text }) });
      } else {
        await fetch("/api/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: myName, fromImage: myImage, to: target.partnerName, toImage: target.partnerImage, text }) });
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

  const allUserNames = [myName, ...userList.map(u => u.name)];

  const totalUnread = inbox.reduce((sum, e) => sum + (e.unread ?? 0), 0);

  // ── 프로필 사진 모달 ──────────────────────────────────────────────────────
  const imageModalEl = imageModal ? (
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center"
      onClick={() => setImageModal(null)}>
      <button type="button" aria-label="닫기" className="absolute top-12 right-4 text-white/70 active:text-white">
        <X size={28} />
      </button>
      <img src={imageModal} alt="프로필" className="max-w-[85vw] max-h-[85vh] rounded-3xl object-contain shadow-2xl" />
    </div>
  ) : null;

  // ── SIDEBAR ─────────────────────────────────────────────────────────────
  if (view === "sidebar") {
    return (
      <>
        {imageModalEl}
        <div className="min-h-screen pb-20" style={{ background: "#1a1d2e" }}>
          <div className="px-5 pt-14 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-[20px] font-bold text-white">메시지</h1>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-bold rounded-full px-2 py-0.5">{totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={() => myImage && setImageModal(myImage)} className="flex-shrink-0">
                {myImage
                  ? <img src={myImage} alt="" className="w-7 h-7 rounded-full object-cover active:opacity-80" />
                  : <div className="w-7 h-7 rounded-full bg-white/20" />
                }
              </button>
              <span className="text-[13px] text-white/50">{myName}</span>
            </div>
          </div>

          <div className="px-3 pt-5 pb-4 space-y-7">
            {/* 토픽 */}
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>토픽</p>
              <div className="space-y-0.5">
                {TOPICS.map((topic) => {
                  const tc = topicUnread[topic.id] ?? 0;
                  return (
                    <button key={topic.id} type="button" onClick={() => openTopic(topic)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors active:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.65)" }}>
                      <span className="text-[17px] w-6 text-center">{topic.emoji}</span>
                      <span className="text-[14px] font-medium flex-1 text-left"># {topic.name}</span>
                      {tc > 0 && (
                        <span className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {tc > 99 ? "99+" : tc}
                        </span>
                      )}
                    </button>
                  );
                })}
                <Link href="/board"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors active:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.65)" }}>
                  <ClipboardList size={17} className="w-6 flex-shrink-0" />
                  <span className="text-[14px] font-medium">게시판</span>
                </Link>
              </div>
            </div>

            {/* 1:1 채팅 */}
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>채팅</p>
              <div className="space-y-0.5">
                {userList.length === 0 ? (
                  <p className="text-[13px] px-3 py-6 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>아직 등록된 팀원이 없어요</p>
                ) : userList.map(({ name, imageUrl }) => {
                  const entry = inbox.find(e => e.partnerName === name);
                  const unread = entry?.unread ?? 0;
                  const isOnline = onlineNames.has(name);
                  return (
                    <div key={name} className="flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-white/10">
                      {/* 프로필 사진 - 탭하면 크게 보기 */}
                      <button type="button" aria-label={`${name} 프로필 사진`} onClick={() => imageUrl && setImageModal(imageUrl)} className="relative flex-shrink-0">
                        <Avatar imageUrl={imageUrl} name={name} size={36} />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#1a1d2e]"
                          style={{ background: isOnline ? "#4ade80" : "#6b7280" }} />
                      </button>
                      {/* 이름/마지막 메시지 - 탭하면 채팅 열기 */}
                      <button type="button" onClick={() => openDm(name, imageUrl)} className="flex-1 min-w-0 text-left">
                        <p className="text-[14px] truncate"
                          style={{ color: unread > 0 ? "#ffffff" : "rgba(255,255,255,0.65)", fontWeight: unread > 0 ? 600 : 400 }}>
                          {name}
                        </p>
                        {entry?.lastMsg && (
                          <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{entry.lastMsg}</p>
                        )}
                      </button>
                      {unread > 0 && (
                        <span className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── CHAT ─────────────────────────────────────────────────────────────────
  const chatLabel = target?.type === "topic" ? `${target.emoji} ${target.name}` : target?.partnerName ?? "";

  return (
    <>
      {imageModalEl}
      <div className="flex flex-col h-screen" style={{ background: "#f0f2f5" }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-12 flex-shrink-0"
          style={{ background: "#1a1d2e", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button type="button" aria-label="뒤로가기" onClick={() => { setView("sidebar"); loadInbox(); }}
            className="p-1.5 -ml-1.5 rounded-xl active:bg-white/10">
            <ArrowLeft size={20} className="text-white" />
          </button>
          {target?.type === "dm" && (
            <button type="button" aria-label={`${target.partnerName} 프로필 사진`} onClick={() => target.partnerImage && setImageModal(target.partnerImage)} className="flex-shrink-0">
              <Avatar imageUrl={target.partnerImage} name={target.partnerName} size={32} />
            </button>
          )}
          {target?.type === "topic" && <span className="text-[20px]">{target.emoji}</span>}
          <p className="text-[16px] font-bold text-white flex-1 truncate">
            {target?.type === "topic" ? `# ${target.name}` : chatLabel}
          </p>
        </div>

        {/* 메시지 목록 */}
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
            const unread = isMe && target ? getUnread(msg, reads, target, profiles) : -1;

            const msgDateStr = format(new Date(msg.createdAt), "yyyy-MM-dd");
            const prevDateStr = prevMsg ? format(new Date(prevMsg.createdAt), "yyyy-MM-dd") : null;
            const showDateDivider = msgDateStr !== prevDateStr;

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 font-medium flex-shrink-0 px-2">
                      {format(new Date(msg.createdAt), "yyyy년 M월 d일 EEEE", { locale: ko })}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
              <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {/* 상대방 아바타 - 탭하면 사진 보기 */}
                {!isMe && (
                  <button type="button" aria-label={`${msg.from} 프로필 사진`} onClick={() => msg.fromImage && setImageModal(msg.fromImage)} className="flex-shrink-0 self-end">
                    <Avatar imageUrl={msg.fromImage} name={msg.from} size={30} />
                  </button>
                )}

                {/* 버블 */}
                <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                  {showName && <p className="text-[11px] text-gray-500 px-1 mb-0.5">{msg.from}</p>}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed break-words ${
                    isMe ? "text-white rounded-br-sm" : "bg-white text-gray-900 shadow-sm rounded-bl-sm"
                  }`} style={isMe ? { background: "#1a1d2e" } : {}}>
                    {renderMentionText(msg.text, allUserNames, isMe)}
                  </div>
                  <div className={`flex items-center gap-1.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                    <p className="text-[10px] text-gray-400">{msgTime(msg.createdAt)}</p>
                    {/* 읽음 표시: 내 메시지만 */}
                    {isMe && unread === 0 && (
                      <span className="text-[10px] font-semibold" style={{ color: "#7c8cf8" }}>읽음</span>
                    )}
                    {isMe && unread > 0 && (
                      <span className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>{unread}</span>
                    )}
                  </div>
                </div>
              </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 멘션 자동완성 드롭다운 */}
        {mentionSuggestions.length > 0 && (
          <div className="bg-white border-t border-gray-100 flex-shrink-0 max-h-[180px] overflow-y-auto">
            {mentionSuggestions.slice(0, 6).map((name, idx) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(name); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${idx === mentionIdx ? "bg-blue-50" : "hover:bg-gray-50 active:bg-gray-100"}`}
              >
                <Avatar imageUrl={profiles[name] ?? null} name={name} size={28} />
                <span className="text-[14px] font-semibold text-blue-600">@{name}</span>
              </button>
            ))}
          </div>
        )}

        {/* 입력창 */}
        <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <div className="absolute inset-0 bg-gray-100 rounded-2xl pointer-events-none" />
            {!isComposing && (
              <div className="absolute inset-0 flex items-center px-4 text-[14px] pointer-events-none overflow-hidden">
                {input
                  ? renderHighlightedInput(input)
                  : <span className="text-gray-400">{target?.type === "topic" ? `# ${target.name}에 메시지 보내기` : `${chatLabel}에게 메시지 보내기`}</span>
                }
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              aria-label="메시지 입력"
              className="relative w-full bg-transparent rounded-2xl px-4 py-2.5 text-[14px] outline-none"
              style={{ color: isComposing ? "#111827" : "transparent", caretColor: "#374151" }}
            />
          </div>
          <button type="button" aria-label="전송" onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-30 active:scale-95"
            style={{ background: "#1a1d2e" }}>
            <Send size={15} className="text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
