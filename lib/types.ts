export type Priority = "high" | "medium" | "low";
export type Category =
  | "quality"
  | "deadline"
  | "document"
  | "meeting"
  | "expense"
  | "material"
  | "general";

export interface Todo {
  id: string;
  title: string;
  detail?: string;
  category: Category;
  priority: Priority;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: "meeting" | "memo" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: "transport" | "meal" | "supplies" | "etc";
  createdAt: string;
}

export interface QualityClaim {
  id: string;
  claimNo: string;
  brand: string;
  season: string;
  itemName: string;
  defectType: string;
  quantity: number;
  status: "pending" | "investigating" | "resolved";
  receivedDate: string;
  resolvedDate?: string;
  note?: string;
  createdAt: string;
}

export interface MaterialCost {
  id: string;
  name: string;
  spec: string;
  unit: string;
  unitPrice: number;
  supplier: string;
  updatedAt: string;
}

export interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
}
