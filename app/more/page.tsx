"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  AlertTriangle, DollarSign, Calendar,
  Download, ChevronRight, CheckSquare, FileText,
  LogOut, User, Bell, BellOff, ChevronDown,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { registerPush, unregisterPush } from "@/components/PushSubscriber";

const menuItems = [
  { href: "/todos",    icon: CheckSquare, label: "할 일",    desc: "나만의 업무 체크리스트",  color: "text-blue-500",   bg: "bg-blue-50",   countKey: "todos" },
  { href: "/notes",    icon: FileText,    label: "메모",     desc: "회의록·메모 관리",        color: "text-violet-500", bg: "bg-violet-50", countKey: "notes" },
  { href: "/expenses", icon: DollarSign,  label: "개인 경비", desc: "월별 경비 내역 기록",     color: "text-emerald-500",bg: "bg-emerald-50",countKey: "expenses" },
  { href: "/notice",   icon: AlertTriangle,label: "팀 공지", desc: "중요 공지사항 확인",       color: "text-orange-500", bg: "bg-orange-50", countKey: null },
  { href: "/birthday", icon: Calendar,    label: "생일 달력", desc: "팀원 생일 확인하기 🎂",  color: "text-pink-500",   bg: "bg-pink-50",   countKey: null },
];

type NotifStatus = "granted" | "denied" | "unsupported" | "unknown";

export default function MorePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotifStatus>("unknown");
  const [notifLoading, setNotifLoading] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];

  useEffect(() => {
    try {
      const ym = new Date().toISOString().slice(0, 7);
      const claims   = JSON.parse(localStorage.getItem("claims")   || "[]");
      const materials= JSON.parse(localStorage.getItem("materials")|| "[]");
      const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
      const todos    = JSON.parse(localStorage.getItem("todos")    || "[]");
      const notes    = JSON.parse(localStorage.getItem("notes")    || "[]");
      setCounts({
        claims:    claims.filter((c: { status: string }) => c.status !== "resolved").length,
        materials: materials.length,
        expenses:  expenses.filter((e: { date: string }) => e.date.startsWith(ym)).length,
        todos:     todos.filter((t: { completed: boolean }) => !t.completed).length,
        notes:     notes.length,
      });
    } catch { /* no-op */ }
    setMounted(true);

    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    setNotifStatus(
      Notification.permission === "granted" ? "granted" :
      Notification.permission === "denied"  ? "denied"  : "unknown"
    );
  }, []);

  const toggleNotif = async () => {
    if (notifLoading || notifStatus === "denied" || notifStatus === "unsupported") return;
    setNotifLoading(true);
    try {
      if (notifStatus === "granted") {
        await unregisterPush();
        setNotifStatus("unknown");
      } else {
        const result = await registerPush();
        setNotifStatus(result);
      }
    } finally { setNotifLoading(false); }
  };

  const handleExport = () => {
    try {
      const data = {
        todos: localStorage.getItem("todos"),
        notes: localStorage.getItem("notes"),
        expenses: localStorage.getItem("expenses"),
        claims: localStorage.getItem("claims"),
        materials: localStorage.getItem("materials"),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("내보내기 실패"); }
  };

  if (!isLoaded) return null;

  /* 알림 배지 */
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
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            {user?.imageUrl ? (
              <Image src={user.imageUrl} alt="프로필" width={64} height={64}
                className="rounded-full object-cover ring-2 ring-gray-100" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={28} className="text-gray-400" />
              </div>
            )}
            <Link href="/profile"
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow">
              <ChevronDown size={14} className="text-white rotate-[-90deg]" />
            </Link>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[19px] font-bold text-gray-900 truncate">{myName}</p>
            <p className="text-[13px] text-gray-400 truncate mt-0.5">{email}</p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {admin ? "👑 관리자" : "팀 멤버"}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Link href="/profile"
            className="flex-1 text-center text-[14px] font-semibold text-blue-600 py-2.5 bg-blue-50 rounded-2xl">
            프로필 편집
          </Link>
          <button type="button" onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex-1 flex items-center justify-center gap-1.5 text-[14px] font-semibold text-gray-500 bg-gray-50 rounded-2xl py-2.5">
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* ── 설정 ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">설정</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* 알림 */}
            <button type="button" onClick={toggleNotif}
              disabled={notifLoading || notifStatus === "denied" || notifStatus === "unsupported"}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left disabled:cursor-default">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                notifStatus === "granted" ? "bg-blue-500" : "bg-gray-100"
              }`}>
                {notifStatus === "granted"
                  ? <Bell size={20} className="text-white" />
                  : <BellOff size={20} className="text-gray-400" />}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-900">알림</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {notifStatus === "denied"      ? "브라우저 설정에서 알림을 허용해주세요" :
                   notifStatus === "unsupported" ? "이 브라우저는 알림을 지원하지 않아요 (홈 화면에 추가 후 사용)" :
                   notifStatus === "granted"     ? "집합·게시판·투표 알림이 켜져 있어요" :
                   "탭해서 집합·게시판 알림을 켜보세요"}
                </p>
              </div>
              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${notifBadge.cls}`}>
                {notifLoading ? "..." : notifBadge.label}
              </span>
            </button>
          </div>
        </section>

        {/* ── 나의 도구 ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">나의 도구</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              const count = mounted && item.countKey ? (counts[item.countKey] ?? 0) : 0;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    idx < menuItems.length - 1 ? "border-b border-gray-50" : ""
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} flex-shrink-0`}>
                    <Icon size={19} className={item.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900">{item.label}</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {count > 0 && (
                      <span className="bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {count}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── 데이터 ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">데이터</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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

        {/* ── 앱 설치 ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">앱으로 설치</p>
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            {[
              { label: "iPhone", desc: "Safari → 공유 버튼(□↑) → 홈 화면에 추가" },
              { label: "Android", desc: "Chrome → 우측 상단 ⋮ → 홈 화면에 추가" },
              { label: "PC", desc: "Chrome 주소창 우측 ⊕ → 앱으로 설치" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-[12px] font-bold text-blue-500 w-14 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-[12px] text-gray-500 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-gray-300 text-center pb-2">Work Manager v2.1 · 생산품질팀</p>
      </div>
    </div>
  );
}
