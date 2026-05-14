"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, X, ChevronDown } from "lucide-react";

type Stage = "서류" | "1차면접" | "2차면접" | "최종면접" | "처우협의";
type Result = "대기중" | "합격" | "불합격" | "보류";

interface Interview {
  id: string;
  company: string;
  stage: Stage;
  date: string;
  result: Result;
  memo: string;
  salary: string;
}

const STAGES: Stage[] = ["서류", "1차면접", "2차면접", "최종면접", "처우협의"];
const RESULTS: Result[] = ["대기중", "합격", "불합격", "보류"];

const RESULT_STYLE: Record<Result, string> = {
  대기중: "bg-blue-100 text-blue-600",
  합격:   "bg-green-100 text-green-700",
  불합격: "bg-red-100 text-red-500",
  보류:   "bg-gray-100 text-gray-500",
};

const STAGE_STYLE: Record<Stage, string> = {
  서류:   "bg-gray-100 text-gray-600",
  "1차면접": "bg-purple-100 text-purple-600",
  "2차면접": "bg-blue-100 text-blue-600",
  최종면접: "bg-orange-100 text-orange-600",
  처우협의: "bg-green-100 text-green-600",
};

export default function InterviewsPage() {
  const [items, setItems] = useState<Interview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState<Stage>("서류");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [result, setResult] = useState<Result>("대기중");
  const [memo, setMemo] = useState("");
  const [salary, setSalary] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("interviews");
      if (raw) setItems(JSON.parse(raw));
    } catch { /* no-op */ }
  }, []);

  const save = (next: Interview[]) => {
    setItems(next);
    localStorage.setItem("interviews", JSON.stringify(next));
  };

  const add = () => {
    if (!company.trim()) return;
    const next: Interview = { id: Date.now().toString(), company: company.trim(), stage, date, result, memo, salary };
    save([next, ...items]);
    setCompany(""); setStage("서류"); setDate(format(new Date(), "yyyy-MM-dd"));
    setResult("대기중"); setMemo(""); setSalary("");
    setShowForm(false);
  };

  const updateResult = (id: string, r: Result) => {
    save(items.map((i) => i.id === id ? { ...i, result: r } : i));
  };

  const updateStage = (id: string, s: Stage) => {
    save(items.map((i) => i.id === id ? { ...i, stage: s } : i));
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    save(items.filter((i) => i.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const passCount = items.filter((i) => i.result === "합격").length;
  const failCount = items.filter((i) => i.result === "불합격").length;
  const pendingCount = items.filter((i) => i.result === "대기중").length;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">💼 면접 일정</h1>
            <p className="text-[13px] text-gray-400 mt-1">내 기기에만 저장됩니다</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-3.5 py-2 text-[13px] font-semibold">
            <Plus size={15} /> 추가
          </button>
        </div>
        {items.length > 0 && (
          <div className="flex gap-3 mt-1">
            {[["대기중", pendingCount, "text-blue-500"], ["합격", passCount, "text-green-600"], ["불합격", failCount, "text-red-400"]].map(([l, c, cls]) => (
              <div key={String(l)} className="flex items-center gap-1">
                <span className={`text-[15px] font-black ${cls}`}>{c}</span>
                <span className="text-[12px] text-gray-400">{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-gray-800">면접 추가</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400"><X size={16} /></button>
            </div>
            <input placeholder="회사명 *" value={company} onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="flex gap-2">
              <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <input placeholder="희망 연봉 (예: 4500)" value={salary} onChange={(e) => setSalary(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <textarea placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)}
              rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
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
            <p className="text-4xl mb-2">💼</p>
            <p className="text-[14px] text-gray-400">등록된 면접이 없어요</p>
            <p className="text-[12px] text-gray-300 mt-1">추가 버튼으로 면접을 관리해보세요</p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button type="button" onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[15px] font-bold text-gray-900">{item.company}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STAGE_STYLE[item.stage]}`}>{item.stage}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${RESULT_STYLE[item.result]}`}>{item.result}</span>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {format(new Date(item.date), "M월 d일 (eee)", { locale: ko })}
                  {item.salary ? ` · 희망 ${item.salary}만원` : ""}
                </p>
              </div>
              <ChevronDown size={16} className={`text-gray-300 flex-shrink-0 transition-transform ${expanded === item.id ? "rotate-180" : ""}`} />
            </button>

            {expanded === item.id && (
              <div className="border-t border-gray-50 px-4 pb-4 space-y-3">
                {item.memo && (
                  <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap pt-3">{item.memo}</p>
                )}
                <div>
                  <p className="text-[11px] font-bold text-gray-400 mb-2">전형 단계 변경</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {STAGES.map((s) => (
                      <button key={s} type="button" onClick={() => updateStage(item.id, s)}
                        className={`text-[12px] px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                          item.stage === s ? STAGE_STYLE[s] + " border-current" : "border-gray-200 text-gray-400"
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 mb-2">결과 변경</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {RESULTS.map((r) => (
                      <button key={r} type="button" onClick={() => updateResult(item.id, r)}
                        className={`text-[12px] px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                          item.result === r ? RESULT_STYLE[r] + " border-current" : "border-gray-200 text-gray-400"
                        }`}>{r}</button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => remove(item.id)}
                  className="flex items-center gap-1.5 text-[12px] text-red-400 pt-1">
                  <Trash2 size={13} /> 삭제
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
