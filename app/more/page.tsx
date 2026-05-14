"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  AlertTriangle, Package, DollarSign, Calendar,
  Download, ChevronRight, CheckSquare, FileText, LogOut, User, Bell, BellOff,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { registerPush, unregisterPush } from "@/components/PushSubscriber";

const menuItems = [
  {
    href: "/todos",
    icon: CheckSquare,
    label: "할 일 관리",
    desc: "업무 체크리스트",
    color: "text-blue-500",
    bg: "bg-blue-50",
    countKey: "todos",
  },
  {
    href: "/notes",
    icon: FileText,
    label: "회의 메모",
    desc: "회의록·메모 관리",
    color: "text-purple-500",
    bg: "bg-purple-50",
    countKey: "notes",
  },
  {
    href: "/claims",
    icon: AlertTriangle,
    label: "불량 클레임",
    desc: "불량클레임 등록/추적",
    color: "text-red-500",
    bg: "bg-red-50",
    countKey: "claims",
  },
  {
    href: "/materials",
    icon: Package,
    label: "부자재 단가",
    desc: "케어라벨, 원단 등 단가",
    color: "text-teal-500",
    bg: "bg-teal-50",
    countKey: "materials",
  },
  {
    href: "/expenses",
    icon: DollarSign,
    label: "개인경비",
    desc: "월별 경비 내역 기록",
    color: "text-green-500",
    bg: "bg-green-50",
    countKey: "expenses",
  },
  {
    href: "/calendar",
    icon: Calendar,
    label: "캘린더",
    desc: "할 일 일정 달력 보기",
    color: "text-orange-500",
    bg: "bg-orange-50",
    countKey: null,
  },
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
      const claims = JSON.parse(localStorage.getItem("claims") || "[]");
      const materials = JSON.parse(localStorage.getItem("materials") || "[]");
      const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
      const todos = JSON.parse(localStorage.getItem("todos") || "[]");
      const notes = JSON.parse(localStorage.getItem("notes") || "[]");
      setCounts({
        claims: claims.filter((c: { status: string }) => c.status !== "resolved").length,
        materials: materials.length,
        expenses: expenses.filter((e: { date: string }) => e.date.startsWith(ym)).length,
        todos: todos.filter((t: { completed: boolean }) => !t.completed).length,
        notes: notes.length,
      });
    } catch { /* no-op */ }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    setNotifStatus(
      Notification.permission === "granted" ? "granted" :
      Notification.permission === "denied" ? "denied" : "unknown"
    );
  }, []);

  const toggleNotif = async () => {
    if (notifLoading) return;
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

  const notifLabel =
    notifStatus === "granted" ? "켜짐" :
    notifStatus === "denied"  ? "차단됨" :
    notifStatus === "unsupported" ? "미지원" : "꺼짐";

  const notifBadgeClass =
    notifStatus === "granted" ? "bg-green-100 text-green-700" :
    notifStatus === "denied"  ? "bg-red-100 text-red-500" :
    "bg-gray-100 text-gray-500";

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">더보기</h1>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex-shrink-0">
            {user?.imageUrl ? (
              <Image src={user.imageUrl} alt="프로필" width={56} height={56}
                className="rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={24} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{myName}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>
            <span className="inline-block text-xs mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {admin ? "👑 관리자" : "팀 멤버"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <Link href="/profile"
            className="flex-1 text-center text-sm text-blue-600 font-semibold py-2 bg-blue-50 rounded-xl">
            프로필 편집
          </Link>
          <button type="button" onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-xl py-2">
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      </div>

      {/* 설정 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">설정</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
        {notifStatus !== "unsupported" && (
          <button type="button" onClick={toggleNotif} disabled={notifLoading || notifStatus === "denied"}
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors rounded-2xl disabled:opacity-60">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              notifStatus === "granted" ? "bg-blue-50" : "bg-gray-100"
            }`}>
              {notifStatus === "granted"
                ? <Bell size={20} className="text-blue-500" />
                : <BellOff size={20} className="text-gray-400" />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">알림</p>
              <p className="text-xs text-gray-400 mt-0.5">집합 · 게시판 · 투표</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${notifBadgeClass}`}>
              {notifLoading ? "..." : notifLabel}
            </span>
          </button>
        )}
        {notifStatus === "denied" && (
          <p className="text-xs text-gray-400 px-4 pb-3">브라우저 설정에서 알림을 허용해야 켤 수 있어요</p>
        )}
      </div>

      {/* 나의 도구 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">나의 도구</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const count = mounted && item.countKey ? (counts[item.countKey] ?? 0) : 0;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                idx < menuItems.length - 1 ? "border-b border-gray-50" : ""
              }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} flex-shrink-0`}>
                <Icon size={18} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {count > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {count}
                  </span>
                )}
                <ChevronRight size={15} className="text-gray-300" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 데이터 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">데이터</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
        <button type="button" onClick={handleExport}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-gray-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-800">데이터 백업</p>
            <p className="text-xs text-gray-400 mt-0.5">할 일, 메모, 경비 JSON 다운로드</p>
          </div>
          <ChevronRight size={15} className="text-gray-300" />
        </button>
      </div>

      {/* 앱 설치 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">앱 설치</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="space-y-2.5 text-xs text-gray-600">
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-blue-500 flex-shrink-0 mt-0.5">iPhone</span>
            <span>Safari에서 이 페이지 열기 → 공유 버튼(□↑) → 홈 화면에 추가</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-blue-500 flex-shrink-0 mt-0.5">Android</span>
            <span>Chrome 주소창 우측 ⋮ 메뉴 → 홈 화면에 추가</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-blue-500 flex-shrink-0 mt-0.5">PC</span>
            <span>Chrome 주소창 오른쪽 ⊕ 아이콘 → 앱으로 설치</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-300 text-center">Work Manager v2.1 · 생산품질팀</p>
    </div>
  );
}
