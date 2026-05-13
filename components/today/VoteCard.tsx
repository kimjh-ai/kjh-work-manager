"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

interface VoteOption {
  text: string;
  voters: string[];
}

interface Vote {
  id: string;
  question: string;
  options: VoteOption[];
  createdBy: string;
  closed: boolean;
  createdAt: string;
}

interface Props {
  myName: string;
}

export default function VoteCard({ myName }: Props) {
  const [vote, setVote] = useState<Vote | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/vote");
      const data = await res.json();
      setVote(data.vote);
    } catch { /* no-op */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const createVote = async () => {
    const validOpts = options.filter((o) => o.trim());
    if (!question.trim() || validOpts.length < 2 || saving) return;
    setSaving(true);
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", question: question.trim(), options: validOpts, createdBy: myName }),
      });
      setShowCreate(false); setQuestion(""); setOptions(["", ""]);
      await load();
    } finally { setSaving(false); }
  };

  const castVote = async (option: string) => {
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", name: myName, option }),
    });
    await load();
  };

  const closeVote = async () => {
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    await load();
  };

  const deleteVote = async () => {
    if (!confirm("투표를 삭제할까요?")) return;
    await fetch("/api/vote", { method: "DELETE" });
    setVote(null);
  };

  const totalVotes = vote ? vote.options.reduce((sum, o) => sum + o.voters.length, 0) : 0;

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800">📊 투표</h2>
        {vote && (
          <div className="flex items-center gap-2">
            {!vote.closed && vote.createdBy === myName && (
              <button type="button" onClick={closeVote}
                className="text-xs text-blue-500 border border-blue-200 rounded-lg px-2.5 py-1">
                마감
              </button>
            )}
            {(vote.closed || vote.createdBy === myName) && (
              <button type="button" onClick={deleteVote} className="text-gray-300 hover:text-red-400">
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {!vote ? (
        !showCreate ? (
          <button type="button" onClick={() => setShowCreate(true)}
            className="w-full bg-blue-50 border border-blue-200 text-blue-700 rounded-xl py-3 text-sm font-medium hover:bg-blue-100 transition-colors">
            + 투표 만들기
          </button>
        ) : (
          <div className="space-y-2">
            <input placeholder="투표 주제 (예: 오늘 점심 뭐 먹을까요?)" value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder={`선택지 ${i + 1}`} value={opt}
                  onChange={(e) => { const a = [...options]; a[i] = e.target.value; setOptions(a); }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <button type="button" onClick={() => setOptions([...options, ""])}
                className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-xl px-3 py-1.5">
                <Plus size={12} /> 선택지 추가
              </button>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={createVote}
                disabled={saving || !question.trim() || options.filter((o) => o.trim()).length < 2}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? "..." : "투표 시작"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm">
                취소
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-gray-800 flex-1">{vote.question}</p>
            {vote.closed && (
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 flex-shrink-0">마감</span>
            )}
          </div>

          <div className="space-y-2">
            {vote.options.map((opt, i) => {
              const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
              const isMyVote = opt.voters.includes(myName);
              return (
                <button key={i} type="button"
                  onClick={() => !vote.closed && castVote(opt.text)}
                  disabled={vote.closed}
                  className={`w-full text-left rounded-xl p-2.5 border transition-all relative overflow-hidden ${
                    isMyVote ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                  } ${vote.closed ? "cursor-default" : "cursor-pointer"}`}>
                  <div className="absolute inset-y-0 left-0 bg-blue-100 opacity-60 rounded-xl transition-all"
                    style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700">{opt.text}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isMyVote && <span className="text-xs text-blue-600 font-bold">✓</span>}
                      <span className="text-xs text-gray-500">{opt.voters.length}표 {totalVotes > 0 ? `(${pct}%)` : ""}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-right">
            총 {totalVotes}명 참여 · {vote.createdBy}
          </p>
        </div>
      )}
    </div>
  );
}
