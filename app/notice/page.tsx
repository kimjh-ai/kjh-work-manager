"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, X, Pin } from "lucide-react";
import { isAdmin } from "@/lib/auth";

interface Notice {
  id: string;
  title: string;
  content: string;
  author: string;
  important: boolean;
  createdAt: string;
}

export default function NoticePage() {
  const { user, isLoaded } = useUser();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [important, setImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];

  const load = async () => {
    try {
      const res = await fetch("/api/notice");
      const data = await res.json();
      setNotices(data.notices ?? []);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) load(); }, [isLoaded]);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), author: myName, authorEmail: email, important }),
      });
      setTitle(""); setContent(""); setImportant(false); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch("/api/notice", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, authorEmail: email }),
    });
    await load();
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-gray-900">📌 팀 공지</h1>
          {admin && (
            <button type="button" onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-3.5 py-2 text-[13px] font-semibold">
              <Plus size={15} /> 작성
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {showForm && admin && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-gray-800">새 공지</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400"><X size={16} /></button>
            </div>
            <input placeholder="제목 *" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <textarea placeholder="내용 (선택)" value={content} onChange={(e) => setContent(e.target.value)}
              rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-[13px] text-gray-600">중요 공지로 표시</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={submit} disabled={saving || !title.trim()}
                className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-50">
                {saving ? "..." : "등록"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-[14px]">취소</button>
            </div>
          </div>
        )}

        {notices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-[14px] text-gray-400">아직 공지사항이 없어요</p>
            {admin && <p className="text-[12px] text-gray-300 mt-1">위 '작성' 버튼으로 공지를 올려보세요</p>}
          </div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id}
              className={`bg-white rounded-2xl shadow-sm p-4 ${notice.important ? "border-l-4 border-orange-400" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {notice.important && <Pin size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-gray-900">{notice.title}</p>
                    {notice.content && (
                      <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed whitespace-pre-wrap">
                        {notice.content}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-2">
                      {notice.author} · {format(new Date(notice.createdAt), "M월 d일 HH:mm", { locale: ko })}
                    </p>
                  </div>
                </div>
                {admin && (
                  <button type="button" onClick={() => remove(notice.id)}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
