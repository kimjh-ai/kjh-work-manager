"use client";

import { useEffect, useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTodos } from "@/lib/storage";
import { Todo } from "@/lib/types";

const PRI_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
};

const CAT_LABEL: Record<string, string> = {
  quality: "품질",
  deadline: "마감",
  document: "문서",
  meeting: "회의",
  expense: "경비",
  material: "부자재",
  general: "일반",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);

  const load = useCallback(() => setTodos(getTodos()), []);
  useEffect(() => {
    load();
  }, [load]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const todosForDate = (date: Date) =>
    todos.filter((t) => t.dueDate === format(date, "yyyy-MM-dd"));

  const selectedTodos = todosForDate(selectedDate);

  const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          aria-label="이전 달"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {format(currentDate, "yyyy년 M월", { locale: ko })}
        </h1>
        <button
          type="button"
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          aria-label="다음 달"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div
            key={d}
            className={`text-xs text-center py-1 font-medium ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 달력 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-0">
            {week.map((date, di) => {
              const dayTodos = todosForDate(date);
              const isSelected = isSameDay(date, selectedDate);
              const inMonth = isSameMonth(date, currentDate);
              const today = isToday(date);
              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-label={format(date, "yyyy년 M월 d일")}
                  className={`p-1.5 min-h-[52px] flex flex-col items-center transition-colors ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium mb-0.5 ${
                      today
                        ? "bg-blue-600 text-white"
                        : isSelected
                        ? "bg-blue-100 text-blue-600"
                        : !inMonth
                        ? "text-gray-300"
                        : di === 0
                        ? "text-red-400"
                        : di === 6
                        ? "text-blue-400"
                        : "text-gray-700"
                    }`}
                  >
                    {format(date, "d")}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {dayTodos.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className={`w-1.5 h-1.5 rounded-full ${PRI_DOT[t.priority]}`}
                      />
                    ))}
                    {dayTodos.length > 3 && (
                      <span className="text-[8px] text-gray-400">+</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택 날짜 할 일 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          {format(selectedDate, "M월 d일 (EEE)", { locale: ko })} 일정
        </h2>
        {selectedTodos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            일정이 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {selectedTodos.map((todo) => (
              <div
                key={todo.id}
                className={`card flex items-center gap-3 ${
                  todo.completed ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${PRI_DOT[todo.priority]}`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      todo.completed
                        ? "line-through text-gray-400"
                        : "text-gray-800"
                    }`}
                  >
                    {todo.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CAT_LABEL[todo.category]}
                  </p>
                </div>
                {todo.completed && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex items-center gap-4 justify-center">
        {[
          { color: "bg-red-500", label: "높음" },
          { color: "bg-yellow-400", label: "보통" },
          { color: "bg-green-500", label: "낮음" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
