"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";

const MOODS = [
  { emoji: "😊", label: "좋아요" },
  { emoji: "😐", label: "무난해요" },
  { emoji: "😫", label: "힘들어요" },
  { emoji: "🔥", label: "불타요" },
  { emoji: "💀", label: "죽겠어요" },
];

interface MoodEntry {
  emoji: string;
  imageUrl: string | null;
}

interface Props {
  myName: string;
  myImage: string | null;
}

export default function MoodCard({ myName, myImage }: Props) {
  const [moods, setMoods] = useState<Record<string, MoodEntry>>({});
  const [myMood, setMyMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/mood");
      const data = await res.json();
      setMoods(data.moods ?? {});
      if (data.moods?.[myName]) setMyMood(data.moods[myName].emoji);
    } catch { /* no-op */ }
  };

  useEffect(() => { load(); }, [myName]);

  const selectMood = async (emoji: string) => {
    if (saving || myMood === emoji) return;
    setSaving(true);
    setMyMood(emoji);
    try {
      await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName, emoji, imageUrl: myImage }),
      });
      await load();
    } finally { setSaving(false); }
  };

  const entries = Object.entries(moods);

  return (
    <div className="card mb-3">
      <h2 className="text-sm font-bold text-gray-800 mb-3">🌡️ 오늘 분위기</h2>

      <div className="flex gap-1.5 mb-3">
        {MOODS.map(({ emoji, label }) => (
          <button key={emoji} type="button" onClick={() => selectMood(emoji)} title={label}
            className={`flex-1 text-xl py-2.5 rounded-xl transition-all ${
              myMood === emoji
                ? "bg-yellow-100 ring-2 ring-yellow-300 scale-110 shadow-sm"
                : "bg-gray-50 hover:bg-gray-100"
            }`}>
            {emoji}
          </button>
        ))}
      </div>

      {entries.length > 0 ? (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
          {entries.map(([name, entry]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div className="relative">
                <Avatar imageUrl={entry.imageUrl} name={name} size={34} />
                <span className="absolute -bottom-1 -right-1 text-base leading-none">{entry.emoji}</span>
              </div>
              <span className="text-xs text-gray-500 truncate max-w-[40px] text-center">{name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center pt-1">
          {myMood ? "오늘 첫 번째! 팀원들도 기다리는 중..." : "오늘 기분을 선택해보세요 😊"}
        </p>
      )}
    </div>
  );
}
