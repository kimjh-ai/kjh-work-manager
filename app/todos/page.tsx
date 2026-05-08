"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle2, Circle, Trash2, ChevronDown, Filter, Pencil, X } from "lucide-react";
import { getTodos, saveTodos, generateId } from "@/lib/storage";
import { Todo, Category, Priority } from "@/lib/types";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "quality",  label: "🔍 품질클레임" },
  { value: "deadline", label: "⏰ 마감" },
  { value: "document", label: "📄 문서/기안" },
  { value: "meeting",  label: "💬 회의" },
  { value: "expense",  label: "💰 경비" },
  { value: "material", label: "🧵 부자재" },
  { value: "general",  label: "📌 일반" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high",   label: "🔴 높음" },
  { value: "medium", label: "🟡 보통" },
  { value: "low",    label: "🟢 낮음" },
];

const CAT_LABEL: Record<Category, string> = {
  quality: "품질", deadline: "마감", document: "문서",
  meeting: "회의", expense: "경비", material: "부자재", general: "일반",
};

const PRI_COLOR: Record<Priority, string> = {
  high: "priority-badge-high",
  medium: "priority-badge-medium",
  low: "priority-badge-low",
};

const EMPTY_FORM = {
  title: "", detail: "", category: "general" as Category,
  priority: "medium" as Priority, dueDate: "",
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // 수정 중인 id
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterDone, setFilterDone] = useState<"all" | "pending" | "done">("pending");
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => setTodos(getTodos()), []);
  useEffect(() => { load(); }, [load]);

  const persist = (updated: Todo[]) => { setTodos(updated); saveTodos(updated); };

  // 추가 폼 열기
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  // 수정 폼 열기 — 기존 값 채워넣기
  const openEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setForm({
      title:    todo.title,
      detail:   todo.detail ?? "",
      category: todo.category,
      priority: todo.priority,
      dueDate:  todo.dueDate ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  // 저장 (추가 or 수정)
  const handleSave = () => {
    if (!form.title.trim()) return;
    const now = new Date().toISOString();

    if (editingId) {
      // 수정
      persist(todos.map((t) =>
        t.id === editingId
          ? { ...t, title: form.title.trim(), detail: form.detail.trim() || undefined,
              category: form.category, priority: form.priority,
              dueDate: form.dueDate || undefined, updatedAt: now }
          : t
      ));
    } else {
      // 추가
      const newTodo: Todo = {
        id: generateId(), title: form.title.trim(),
        detail: form.detail.trim() || undefined,
        category: form.category, priority: form.priority,
        dueDate: form.dueDate || undefined,
        completed: false, createdAt: now, updatedAt: now,
      };
      persist([newTodo, ...todos]);
    }
    closeForm();
  };

  const toggle = (id: string) => {
    persist(todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t
    ));
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    persist(todos.filter((t) => t.id !== id));
  };

  const filtered = todos
    .filter((t) => filterCat === "all" || t.category === filterCat)
    .filter((t) => {
      if (filterDone === "pending") return !t.completed;
      if (filterDone === "done")    return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pOrd: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return pOrd[a.priority] - pOrd[b.priority];
    });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isOverdue = (t: Todo) => !t.completed && !!t.dueDate && t.dueDate < todayStr;

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">할 일 관리</h1>
        <button type="button" onClick={openAdd}
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium"
          aria-label="할 일 추가">
          <Plus size={16} /> 추가
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <div className="relative flex-shrink-0">
          <select value={filterDone}
            onChange={(e) => setFilterDone(e.target.value as "all" | "pending" | "done")}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="pending">미완료</option>
            <option value="done">완료</option>
            <option value="all">전체</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative flex-shrink-0">
          <select value={filterCat}
            onChange={(e) => setFilterCat(e.target.value as Category | "all")}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">전체 카테고리</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500">
          <Filter size={12} />{filtered.length}건
        </div>
      </div>

      {/* 추가 / 수정 폼 */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {editingId ? "✏️ 할 일 수정" : "새 할 일"}
            </h2>
            <button type="button" onClick={closeForm} aria-label="닫기"
              className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <input type="text" placeholder="할 일 제목 *" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <textarea placeholder="상세 내용 (선택)" value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <input type="date" value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <div className="flex gap-2">
            <button type="button" onClick={handleSave}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium">
              {editingId ? "수정 완료" : "저장"}
            </button>
            <button type="button" onClick={closeForm}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 할 일 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">할 일이 없습니다</div>
        )}
        {filtered.map((todo) => (
          <div key={todo.id}
            className={`card flex items-start gap-3 ${isOverdue(todo) ? "border-red-200 bg-red-50" : ""}`}>

            {/* 완료 토글 */}
            <button type="button" onClick={() => toggle(todo.id)}
              aria-label={`${todo.title} ${todo.completed ? "완료 취소" : "완료"}`}
              className="mt-0.5 flex-shrink-0">
              {todo.completed
                ? <CheckCircle2 size={20} className="text-green-500" />
                : <Circle size={20} className="text-gray-300" />}
            </button>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${todo.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                {todo.title}
              </p>
              {todo.detail && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{todo.detail}</p>
              )}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRI_COLOR[todo.priority]}`}>
                  {CAT_LABEL[todo.category]}
                </span>
                <span className="text-xs text-gray-400">
                  {todo.priority === "high" ? "🔴" : todo.priority === "medium" ? "🟡" : "🟢"}
                </span>
                {todo.dueDate && (
                  <span className={`text-xs ${isOverdue(todo) ? "text-red-500 font-medium" : "text-gray-400"}`}>
                    {isOverdue(todo) ? "⚠ " : "📅 "}{todo.dueDate}
                  </span>
                )}
              </div>
            </div>

            {/* 수정 버튼 */}
            <button type="button" onClick={() => openEdit(todo)}
              aria-label="수정"
              className="text-gray-300 hover:text-blue-500 transition-colors flex-shrink-0 mt-0.5">
              <Pencil size={15} />
            </button>

            {/* 삭제 버튼 */}
            <button type="button" onClick={() => remove(todo.id)}
              aria-label="삭제"
              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
