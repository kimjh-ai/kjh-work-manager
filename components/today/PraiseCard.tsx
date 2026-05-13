"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";

interface Praise {
  id: string;
  to: string;
  message: string;
  emoji: string;
  createdAt: string;
}

const EMOJIS = ["👏", "🔥", "💪", "🌟", "💖", "😄"];

interface Props {
  myName: string;
}

export default function PraiseCard({ myName }: Props) {
  const [praises, setPraises] = useState<Praise[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("👏");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/praise");
      const data = await res.json();
      setPraises(data.praises ?? []);
    } catch { /* no-op */ }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!to.trim() || !message.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/praise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: message.trim(), emoji }),
      });
      setTo(""); setMessage(""); setEmoji("👏"); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    await fetch(`/api/praise?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800">👏 칭찬 스티커</h2>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs text-pink-600 border border-pink-200 rounded-lg px-2.5 py-1 hover:bg-pink-50 transition-colors">
          + 칭찬하기
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
          <input placeholder="누구를 칭찬할까요?" value={to} onChange={(e) => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          <textarea placeholder="칭찬 내용 (익명으로 전달돼요)" value={message}
            onChange={(e) => setMessage(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
          <div className="flex gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className={`flex-1 text-xl py-2 rounded-xl transition-all ${
                  emoji === e ? "bg-pink-100 ring-2 ring-pink-300 scale-110" : "bg-gray-50 hover:bg-gray-100"
                }`}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={submit}
              disabled={saving || !to.trim() || !message.trim()}
              className="flex-1 bg-pink-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? "..." : "칭찬 보내기 💌"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm">
              취소
            </button>
          </div>
        </div>
      )}

      {praises.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">
          아직 칭찬이 없어요. 먼저 칭찬해보세요! 😊
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {praises.map((p) => (
            <div key={p.id} className="flex items-start gap-2 bg-pink-50 rounded-xl px-3 py-2.5">
              <span className="text-xl flex-shrink-0 mt-0.5">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-pink-700">{p.to}님께</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{p.message}</p>
                <p className="text-xs text-gray-400 mt-1">익명 · {format(new Date(p.createdAt), "MM/dd HH:mm")}</p>
              </div>
              <button type="button" onClick={() => remove(p.id)}
                className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
