"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  CheckSquare, FileText, DollarSign,
  Bell, BellOff, Download, LogOut, User,
  ChevronDown, ChevronRight,
  Briefcase, CalendarDays, Calculator,
  Link2, MessageSquareWarning, AlertTriangle, Calendar, MessageCircle,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { registerPush, unregisterPush } from "@/components/PushSubscriber";
import type { NotifType, NotifPrefs } from "@/lib/sendPush";

type NotifStatus = "granted" | "denied" | "unsupported" | "unknown";

const NOTIF_TYPES: { type: NotifType; label: string; desc: string }[] = [
  { type: "gather",  label: "집합 발령",  desc: "집합·재알림 알림" },
  { type: "checkin", label: "체크인 응답", desc: "팀원 응답 알림" },
  { type: "chat",    label: "채팅",       desc: "집합 채팅 메시지" },
  { type: "board",   label: "게시판",     desc: "새 글 등록 알림" },
  { type: "dm",      label: "1:1 메시지", desc: "다이렉트 메시지 알림" },
];

/* 그리드 아이템 (2열) */
const TEAM_GRID = [
  { href: "/dm",          icon: MessageCircle,        label: "메시지",    color: "text-indigo-500", bg: "bg-indigo-50" },
  { href: "/notice",      icon: AlertTriangle,        label: "팀 공지",   color: "text-orange-500", bg: "bg-orange-50" },
  { href: "/birthday",    icon: Calendar,             label: "생일 달력", color: "text-pink-500",   bg: "bg-pink-50"   },
  { href: "/links",       icon: Link2,                label: "팀 링크",   color: "text-blue-500",   bg: "bg-blue-50"   },
  { href: "/suggestions", icon: MessageSquareWarning, label: "건의함",    color: "text-purple-500", bg: "bg-purple-50" },
];

const MY_GRID = [
  { href: "/todos",    icon: CheckSquare, label: "할 일",    color: "text-blue-500",    bg: "bg-blue-50",    countKey: "todos" },
  { href: "/notes",    icon: FileText,    label: "메모",     color: "text-violet-500",  bg: "bg-violet-50",  countKey: "notes" },
  { href: "/expenses", icon: DollarSign,  label: "경비",     color: "text-emerald-500", bg: "bg-emerald-50", countKey: "expenses" },
];

const JOB_GRID = [
  { href: "/interviews", icon: Briefcase,    label: "면접 일정",    color: "text-blue-500",    bg: "bg-blue-50" },
  { href: "/dday",       icon: CalendarDays, label: "D-day",        color: "text-purple-500",  bg: "bg-purple-50" },
  { href: "/severance",  icon: Calculator,   label: "퇴직금 계산", color: "text-emerald-500", bg: "bg-emerald-50" },
];

