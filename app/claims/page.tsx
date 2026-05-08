"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ChevronDown, AlertTriangle } from "lucide-react";
import { getClaims, saveClaims, generateId } from "@/lib/storage";
import { QualityClaim } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "pending", label: "접수", color: "bg-yellow-100 text-yellow-700" },
  { value: "investigating", label: "조사중", color: "bg-blue-100 text-blue-700" },
  { value: "resolved", label: "해결", color: "bg-green-100 text-green-700" },
] as const;

export default function ClaimsPage() {
  const [claims, setClaims] = useState<QualityClaim[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<QualityClaim["status"] | "all">("all");
  const [form, setForm] = useState({
    claimNo: "",
    brand: "",
    season: "",
    itemName: "",
    defectType: "",
    quantity: "",
    receivedDate: format(new Date(), "yyyy-MM-dd"),
    note: "",
  });

  const load = useCallback(() => setClaims(getClaims()), []);
  useEffect(() => {
    load();
  }, [load]);

  const save = (updated: QualityClaim[]) => {
    setClaims(updated);
    saveClaims(updated);
  };

  const add = () => {
    if (!form.itemName.trim() || !form.defectType.trim()) return;
    const now = new Date().toISOString();
    const claim: QualityClaim = {
      id: generateId(),
      claimNo: form.claimNo.trim() || `CL-${Date.now().toString().slice(-6)}`,
      brand: form.brand.trim(),
      season: form.season.trim(),
      itemName: form.itemName.trim(),
      defectType: form.defectType.trim(),
      quantity: Number(form.quantity) || 1,
      status: "pending",
      receivedDate: form.receivedDate,
      note: form.note.trim() || undefined,
      createdAt: now,
    };
    save([claim, ...claims]);
    setForm({
      claimNo: "",
      brand: "",
      season: "",
      itemName: "",
      defectType: "",
      quantity: "",
      receivedDate: format(new Date(), "yyyy-MM-dd"),
      note: "",
    });
    setShowForm(false);
  };

  const updateStatus = (id: string, status: QualityClaim["status"]) => {
    save(
      claims.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              resolvedDate:
                status === "resolved"
                  ? format(new Date(), "yyyy-MM-dd")
                  : undefined,
            }
          : c
      )
    );
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    save(claims.filter((c) => c.id !== id));
  };

  const filtered = claims.filter(
    (c) => filterStatus === "all" || c.status === filterStatus
  );

  const pendingCount = claims.filter((c) => c.status === "pending").length;
  const investigatingCount = claims.filter((c) => c.status === "investigating").length;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">불량 클레임</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-label="클레임 등록"
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} />
          등록
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "전체", count: claims.length, color: "bg-gray-100 text-gray-700" },
          { label: "접수", count: pendingCount, color: "bg-yellow-100 text-yellow-700" },
          { label: "조사중", count: investigatingCount, color: "bg-blue-100 text-blue-700" },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
            <p className="text-xl font-bold">{count}</p>
            <p className="text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4">
        {["all", "pending", "investigating", "resolved"].map((s) => {
          const opt = STATUS_OPTIONS.find((o) => o.value === s);
          return (
            <button
              key={s}
              type="button"
              onClick={() =>
                setFilterStatus(s as QualityClaim["status"] | "all")
              }
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterStatus === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {s === "all" ? "전체" : opt?.label}
            </button>
          );
        })}
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">클레임 등록</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="클레임번호"
              value={form.claimNo}
              onChange={(e) => setForm({ ...form, claimNo: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={form.receivedDate}
              onChange={(e) =>
                setForm({ ...form, receivedDate: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="브랜드"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="시즌 (예: 25SS)"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="품목명 *"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="불량 유형 *"
              value={form.defectType}
              onChange={(e) =>
                setForm({ ...form, defectType: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="수량"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            placeholder="비고"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
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
            클레임 내역이 없습니다
          </div>
        )}
        {filtered.map((claim) => {
          const statusOpt = STATUS_OPTIONS.find((s) => s.value === claim.status)!;
          return (
            <div key={claim.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-gray-500">
                      {claim.claimNo}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusOpt.color}`}>
                      {statusOpt.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {claim.itemName}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    불량: {claim.defectType} · {claim.quantity}pcs
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {claim.brand && (
                      <span className="text-xs text-gray-500">{claim.brand}</span>
                    )}
                    {claim.season && (
                      <span className="text-xs text-gray-500">{claim.season}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      접수: {claim.receivedDate}
                    </span>
                  </div>
                  {claim.note && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {claim.note}
                    </p>
                  )}
                  {/* 상태 변경 버튼 */}
                  <div className="flex gap-1 mt-2">
                    {STATUS_OPTIONS.filter((s) => s.value !== claim.status).map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateStatus(claim.id, s.value)}
                        className={`text-xs px-2 py-0.5 rounded-full border ${s.color} border-current`}
                      >
                        → {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(claim.id)}
                  aria-label="삭제"
                  className="text-gray-300 hover:text-red-400 flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
