import {
  Todo,
  Note,
  Expense,
  QualityClaim,
  MaterialCost,
  WatchlistItem,
} from "./types";

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Todos
export const getTodos = (): Todo[] => getItem<Todo[]>("todos", []);
export const saveTodos = (todos: Todo[]) => setItem("todos", todos);

// Notes
export const getNotes = (): Note[] => getItem<Note[]>("notes", []);
export const saveNotes = (notes: Note[]) => setItem("notes", notes);

// Expenses
export const getExpenses = (): Expense[] => getItem<Expense[]>("expenses", []);
export const saveExpenses = (expenses: Expense[]) =>
  setItem("expenses", expenses);

// Quality Claims
export const getClaims = (): QualityClaim[] =>
  getItem<QualityClaim[]>("claims", []);
export const saveClaims = (claims: QualityClaim[]) =>
  setItem("claims", claims);

// Material Costs
export const getMaterials = (): MaterialCost[] =>
  getItem<MaterialCost[]>("materials", []);
export const saveMaterials = (materials: MaterialCost[]) =>
  setItem("materials", materials);

// Stock Watchlist (네이버 증권 6자리 코드) - 기본값 없음
export const getWatchlist = (): WatchlistItem[] =>
  getItem<WatchlistItem[]>("watchlist", []);
export const saveWatchlist = (list: WatchlistItem[]) =>
  setItem("watchlist", list);

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
