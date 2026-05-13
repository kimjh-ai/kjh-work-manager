"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Avatar from "@/components/Avatar";

interface Order {
  name: string;
  imageUrl: string | null;
  menu: string;
  note: string;
}

interface CoffeeRun {
  id: string;
  startedBy: string;
  location: string;
  deadline: string;
  orders: Order[];
  closed: boolean;
}

interface Props {
  myName: string;
  myImage: string | null;
}

const CAFES = ["스타벅스", "투썸", "메가커피", "컴포즈커피", "이디야", "기타"];

export default function CoffeeRunCard({ myName, myImage }: Props) {
  const [run, setRun] = useState<CoffeeRun | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [location, setLocation] = useState("스타벅스");
  const [deadline, setDeadline] = useState("");
  const [menu, setMenu] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/coffee");
      const data = await res.json();
      setRun(data.run);
    } catch { /* no-op */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const startRun = async () => {
    if (!deadline || saving) return;
    setSaving(true);
    try {
      await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", startedBy: myName, location, deadline }),
      });
      setShowStart(false);
      await load();
    } finally { setSaving(false); }
  };

  const submitOrder = async () => {
    if (!menu.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "order", name: myName, imageUrl: myImage, menu: menu.trim(), note: note.trim() }),
      });
      setMenu(""); setNote(""); setShowOrder(false);
      await load();
    } finally { setSaving(false); }
  };

  const closeRun = async () => {
    await fetch("/api/coffee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    await load();
  };

  const deleteRun = async () => {
    if (!confirm("커피런을 삭제할까요?")) return;
    await fetch("/api/coffee", { method: "DELETE" });
    setRun(null);
  };

  const myOrder = run?.orders.find((o) => o.name === myName);

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800">☕ 커피런</h2>
        {run && run.startedBy === myName && (
          <div className="flex items-center gap-2">
            {!run.closed && (
              <button type="button" onClick={closeRun}
                className="text-xs text-orange-500 border border-orange-200 rounded-lg px-2.5 py-1">
                마감
              </button>
            )}
            <button type="button" onClick={deleteRun} className="text-gray-300 hover:text-red-400">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {!run ? (
        !showStart ? (
          <button type="button" onClick={() => setShowStart(true)}
            className="w-full bg-amber-50 border border-amber-200 text-amber-700 rounded-xl py-3 text-sm font-medium hover:bg-amber-100 transition-colors">
            + 커피런 시작하기
          </button>
        ) : (
          <div className="space-y-2">
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              {CAFES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">마감 시간</span>
              <input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={startRun} disabled={saving || !deadline}
                className="flex-1 bg-amber-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? "..." : "☕ 시작!"}
              </button>
              <button type="button" onClick={() => setShowStart(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm">
                취소
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${run.closed ? "bg-gray-100" : "bg-amber-50"}`}>
            <div>
              <span className="text-sm font-semibold text-amber-700">{run.location}</span>
              <span className="text-xs text-gray-500 ml-2">by {run.startedBy} · {run.deadline}까지</span>
            </div>
            {run.closed && (
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">마감</span>
            )}
          </div>

          {run.orders.length > 0 && (
            <div className="space-y-2">
              {run.orders.map((order, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Avatar imageUrl={order.imageUrl} name={order.name} size={28} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-700">{order.name}</span>
                    <span className="text-xs text-gray-600 ml-1.5">{order.menu}</span>
                    {order.note && <span className="text-xs text-gray-400 ml-1">({order.note})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!run.closed && (
            !showOrder ? (
              <button type="button"
                onClick={() => { setMenu(myOrder?.menu ?? ""); setNote(myOrder?.note ?? ""); setShowOrder(true); }}
                className="w-full bg-amber-50 border border-amber-200 text-amber-700 rounded-xl py-2.5 text-sm font-medium">
                {myOrder ? "✏️ 주문 수정" : "+ 주문하기"}
              </button>
            ) : (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <input placeholder="메뉴 (예: 아이스 아메리카노)" value={menu}
                  onChange={(e) => setMenu(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <input placeholder="요청사항 (예: 연하게, 샷 추가)" value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <div className="flex gap-2">
                  <button type="button" onClick={submitOrder} disabled={saving || !menu.trim()}
                    className="flex-1 bg-amber-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                    {saving ? "..." : "주문 완료"}
                  </button>
                  <button type="button" onClick={() => setShowOrder(false)}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm">
                    취소
                  </button>
                </div>
              </div>
            )
          )}

          {run.closed && run.orders.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-1">주문이 없었어요</p>
          )}
        </div>
      )}
    </div>
  );
}
