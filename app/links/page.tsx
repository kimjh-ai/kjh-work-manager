"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isAdmin } from "@/lib/auth";
import { Plus, X, ExternalLink, Trash2 } from "lucide-react";

interface TeamLink {
  id: string;
  title: string;
  url: string;
  desc: string;
  category: string;
  createdBy: string;
}

const CATEGORIES = ["문서", "시스템", "양식", "채널", "기타"];
const CAT_EMOJI: Record<string, string> = {
  문서: "📄", 시스템: "💻", 양식: "📋", 채널: "💬", 기타: "🔗",
};
const CAT_STYLE: Record<string, string> = {
  문서: "bg-blue-50 text-blue-600", 시스템: "bg-purple-50 text-purple-600",
  양식: "bg-orange-50 text-orange-600", 채널: "bg-green-50 text-green-600",
  기타: "bg-gray-100 text-gray-500",
};

export default function LinksPage() {
  const { user, isLoaded } = useUser();
  const [links, setLinks] = useState<TeamLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("기타");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("전체");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];

  const load = async () => {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) load(); }, [isLoaded]);

  const submit = async () => {
    if (!title.trim() || !url.trim() || saving) return;
    setSaving(true);
    try {
      const u = url.startsWith("http") ? url : `https://${url}`;
      await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), url: u, desc: desc.trim(), category, authorEmail: email, createdBy: myName }),
      });
      setTitle(""); setUrl(""); setDesc(""); setCategory("기타"); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch("/api/links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, authorEmail: email }),
    });
    await load();
  };

  const categories = ["전체", ...CATEGORIES.filter((c) => links.some((l) => l.category === c))];
  const filtered = filter === "전체" ? links : links.filter((l) => l.category === filter);

  if (!isLoaded || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">🔗 팀 링크</h1>
            <p className="text-[13px] text-gray-400 mt-1">자주 쓰는 링크 모음</p>
          </div>
          {admin && (
            <button type="button" onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-3.5 py-2 text-[13px] font-semibold">
              <Plus size={15} /> 추가
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => setFilter(c)}
                className={`flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  filter === c ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                }`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {showForm && admin && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-gray-800">링크 추가</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400"><X size={16} /></button>
            </div>
            <input placeholder="제목 *" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input placeholder="URL * (https://...)" value={url} onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input placeholder="설명 (선택)" value={desc} onChange={(e) => setDesc(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`text-[12px] px-3 py-1.5 rounded-full font-semibold transition-all ${
                    category === c ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}>{CAT_EMOJI[c]} {c}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={submit} disabled={saving || !title.trim() || !url.trim()}
                className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-50">
                {saving ? "..." : "저장"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-[14px]">취소</button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-3xl mb-2">🔗</p>
            <p className="text-[14px] text-gray-400">아직 등록된 링크가 없어요</p>
            {admin && <p className="text-[12px] text-gray-300 mt-1">위 추가 버튼으로 팀 링크를 등록해보세요</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {filtered.map((link, idx) => (
              <div key={link.id}
                className={`flex items-center gap-3.5 px-4 py-3.5 ${idx < filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0 ${CAT_STYLE[link.category] ?? "bg-gray-100"}`}>
                  {CAT_EMOJI[link.category] ?? "🔗"}
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">{link.title}</p>
                    <ExternalLink size={12} className="text-gray-300 flex-shrink-0" />
                  </div>
                  {link.desc && <p className="text-[12px] text-gray-400 mt-0.5 truncate">{link.desc}</p>}
                </a>
                {admin && (
                  <button type="button" onClick={() => remove(link.id)} className="text-gray-200 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
