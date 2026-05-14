"use client";

import { useState, useEffect } from "react";
import { differenceInDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { Save, Plus, Trash2 } from "lucide-react";

interface DDay {
  id: string;
  label: string;
  date: string;
  type: "countdown" | "since";
  emoji: string;
}

const EMOJIS = ["🏃", "🎯", "📅", "💼", "🌟", "🔥", "💪", "🍀"];

export default function DDayPage() {
  const [items, setItems] = useState<DDay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState<"countdown" | "since">("countdown");
  const [emoji, setEmoji] = useState("🎯");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ddays");
      if (raw) setItems(JSON.parse(raw));
    } catch { /* no-op */ }
  }, []);

  const save = (next: DDay[]) => {
    setItems(next);
    localStorage.setItem("ddays", JSON.stringify(next));
  };

  const add = () => {
    if (!label.trim()) return;
    save([...items, { id: Date.now().toString(), label: label.trim(), date, type, emoji }]);
    setLabel(""); setDate(format(new Date(), "yyyy-MM-dd")); setShowForm(false);
  };

  const remove = (id: string) => save(items.filter((i) => i.id !== id));

  const calcDiff = (d: string, t: "countdown" | "since") => {
    const target = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = differenceInDays(target, today);
    if (t === "since") return { label: `${Math.abs(diff)}일째`, sub: `${format(target, "yyyy년 M월 d일 시작", { locale: ko })}`, accent: false };
    if (diff === 0) return { label: "D-DAY", sub: "오늘!", accent: true };
    if (diff > 0) return { label: `D-${diff}`, sub: `${format(target, "M월 d일", { locale: ko })} 남았어요`, accent: false };
    return { label: `D+${Math.abs(diff)}`, sub: `${format(target, "M월 d일", { locale: ko })} 지났어요`, accent: false };
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">📅 D-day</h1>
            <p className="text-[13px] text-gray-400 mt-1">내 기기에만 저장됩니다</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-3.5 py-2 text-[13px] font-semibold">
            <Plus size={15} /> 추가
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-[14px] font-bold text-gray-800">새 D-day</p>
            <input placeholder="이름 (예: 목표 퇴사일, 면접 결과)" value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="flex gap-2">
              {(["countdown", "since"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                    type === t ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"
                  }`}>
                  {t === "countdown" ? "⏳ 카운트다운" : "📆 경과 일수"}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setEmoji(e)}
                  className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                    emoji === e ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}>{e}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={add}
                className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-[14px] font-semibold">저장</button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-[14px]">취소</button>
            </div>
          </div>
        )}

        {items.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-2">📅</p>
            <p className="text-[14px] text-gray-400">아직 D-day가 없어요</p>
            <p className="text-[12px] text-gray-300 mt-1">위 추가 버튼을 눌러 만들어보세요</p>
          </div>
        )}

        {items.map((item) => {
          const { label: dlabel, sub, accent } = calcDiff(item.date, item.type);
          return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4">
              <span className="text-[28px]">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-800 truncate">{item.label}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-[22px] font-black ${accent ? "text-pink-500" : "text-blue-600"}`}>{dlabel}</p>
              </div>
              <button type="button" onClick={() => remove(item.id)} className="text-gray-200 hover:text-red-400 flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
