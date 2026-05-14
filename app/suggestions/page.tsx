"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isAdmin } from "@/lib/auth";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Send, Check, Trash2 } from "lucide-react";

type Category = "불만" | "제안" | "칭찬";

interface Suggestion {
  id: string;
  content: string;
  category: Category;
  checked: boolean;
  createdAt: string;
}

const CAT_STYLE: Record<Category, string> = {
  불만: "bg-red-100 text-red-500",
  제안: "bg-blue-100 text-blue-500",
  칭찬: "bg-yellow-100 text-yellow-600",
};
const CAT_EMOJI: Record<Category, string> = { 불만: "😤", 제안: "💡", 칭찬: "👏" };

export default function SuggestionsPage() {
  const { user, isLoaded } = useUser();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("제안");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);

  const load = async () => {
    try {
      const res = await fetch("/api/suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) load(); }, [isLoaded]);

  const submit = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, category }),
      });
      setContent(""); setDone(true);
      setTimeout(() => setDone(false), 2000);
      await load();
    } finally { setSaving(false); }
  };

  const toggleCheck = async (id: string) => {
    await fetch("/api/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, authorEmail: email }),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch("/api/suggestions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, authorEmail: email }),
    });
    await load();
  };

  if (!isLoaded || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const unchecked = suggestions.filter((s) => !s.checked).length;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold text-gray-900">🗳️ 익명 건의함</h1>
        <p className="text-[13px] text-gray-400 mt-1">누가 썼는지 아무도 몰라요</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 작성 폼 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            {(["불만", "제안", "칭찬"] as Category[]).map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold border-2 transition-all ${
                  category === c ? CAT_STYLE[c] + " border-current" : "border-gray-200 text-gray-400"
                }`}>
                {CAT_EMOJI[c]} {c}
              </button>
            ))}
          </div>
          <textarea
            placeholder={
              category === "불만" ? "하고 싶은 말 다 해요. 익명이에요 😤" :
              category === "칭찬" ? "칭찬하고 싶은 사람·일을 적어요 👏" :
              "개선 제안이나 아이디어를 적어요 💡"
            }
            value={content} onChange={(e) => setContent(e.target.value)}
            rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          <button type="button" onClick={submit} disabled={saving || !content.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-40">
            {done ? <><Check size={15}/> 전송됨!</> : saving ? "..." : <><Send size={15}/> 익명으로 보내기</>}
          </button>
        </div>

        {/* 목록 — 관리자만 상세 확인 + 체크 가능, 일반은 카운트만 */}
        {admin ? (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">전체 건의 {suggestions.length}건</p>
              {unchecked > 0 && <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">미확인 {unchecked}</span>}
            </div>
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-[14px] text-gray-400">아직 건의사항이 없어요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s.id} className={`bg-white rounded-2xl shadow-sm p-4 ${s.checked ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${CAT_STYLE[s.category]}`}>
                        {CAT_EMOJI[s.category]} {s.category}
                      </span>
                      <p className="flex-1 text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">{s.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[11px] text-gray-400">{format(new Date(s.createdAt), "M월 d일 HH:mm", { locale: ko })}</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleCheck(s.id)}
                          className={`flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg font-semibold ${
                            s.checked ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                          }`}>
                          <Check size={12}/> {s.checked ? "확인됨" : "확인"}
                        </button>
                        <button type="button" onClick={() => remove(s.id)} className="text-gray-200 hover:text-red-400">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-[32px] mb-2">🔒</p>
            <p className="text-[15px] font-bold text-gray-700">완전 익명이에요</p>
            <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
              누가 썼는지 저장하지 않아요<br/>관리자가 읽고 개선에 반영해요
            </p>
            {suggestions.length > 0 && (
              <p className="text-[12px] text-blue-500 font-semibold mt-3">
                총 {suggestions.length}건의 건의가 접수됐어요
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
