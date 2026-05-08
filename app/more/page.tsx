"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  AlertTriangle, Package, DollarSign, Calendar,
  Download, ChevronRight, CheckSquare, FileText, LogOut, User,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";

const adminMenuItems = [
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
    label: "불량 클레임 관리",
    desc: "1분기 불량클레임 등록/추적",
    color: "text-red-500",
    bg: "bg-red-50",
    countKey: "claims",
  },
  {
    href: "/materials",
    icon: Package,
    label: "부자재 단가 관리",
    desc: "케어라벨, 원단 등 단가 관리",
    color: "text-teal-500",
    bg: "bg-teal-50",
    countKey: "materials",
  },
  {
    href: "/expenses",
    icon: DollarSign,
    label: "개인경비 관리",
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

export default function MorePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

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

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">더보기</h1>
      {/* 프로필 */}
      <div className="card mb-4">
        <Link href="/profile" className="flex items-center gap-3 mb-3">
          <div className="relative w-14 h-14 flex-shrink-0">
            {user?.imageUrl ? (
              <Image src={user.imageUrl} alt="프로필" width={56} height={56}
                className="rounded-full object-cover border-2 border-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-100">
                <User size={24} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{myName}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
            <p className="text-xs mt-0.5">{admin ? "👑 관리자" : "일반 멤버"}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </Link>
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Link href="/profile"
            className="flex-1 text-center text-xs text-blue-600 font-medium py-1.5 bg-blue-50 rounded-xl">
            프로필 편집
          </Link>
          <button type="button" onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-xl py-1.5">
            <LogOut size={12} /> 로그아웃
          </button>
        </div>
      </div>

      {/* 관리자 전용 메뉴 */}
      {admin && (
        <div className="space-y-3 mb-4">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const count = mounted && item.countKey ? (counts[item.countKey] ?? 0) : 0;
            return (
              <Link key={item.href} href={item.href}
                className="card flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} flex-shrink-0`}>
                  <Icon size={20} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {count > 0 && (
                    <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Link>
            );
          })}

          <button type="button" onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-medium">
            <Download size={16} /> 데이터 백업 (JSON)
          </button>
        </div>
      )}

      {/* 앱 설치 안내 */}
      <div className="card mt-2">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📱 앱 설치 방법</h2>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600 flex-shrink-0">iPhone</span>
            <span>Safari에서 이 페이지 열기 → 공유 버튼(□↑) → 홈 화면에 추가</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600 flex-shrink-0">PC</span>
            <span>Chrome 주소창 오른쪽 ⊕ 아이콘 클릭 → 앱으로 설치</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Work Manager v2.0 · 생산품질팀
      </p>
    </div>
  );
}
