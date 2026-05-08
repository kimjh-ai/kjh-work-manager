"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronDown,
  Filter,
} from "lucide-react";
import { getTodos, saveTodos, generateId } from "@/lib/storage";
import { Todo, Category, Priority } from "@/lib/types";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "quality", label: "🔍 품질클레임" },
  { value: "deadline", label: "⏰ 마감" },
  { value: "document", label: "📄 문서/기안" },
  { value: "meeting", label: "💬 회의" },
  { value: "expense", label: "💰 경비" },
  { value: "material", label: "🧵 부자재" },
  { value: "general", label: "📌 일반" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "높음" },
  { value: "medium", label: "보통" },
  { value: "low", label: "낮음" },
];

const CAT_LABEL: Record<Category, string> = {
  quality: "품질",
  deadline: "마감",
  document: "문서",
  meeting: "회의",
  expense: "경비",
  material: "부자재",
  general: "일반",
};

const PRI_COLOR: Record<Priority, string> = {
  high: "priority-badge-high",
  medium: "priority-badge-medium",
  low: "priority-badge-low",
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterDone, setFilterDone] = useState<"all" | "pending" | "done">(
    "pending"
  );
  const [form, setForm] = useState({
    title: "",
    detail: "",
    category: "general" as Category,
    priority: "medium" as Priority,
    dueDate: "",
  });

  const load = useCallback(() => setTodos(getTodos()), []);
  useEffect(() => {
    load();
  }, [load]);

  const save = (updated: Todo[]) => {
    setTodos(updated);
    saveTodos(updated);
  };

  const addTodo = () => {
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    const newTodo: Todo = {
      id: generateId(),
      title: form.title.trim(),
      detail: form.detail.trim() || undefined,
      category: form.category,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    save([newTodo, ...todos]);
    setForm({ title: "", detail: "", category: "general", priority: "medium", dueDate: "" });
    setShowForm(false);
  };

  const toggle = (id: string) => {
    save(
      todos.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
          : t
      )
    );
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    save(todos.filter((t) => t.id !== id));
  };

  const filtered = todos
    .filter((t) => filterCat === "all" || t.category === filterCat)
    .filter((t) => {
      if (filterDone === "pending") return !t.completed;
      if (filterDone === "done") return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pOrd: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return pOrd[a.priority] - pOrd[b.priority];
    });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isOverdue = (t: Todo) => !t.completed && t.dueDate && t.dueDate < todayStr;

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">할 일 관리</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium"
          aria-label="할 일 추가"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <div className="relative flex-shrink-0">
          <select
            value={filterDone}
            onChange={(e) =>
              setFilterDone(e.target.value as "all" | "pending" | "done")
            }
            className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">미완료</option>
            <option value="done">완료</option>
            <option value="all">전체</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative flex-shrink-0">
          <select
            value={filterCat}
            onChange={(e) =>
              setFilterCat(e.target.value as Category | "all")
            }
            className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 카테고리</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500">
          <Filter size={12} />
          {filtered.length}건
        </div>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">새 할 일</h2>
          <input
            type="text"
            placeholder="할 일 제목 *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="상세 내용 (선택)"
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as Category })
                }
                className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as Priority })
                }
                className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addTodo}
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

      {/* 할 일 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            할 일이 없습니다
          </div>
        )}
        {filtered.map((todo) => (
          <div
            key={todo.id}
            className={`card flex items-start gap-3 ${
              isOverdue(todo) ? "border-red-200 bg-red-50" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(todo.id)}
              aria-label={`${todo.title} ${todo.completed ? "완료 취소" : "완료"}`}
              className="mt-0.5 flex-shrink-0"
            >
              {todo.completed ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <Circle size={20} className="text-gray-300" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  todo.completed ? "line-through text-gray-400" : "text-gray-800"
                }`}
              >
                {todo.title}
              </p>
              {todo.detail && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {todo.detail}
                </p>
              )}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${PRI_COLOR[todo.priority]}`}
                >
                  {CAT_LABEL[todo.category]}
                </span>
                <span className="text-xs text-gray-400">
                  {todo.priority === "high"
                    ? "🔴"
                    : todo.priority === "medium"
                    ? "🟡"
                    : "🟢"}
                </span>
                {todo.dueDate && (
                  <span
                    className={`text-xs ${
                      isOverdue(todo)
                        ? "text-red-500 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {isOverdue(todo) ? "⚠ " : "📅 "}
                    {todo.dueDate}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(todo.id)}
              aria-label="삭제"
              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
