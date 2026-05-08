"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Search, Package } from "lucide-react";
import { getMaterials, saveMaterials, generateId } from "@/lib/storage";
import { MaterialCost } from "@/lib/types";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<MaterialCost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    spec: "",
    unit: "개",
    unitPrice: "",
    supplier: "",
  });

  const load = useCallback(() => setMaterials(getMaterials()), []);
  useEffect(() => {
    load();
  }, [load]);

  const save = (updated: MaterialCost[]) => {
    setMaterials(updated);
    saveMaterials(updated);
  };

  const add = () => {
    if (!form.name.trim() || !form.unitPrice) return;
    const now = new Date().toISOString();
    const mat: MaterialCost = {
      id: generateId(),
      name: form.name.trim(),
      spec: form.spec.trim(),
      unit: form.unit.trim() || "개",
      unitPrice: Number(form.unitPrice),
      supplier: form.supplier.trim(),
      updatedAt: now,
    };
    save([mat, ...materials]);
    setForm({ name: "", spec: "", unit: "개", unitPrice: "", supplier: "" });
    setShowForm(false);
  };

  const remove = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    save(materials.filter((m) => m.id !== id));
  };

  const filtered = materials.filter(
    (m) =>
      !search ||
      m.name.includes(search) ||
      m.spec.includes(search) ||
      m.supplier.includes(search)
  );

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">부자재 단가</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-label="단가 추가"
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="품목명, 규격, 공급업체 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {showForm && (
        <div className="card mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">단가 추가</h2>
          <input
            type="text"
            placeholder="품목명 * (예: 케어라벨)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="규격/사양 (예: 5×3cm, 면 100%)"
            value={form.spec}
            onChange={(e) => setForm({ ...form, spec: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="단가 (원) *"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="단위 (개/M/kg)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="공급업체"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">등록된 부자재가 없습니다</p>
          </div>
        )}
        {filtered.map((mat) => (
          <div key={mat.id} className="card flex items-start gap-3">
            <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-teal-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{mat.name}</p>
              {mat.spec && (
                <p className="text-xs text-gray-500 mt-0.5">{mat.spec}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-blue-600">
                  {mat.unitPrice.toLocaleString()}원/{mat.unit}
                </span>
                {mat.supplier && (
                  <span className="text-xs text-gray-400">{mat.supplier}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                업데이트: {format(new Date(mat.updatedAt), "yyyy.MM.dd")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(mat.id)}
              aria-label="삭제"
              className="text-gray-300 hover:text-red-400 flex-shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
