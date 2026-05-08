"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { getExpenses, saveExpenses, generateId } from "@/lib/storage";
import { Expense } from "@/lib/types";

const EXPENSE_CATS = [
  { value: "transport", label: "🚗 교통" },
  { value: "meal", label: "🍽 식비" },
  { value: "supplies", label: "📦 소모품" },
  { value: "etc", label: "📌 기타" },
] as const;

const CAT_COLOR: Record<Expense["category"], string> = {
  transport: "bg-blue-100 text-blue-700",
  meal: "bg-orange-100 text-orange-700",
  supplies: "bg-purple-100 text-purple-700",
  etc: "bg-gray-100 text-gray-700",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    category: "transport" as Expense["category"],
  });

  const load = useCallback(() => setExpenses(getExpenses()), []);
  useEffect(() => {
    load();
  }, [load]);

  const save = (updated: Expense[]) => {
    setExpenses(updated);
    saveExpenses(updated);
  };

  const add = () => {
    if (!form.description.trim() || !form.amount) return;
    const now = new Date().toISOString();
    const exp: Expense = {
      id: generateId(),
      description: form.description.trim(),
      amount: Number(form.amount),
      date: form.date,
      category: form.category,
      createdAt: now,
    };
    save([exp, ...expenses]);
    setForm({
      description: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      category: "transport",
    });
    setShowForm(false);
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    save(expenses.filter((e) => e.id !== id));
  };

  const filtered = expenses
    .filter((e) => e.date.startsWith(monthFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const catTotal = EXPENSE_CATS.map(({ value, label }) => ({
    label,
    total: filtered
      .filter((e) => e.category === value)
      .reduce((s, e) => s + e.amount, 0),
  }));

  // 이전 달, 다음 달 이동
  const changeMonth = (delta: number) => {
    const [y, m] = monthFilter.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthFilter(format(d, "yyyy-MM"));
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">개인경비 관리</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-label="경비 추가"
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      {/* 월 선택 */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2 mb-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="이전 달"
          className="text-gray-500 hover:text-gray-700 px-2"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {format(new Date(monthFilter + "-01"), "yyyy년 M월", { locale: ko })}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="다음 달"
          className="text-gray-500 hover:text-gray-700 px-2"
        >
          ›
        </button>
      </div>

      {/* 월 합계 */}
      <div className="bg-green-600 rounded-2xl p-4 text-white mb-4">
        <p className="text-xs opacity-80 mb-1">이번 달 총 경비</p>
        <p className="text-2xl font-bold">{total.toLocaleString()}원</p>
        <div className="grid grid-cols-4 gap-1 mt-3">
          {catTotal.map(({ label, total: t }) => (
            <div key={label} className="bg-green-500 rounded-lg p-1.5 text-center">
              <p className="text-xs opacity-80">{label.split(" ")[0]}</p>
              <p className="text-xs font-semibold mt-0.5">{t.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">경비 추가</h2>
          <input
            type="text"
            placeholder="내용 (예: 지하철 교통비) *"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="금액 *"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as Expense["category"] })
                }
                className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6"
              >
                {EXPENSE_CATS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            이번 달 경비 내역이 없습니다
          </div>
        )}
        {filtered.map((exp) => (
          <div key={exp.id} className="card flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {exp.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${CAT_COLOR[exp.category]}`}>
                  {EXPENSE_CATS.find((c) => c.value === exp.category)?.label}
                </span>
                <span className="text-xs text-gray-400">{exp.date}</span>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-800 flex-shrink-0">
              {exp.amount.toLocaleString()}원
            </span>
            <button
              type="button"
              onClick={() => remove(exp.id)}
              aria-label="삭제"
              className="text-gray-300 hover:text-red-400 flex-shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
