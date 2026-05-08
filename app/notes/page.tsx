"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, ChevronDown, Search, X } from "lucide-react";
import { getNotes, saveNotes, generateId } from "@/lib/storage";
import { Note } from "@/lib/types";

const TYPE_OPTIONS = [
  { value: "meeting", label: "💬 회의록", color: "bg-orange-100 text-orange-700" },
  { value: "memo", label: "📝 메모", color: "bg-blue-100 text-blue-700" },
  { value: "manual", label: "📖 매뉴얼", color: "bg-purple-100 text-purple-700" },
] as const;

const MEETING_TEMPLATE = `회의 일시: ${format(new Date(), "yyyy-MM-dd HH:mm")}
참석자:
장소:

[안건]
1.

[결정사항]
-

[액션 아이템]
- [ ] `;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const [filterType, setFilterType] = useState<Note["type"] | "all">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "memo" as Note["type"],
  });

  const load = useCallback(() => setNotes(getNotes()), []);
  useEffect(() => {
    load();
  }, [load]);

  const save = (updated: Note[]) => {
    setNotes(updated);
    saveNotes(updated);
  };

  const addNote = () => {
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      title: form.title.trim(),
      content: form.content,
      type: form.type,
      createdAt: now,
      updatedAt: now,
    };
    save([note, ...notes]);
    setForm({ title: "", content: "", type: "memo" });
    setShowForm(false);
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    save(notes.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const useTemplate = () => {
    setForm((f) => ({ ...f, type: "meeting", content: MEETING_TEMPLATE }));
  };

  const filtered = notes
    .filter((n) => filterType === "all" || n.type === filterType)
    .filter(
      (n) =>
        !search ||
        n.title.includes(search) ||
        n.content.includes(search)
    );

  const typeInfo = (type: Note["type"]) =>
    TYPE_OPTIONS.find((o) => o.value === type)!;

  if (selected) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="목록으로 돌아가기"
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1 truncate">
            {selected.title}
          </h1>
          <button
            type="button"
            onClick={() => remove(selected.id)}
            aria-label="삭제"
            className="text-gray-300 hover:text-red-400"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo(selected.type).color}`}>
            {typeInfo(selected.type).label}
          </span>
          <span className="text-xs text-gray-400">
            {format(new Date(selected.updatedAt), "yyyy.MM.dd HH:mm", { locale: ko })}
          </span>
        </div>
        <div className="card">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {selected.content || <span className="text-gray-400">내용 없음</span>}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">메모 / 회의록</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-label="새 메모"
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="제목, 내용 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {["all", "meeting", "memo", "manual"].map((t) => {
          const opt = TYPE_OPTIONS.find((o) => o.value === t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t as Note["type"] | "all")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterType === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {t === "all" ? "전체" : opt?.label}
            </button>
          );
        })}
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">새 메모</h2>
            <button
              type="button"
              onClick={useTemplate}
              className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1"
            >
              회의록 템플릿
            </button>
          </div>
          <input
            type="text"
            placeholder="제목 *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="relative">
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as Note["type"] })
              }
              className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
          </div>
          <textarea
            placeholder="내용"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addNote}
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
            메모가 없습니다
          </div>
        )}
        {filtered.map((note) => (
          <div
            key={note.id}
            onClick={() => setSelected(note)}
            className="card flex items-start justify-between gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {note.title}
              </p>
              {note.content && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {note.content}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeInfo(note.type).color}`}>
                  {typeInfo(note.type).label}
                </span>
                <span className="text-xs text-gray-400">
                  {format(new Date(note.updatedAt), "MM.dd HH:mm")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(note.id);
              }}
              aria-label="삭제"
              className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