function GridSection({ title, items, counts, mounted }: {
  title: string;
  items: { href: string; icon: React.ElementType; label: string; color: string; bg: string; countKey?: string }[];
  counts?: Record<string, number>;
  mounted?: boolean;
}) {
  return (
    <section>
      <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const count = mounted && item.countKey && counts ? (counts[item.countKey] ?? 0) : 0;
          return (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-4 gap-1.5 active:bg-gray-50 relative">
              {count > 0 && (
                <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.bg}`}>
                <Icon size={20} className={item.color} />
              </div>
              <p className="text-[12px] font-semibold text-gray-700 text-center leading-tight">{item.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function MorePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotifStatus>("unknown");
  const [notifLoading, setNotifLoading] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>({ gather: true, checkin: true, chat: true, board: true, dm: true });
  const [prefLoading, setPrefLoading] = useState<NotifType | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];

  useEffect(() => {
    try {
      const ym = new Date().toISOString().slice(0, 7);
      const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
      const todos    = JSON.parse(localStorage.getItem("todos")    || "[]");
      const notes    = JSON.parse(localStorage.getItem("notes")    || "[]");
      setCounts({
        expenses: expenses.filter((e: { date: string }) => e.date.startsWith(ym)).length,
        todos:    todos.filter((t: { completed: boolean }) => !t.completed).length,
        notes:    notes.length,
      });
    } catch { /* no-op */ }
    setMounted(true);

    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    const perm = Notification.permission;
    setNotifStatus(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "unknown");

    if (perm === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        const ep = sub.endpoint;
        setPushEndpoint(ep);
        try {
          const res = await fetch(`/api/notif-prefs?endpoint=${encodeURIComponent(ep)}`);
          const data = await res.json();
          setPrefs(data.prefs);
        } catch { /* no-op */ }
      });
    }
  }, []);

  const toggleNotif = async () => {
    if (notifLoading || notifStatus === "denied" || notifStatus === "unsupported") return;
    setNotifLoading(true);
    try {
      if (notifStatus === "granted") {
        await unregisterPush();
        setNotifStatus("unknown");
        setPushEndpoint(null);
      } else {
        const r = await registerPush();
        setNotifStatus(r);
        if (r === "granted" && "serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            setPushEndpoint(sub.endpoint);
            const res = await fetch(`/api/notif-prefs?endpoint=${encodeURIComponent(sub.endpoint)}`);
            const data = await res.json();
            setPrefs(data.prefs);
          }
        }
      }
    } finally { setNotifLoading(false); }
  };

  const togglePref = async (type: NotifType) => {
    if (!pushEndpoint || prefLoading) return;
    setPrefLoading(type);
    const newVal = !prefs[type];
    try {
      await fetch("/api/notif-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: pushEndpoint, type, value: newVal }),
      });
      setPrefs((p) => ({ ...p, [type]: newVal }));
    } finally { setPrefLoading(null); }
  };

  const handleExport = () => {
    try {
      const data = {
        todos: localStorage.getItem("todos"),
        notes: localStorage.getItem("notes"),
        expenses: localStorage.getItem("expenses"),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `work-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert("내보내기 실패"); }
  };

  if (!isLoaded) return null;

  const notifBadge = {
    granted:     { label: "ON",    cls: "bg-blue-500 text-white" },
    unknown:     { label: "OFF",   cls: "bg-gray-200 text-gray-500" },
    denied:      { label: "차단됨", cls: "bg-red-100 text-red-500" },
    unsupported: { label: "미지원", cls: "bg-gray-100 text-gray-400" },
  }[notifStatus];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ── 프로필 헤더 ── */}
      <div className="bg-white px-5 pt-14 pb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {user?.imageUrl ? (
              <Image src={user.imageUrl} alt="프로필" width={60} height={60}
                className="rounded-full object-cover ring-2 ring-gray-100" />
            ) : (
              <div className="w-15 h-15 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={26} className="text-gray-400" />
              </div>
            )}
            <Link href="/profile"
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
              <ChevronDown size={12} className="text-white rotate-[-90deg]" />
            </Link>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-bold text-gray-900 truncate">{myName}</p>
            <p className="text-[12px] text-gray-400 truncate">{email}</p>
            <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {admin ? "👑 관리자" : "팀 멤버"}
            </span>
          </div>
          <button type="button" onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex flex-col items-center gap-1 text-gray-400">
            <LogOut size={18} />
            <span className="text-[10px]">로그아웃</span>
          </button>
        </div>
        <Link href="/profile"
          className="block text-center text-[14px] font-semibold text-blue-600 py-2.5 bg-blue-50 rounded-2xl">
          프로필 편집
        </Link>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* ── 팀 공유 ── */}
        <GridSection title="팀 공유" items={TEAM_GRID} />

        {/* ── 나의 도구 ── */}
        <GridSection title="나의 도구" items={MY_GRID} counts={counts} mounted={mounted} />

        {/* ── 이직 준비 ── */}
        <GridSection title="이직 준비 🤫" items={JOB_GRID} />

        {/* ── 설정 ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">설정</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button type="button" onClick={toggleNotif}
              disabled={notifLoading || notifStatus === "denied" || notifStatus === "unsupported"}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left disabled:cursor-default border-b border-gray-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notifStatus === "granted" ? "bg-blue-500" : "bg-gray-100"}`}>
                {notifStatus === "granted" ? <Bell size={20} className="text-white" /> : <BellOff size={20} className="text-gray-400" />}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-900">푸시 알림</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {notifStatus === "denied"      ? "브라우저 설정에서 알림 허용 필요" :
                   notifStatus === "unsupported" ? "홈 화면 추가 후 사용 가능" :
                   notifStatus === "granted"     ? "알림 켜짐 · 항목별 설정 가능" :
                   "탭해서 알림 켜기"}
                </p>
              </div>
              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${notifBadge.cls}`}>
                {notifLoading ? "..." : notifBadge.label}
              </span>
            </button>

            {/* 항목별 알림 토글 (알림 ON일 때만 표시) */}
            {notifStatus === "granted" && pushEndpoint && NOTIF_TYPES.map(({ type, label, desc }, i) => (
              <button
                key={type}
                type="button"
                onClick={() => togglePref(type)}
                disabled={prefLoading === type}
                className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left ${i < NOTIF_TYPES.length - 1 ? "border-b border-gray-50" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className={prefs[type] ? "text-blue-500" : "text-gray-300"} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-gray-800">{label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                </div>
                <div className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${prefs[type] ? "bg-blue-500" : "bg-gray-200"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${prefs[type] ? "left-5" : "left-0.5"}`} />
                </div>
              </button>
            ))}
            <button type="button" onClick={handleExport}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Download size={19} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-900">데이터 백업</p>
                <p className="text-[12px] text-gray-400 mt-0.5">할 일·메모·경비 JSON 다운로드</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>
        </section>

        {/* ── 관리자 ── */}
        {admin && (
          <section>
            <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">관리자</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <Link href="/admin"
                className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-[18px]">👑</span>
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-gray-900">멤버 관리</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">가입 멤버 확인 · 퇴장 처리</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            </div>
          </section>
        )}

        {/* ── 앱 설치 ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">앱으로 설치</p>
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2.5">
            {[
              { label: "iPhone",  desc: "Safari → 공유(□↑) → 홈 화면에 추가" },
              { label: "Android", desc: "Chrome → ⋮ → 홈 화면에 추가" },
              { label: "PC",      desc: "Chrome 주소창 ⊕ → 앱으로 설치" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-[12px] font-bold text-blue-500 w-14 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-[12px] text-gray-500 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-gray-300 text-center pb-2">Work Manager v2.2 · 생산품질팀</p>
      </div>
    </div>
  );
}
