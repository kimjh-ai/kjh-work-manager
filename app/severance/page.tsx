"use client";

import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Calculator, Save } from "lucide-react";

interface SavedData {
  joinDate: string;
  monthlySalary: string;
}

function calcSeverance(joinDate: string, quitDate: string, monthly: number) {
  const start = new Date(joinDate);
  const end = new Date(quitDate);
  const days = differenceInDays(end, start);
  if (days < 365) return null;
  const avgDayPay = (monthly * 3) / 91;
  const severance = avgDayPay * 30 * (days / 365);
  return { days, years: days / 365, severance };
}

export default function SeverancePage() {
  const [joinDate, setJoinDate] = useState("");
  const [quitDate, setQuitDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [monthlySalary, setMonthlySalary] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("severance_data");
      if (raw) {
        const data: SavedData = JSON.parse(raw);
        setJoinDate(data.joinDate ?? "");
        setMonthlySalary(data.monthlySalary ?? "");
      }
    } catch { /* no-op */ }
  }, []);

  const saveData = () => {
    localStorage.setItem("severance_data", JSON.stringify({ joinDate, monthlySalary }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const monthly = Number(monthlySalary.replace(/,/g, "")) || 0;
  const result = joinDate && quitDate && monthly > 0 ? calcSeverance(joinDate, quitDate, monthly) : null;

  const formatKRW = (n: number) =>
    n >= 100_000_000
      ? `${(n / 100_000_000).toFixed(1)}억 ${Math.round((n % 100_000_000) / 10_000).toLocaleString()}만원`
      : `${Math.round(n / 10_000).toLocaleString()}만원`;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold text-gray-900">💰 퇴직금 계산기</h1>
        <p className="text-[13px] text-gray-400 mt-1">내 기기에만 저장됩니다</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="text-[12px] font-semibold text-gray-500 block mb-1.5">입사일</label>
            <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-gray-500 block mb-1.5">퇴사 예정일</label>
            <input type="date" value={quitDate} onChange={(e) => setQuitDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-gray-500 block mb-1.5">월 평균 임금 (세전)</label>
            <div className="relative">
              <input type="text" inputMode="numeric" placeholder="3,500,000"
                value={monthlySalary}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setMonthlySalary(raw ? Number(raw).toLocaleString() : "");
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">원</span>
            </div>
          </div>
          <button type="button" onClick={saveData}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-[13px] font-semibold">
            <Save size={14} /> {saved ? "저장됨 ✓" : "입력값 저장"}
          </button>
        </div>

        {result === null && joinDate && quitDate && monthly > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
            <p className="text-[14px] text-orange-600 font-semibold">근무 기간 1년 미만</p>
            <p className="text-[12px] text-orange-400 mt-1">퇴직금은 1년 이상 근무 시 발생해요</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={16} className="text-blue-500" />
              <p className="text-[14px] font-bold text-gray-800">계산 결과</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-[13px] text-blue-500 font-semibold mb-1">예상 퇴직금</p>
              <p className="text-[28px] font-black text-blue-700">{formatKRW(result.severance)}</p>
              <p className="text-[12px] text-blue-400 mt-1">{Math.round(result.severance).toLocaleString()}원</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "총 근무일수", value: `${result.days.toLocaleString()}일` },
                { label: "근무 연수",   value: `${result.years.toFixed(2)}년` },
                { label: "1일 평균임금", value: `${Math.round((monthly * 3) / 91).toLocaleString()}원` },
                { label: "30일분 평균임금", value: `${Math.round(((monthly * 3) / 91) * 30).toLocaleString()}원` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-[13px] text-gray-500">{label}</span>
                  <span className="text-[13px] font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              * 퇴직금 = 1일 평균임금 × 30 × (재직일수 ÷ 365)<br />
              * 실제 금액은 수당·상여 포함 여부에 따라 달라질 수 있어요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
