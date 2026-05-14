"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Avatar from "@/components/Avatar";
import { Edit2, Check, X } from "lucide-react";

interface Birthday {
  name: string;
  month: number;
  day: number;
  imageUrl: string | null;
  wish: string;
}

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function daysUntil(month: number, day: number): number {
  const today = new Date();
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
  const diff = thisYear.getTime() - today.setHours(0,0,0,0);
  return diff >= 0 ? Math.ceil(diff / 86400000) : Math.ceil((nextYear.getTime() - Date.now()) / 86400000);
}

function birthdayEmoji(days: number): string {
  if (days === 0) return "🎂";
  if (days <= 7) return "🎁";
  if (days <= 30) return "🎉";
  return "📅";
}

export default function BirthdayPage() {
  const { user, isLoaded } = useUser();
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [wish, setWish] = useState("");
  const [saving, setSaving] = useState(false);

  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
  const myImage = user?.imageUrl ?? null;

  const load = async () => {
    try {
      const res = await fetch("/api/birthday");
      const data = await res.json();
      setBirthdays(data.birthdays ?? []);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isLoaded) return;
    load();
    const my = birthdays.find((b) => b.name === myName);
    if (my) { setMonth(my.month); setDay(my.day); setWish(my.wish ?? ""); }
  }, [isLoaded]);

  const myBirthday = birthdays.find((b) => b.name === myName);

  const startEdit = () => {
    if (myBirthday) { setMonth(myBirthday.month); setDay(myBirthday.day); setWish(myBirthday.wish ?? ""); }
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName, month, day, imageUrl: myImage, wish }),
      });
      setEditing(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    await fetch("/api/birthday", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: myName }),
    });
    setEditing(false);
    await load();
  };

  const sorted = [...birthdays].sort((a, b) => daysUntil(a.month, a.day) - daysUntil(b.month, b.day));

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const days30 = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold text-gray-900">🎂 생일 달력</h1>
        <p className="text-[13px] text-gray-400 mt-1">팀원들의 생일을 확인하고 축하해줘요</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 내 생일 등록/수정 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-bold text-gray-800">내 생일</p>
            {!editing && (
              <button type="button" onClick={startEdit}
                className="flex items-center gap-1.5 text-[12px] text-blue-500 border border-blue-200 rounded-xl px-2.5 py-1">
                <Edit2 size={12} /> {myBirthday ? "수정" : "등록하기"}
              </button>
            )}
          </div>

          {!editing ? (
            myBirthday ? (
              <div className="flex items-center gap-3 bg-pink-50 rounded-xl px-4 py-3">
                <span className="text-2xl">{birthdayEmoji(daysUntil(myBirthday.month, myBirthday.day))}</span>
                <div>
                  <p className="text-[15px] font-bold text-gray-800">{myBirthday.month}월 {myBirthday.day}일</p>
                  {daysUntil(myBirthday.month, myBirthday.day) === 0
                    ? <p className="text-[12px] text-pink-600 font-semibold">🎉 오늘이 생일이에요!</p>
                    : <p className="text-[12px] text-gray-400">{daysUntil(myBirthday.month, myBirthday.day)}일 후</p>
                  }
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 text-center py-2">아직 생일을 등록하지 않았어요</p>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-pink-400">
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={day} onChange={(e) => setDay(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-pink-400">
                  {days30.map((d) => <option key={d} value={d}>{d}일</option>)}
                </select>
              </div>
              <input placeholder="한마디 (예: 케이크는 초코!) 선택" value={wish}
                onChange={(e) => setWish(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-pink-400" />
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-pink-500 text-white rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-50">
                  <Check size={15} /> {saving ? "..." : "저장"}
                </button>
                {myBirthday && (
                  <button type="button" onClick={remove}
                    className="bg-gray-100 text-gray-500 rounded-xl px-4 text-[14px]">
                    삭제
                  </button>
                )}
                <button type="button" onClick={() => setEditing(false)}
                  className="bg-gray-100 text-gray-500 rounded-xl px-4 text-[14px]">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 팀원 생일 목록 */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">팀원 생일</p>
          {sorted.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-3xl mb-2">🎈</p>
              <p className="text-[14px] text-gray-400">아직 등록된 생일이 없어요</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {sorted.map((b, idx) => {
                const days = daysUntil(b.month, b.day);
                const isToday = days === 0;
                return (
                  <div key={b.name}
                    className={`flex items-center gap-3.5 px-4 py-3.5 ${idx < sorted.length - 1 ? "border-b border-gray-50" : ""} ${isToday ? "bg-pink-50" : ""}`}>
                    <Avatar imageUrl={b.imageUrl} name={b.name} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[15px] font-semibold text-gray-900">{b.name}</p>
                        {isToday && <span className="text-[11px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-bold">오늘!</span>}
                      </div>
                      <p className="text-[13px] text-gray-400 mt-0.5">
                        {b.month}월 {b.day}일
                        {b.wish ? ` · "${b.wish}"` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[18px]">{birthdayEmoji(days)}</p>
                      <p className="text-[11px] text-gray-400">
                        {isToday ? "🎉" : `${days}일 후`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
