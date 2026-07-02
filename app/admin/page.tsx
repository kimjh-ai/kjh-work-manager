"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  createdAt: number;
  lastSignInAt: number | null;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const myClerkId = user?.id ?? "";

  useEffect(() => {
    if (isLoaded && !isAdmin(email)) {
      router.replace("/");
    }
  }, [isLoaded, email, router]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch { /* no-op */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isLoaded && isAdmin(email)) load(); }, [isLoaded, email]);

  const handleDelete = async (targetId: string) => {
    setDeleting(targetId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== targetId));
      } else {
        const d = await res.json();
        alert(d.error ?? "삭제 실패");
      }
    } catch { alert("오류가 발생했습니다"); }
    finally { setDeleting(null); setConfirmId(null); }
  };

  if (!isLoaded || !isAdmin(email)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button type="button" onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-xl active:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <p className="text-[17px] font-bold text-gray-900">👑 멤버 관리</p>
          <p className="text-[12px] text-gray-400">총 {users.length}명 가입</p>
        </div>
        <button type="button" onClick={load} className="p-2 rounded-xl active:bg-gray-100">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-2 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
              <Avatar imageUrl={u.imageUrl} name={u.name} size={42} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 truncate">
                  {u.name}
                  {u.id === myClerkId && <span className="ml-1.5 text-[11px] text-blue-500 font-normal">(나)</span>}
                </p>
                <p className="text-[12px] text-gray-400 truncate">{u.email}</p>
                <p className="text-[11px] text-gray-300">
                  가입: {format(new Date(u.createdAt), "yyyy.MM.dd", { locale: ko })}
                  {" · "}
                  최근: {u.lastSignInAt ? format(new Date(u.lastSignInAt), "yyyy.MM.dd HH:mm", { locale: ko }) : "-"}
                </p>
              </div>
              {u.id !== myClerkId && (
                confirmId === u.id ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button type="button"
                      onClick={() => setConfirmId(null)}
                      className="text-[12px] px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-medium">
                      취소
                    </button>
                    <button type="button"
                      onClick={() => handleDelete(u.id)}
                      disabled={deleting === u.id}
                      className="text-[12px] px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium disabled:opacity-50">
                      {deleting === u.id ? "처리중..." : "퇴장 확인"}
                    </button>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => setConfirmId(u.id)}
                    className="flex-shrink-0 p-2 rounded-xl text-red-400 active:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
