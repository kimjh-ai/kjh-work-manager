"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { getTodos, saveTodos } from "@/lib/storage";
import { Todo } from "@/lib/types";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketStatus?: string;
  preMarket?: { price: number; change: number; changePercent: number; session: string } | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  quality: "품질",
  deadline: "마감",
  document: "문서",
  meeting: "회의",
  expense: "경비",
  material: "부자재",
  general: "일반",
};


export default function Dashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const today = format(new Date(), "yyyy년 M월 d일 (EEE)", { locale: ko });

  useEffect(() => {
    setTodos(getTodos());
    const refresh = () => setTodos(getTodos());
    window.addEventListener("todosUpdated", refresh);
    return () => window.removeEventListener("todosUpdated", refresh);
  }, []);

  const loadStocks = async () => {
    setStockLoading(true);
    try {
      const res = await fetch(
        "/api/stocks?symbols=005930,000660,034020,373220,005380"
      );
      const data = await res.json();
      setStocks(data.stocks ?? []);
    } catch {
      setStocks([]);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTodos = todos.filter((t) => {
    if (t.completed) return false;
    if (!t.dueDate) return true;
    return t.dueDate <= todayStr;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const total = todos.length;

  const toggle = (id: string) => {
    const updated = todos.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
        : t
    );
    setTodos(updated);
    saveTodos(updated);
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* 헤더 */}
      <div>
        <p className="text-xs text-gray-500">{today}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">안녕하세요 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">생산품질팀 업무 현황</p>
      </div>

      {/* 진행률 카드 */}
      <div className="bg-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium opacity-90">전체 할 일 진행률</span>
          <span className="text-sm opacity-80">
            {completedCount}/{total}
          </span>
        </div>
        <div className="w-full bg-blue-500 rounded-full h-2 mb-2">
          <div
            className="progress-bar bg-white rounded-full h-2 transition-all"
            style={
              {
                "--progress": total
                  ? `${(completedCount / total) * 100}%`
                  : "0%",
              } as React.CSSProperties
            }
          />
        </div>
        <p className="text-xs opacity-80">
          {total === 0
            ? "할 일을 추가해보세요"
            : `${total - completedCount}개 남음`}
        </p>
      </div>

      {/* 주식 위젯 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">📈 주식</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {format(new Date(), "HH:mm")} 기준
            </span>
            <button
              type="button"
              onClick={loadStocks}
              aria-label="주식 새로고침"
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        {stockLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stocks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            데이터를 불러올 수 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {stocks.map((s) => {
              const up = s.change > 0;
              const down = s.change < 0;
              const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
              const cls = up ? "up" : down ? "down" : "flat";
              return (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    {s.marketStatus === "PREOPEN" && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">프리장</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${cls}`}>
                        {s.price.toLocaleString()}
                      </span>
                      <div className={`flex items-center gap-0.5 text-xs ${cls}`}>
                        <Icon size={12} />
                        <span>{up ? "+" : ""}{s.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                    {s.preMarket && (
                      <div className={`text-[11px] flex items-center justify-end gap-1 ${s.preMarket.change > 0 ? "up" : s.preMarket.change < 0 ? "down" : "flat"}`}>
                        <span className="text-gray-400">프리</span>
                        <span>{s.preMarket.price.toLocaleString()}</span>
                        <span>({s.preMarket.change > 0 ? "+" : ""}{s.preMarket.changePercent.toFixed(2)}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link
          href="/stocks"
          className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600 font-medium"
        >
          인기종목 더보기 <ChevronRight size={14} />
        </Link>
      </div>

      {/* 오늘 할 일 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">📋 오늘 할 일</h2>
          <Link
            href="/todos"
            className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
          >
            전체보기 <ChevronRight size={13} />
          </Link>
        </div>
        {todayTodos.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 size={32} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-gray-500">모든 할 일을 완료했어요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTodos.slice(0, 6).map((todo) => (
              <button
                key={todo.id}
                type="button"
                onClick={() => toggle(todo.id)}
                aria-label={`${todo.title} ${todo.completed ? "완료 취소" : "완료"}`}
                className="w-full flex items-start gap-3 text-left hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {todo.completed ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                    <Circle size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      todo.completed
                        ? "line-through text-gray-400"
                        : "text-gray-800"
                    }`}
                  >
                    {todo.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full priority-badge-${todo.priority}`}
                    >
                      {CATEGORY_LABEL[todo.category]}
                    </span>
                    {todo.dueDate && (
                      <span className="text-xs text-gray-400">
                        {todo.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                {todo.priority === "high" && !todo.completed && (
                  <AlertTriangle
                    size={14}
                    className="text-red-400 mt-0.5 flex-shrink-0"
                  />
                )}
              </button>
            ))}
            {todayTodos.length > 6 && (
              <Link
                href="/todos"
                className="block text-center text-xs text-blue-600 pt-1"
              >
                +{todayTodos.length - 6}개 더보기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
