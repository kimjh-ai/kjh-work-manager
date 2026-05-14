"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Star, StarOff, RefreshCw, Search, X } from "lucide-react";
import { WatchlistItem } from "@/lib/types";

/* ── 타입 ── */
interface StockData {
  symbol: string; name: string; price: number; change: number;
  changePercent: number; marketStatus?: string;
  preMarket?: { price: number; change: number; changePercent: number; session: string } | null;
}
interface CoinData { id: string; symbol: string; name: string; price: number; changePercent: number }
interface CoinWatchItem { id: string; symbol: string; name: string }
interface SearchResult { symbol: string; name: string; market: string }
interface CoinSearchResult { id: string; symbol: string; name: string; rank: number | null }

type MainTab = "popular" | "search" | "watch";
type SearchMode = "stock" | "coin";

/* ── 주식 행 ── */
function StockRow({ stock, watchlist, onToggle }: { stock: StockData; watchlist: WatchlistItem[]; onToggle: (sym: string, name: string) => void }) {
  const up = stock.change > 0; const down = stock.change < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const cls = up ? "up" : down ? "down" : "flat";
  const inWatch = watchlist.some((w) => w.symbol === stock.symbol);
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button type="button" onClick={() => onToggle(stock.symbol, stock.name)}
          aria-label={inWatch ? "관심 제거" : "관심 추가"} className="flex-shrink-0">
          {inWatch ? <Star size={16} className="text-yellow-400 fill-yellow-400" /> : <StarOff size={16} className="text-gray-300" />}
        </button>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-gray-800 truncate">{stock.name}</p>
          <div className="flex items-center gap-1">
            <p className="text-[12px] text-gray-400">{stock.symbol}</p>
            {stock.marketStatus === "PREOPEN" && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">프리장</span>}
            {stock.marketStatus === "CLOSE" && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">장마감</span>}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-[14px] font-semibold ${cls}`}>{stock.price.toLocaleString()}<span className="text-[12px] font-normal ml-0.5">원</span></p>
        <div className={`flex items-center justify-end gap-0.5 text-[12px] ${cls}`}>
          <Icon size={11} /><span>{up ? "+" : ""}{stock.changePercent.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── 코인 행 ── */
function CoinRow({ coin, watchlist, onToggle }: { coin: CoinData; watchlist: CoinWatchItem[]; onToggle: (id: string, symbol: string, name: string) => void }) {
  const up = coin.changePercent > 0; const down = coin.changePercent < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const cls = up ? "up" : down ? "down" : "flat";
  const inWatch = watchlist.some((w) => w.id === coin.id);
  const fmtPrice = (p: number) => {
    if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(2)}M`;
    if (p >= 1000) return p.toLocaleString();
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(6).replace(/0+$/, "");
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button type="button" onClick={() => onToggle(coin.id, coin.symbol, coin.name)}
          aria-label={inWatch ? "관심 제거" : "관심 추가"} className="flex-shrink-0">
          {inWatch ? <Star size={16} className="text-yellow-400 fill-yellow-400" /> : <StarOff size={16} className="text-gray-300" />}
        </button>
        <div className="w-7 h-7 rounded-full bg-yellow-50 flex items-center justify-center text-[12px] font-black text-yellow-600 flex-shrink-0">
          {coin.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-gray-800 truncate">{coin.name}</p>
          <p className="text-[12px] text-gray-400">{coin.symbol}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-[14px] font-semibold ${cls}`}>{fmtPrice(coin.price)}<span className="text-[12px] font-normal ml-0.5">원</span></p>
        <div className={`flex items-center justify-end gap-0.5 text-[12px] ${cls}`}>
          <Icon size={11} /><span>{up ? "+" : ""}{coin.changePercent.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function StocksPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? "";

  const [tab, setTab] = useState<MainTab>("popular");
  const [searchMode, setSearchMode] = useState<SearchMode>("stock");

  // 주식
  const [popular, setPopular] = useState<StockData[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchStocks, setWatchStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  // 코인
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [coinWatchlist, setCoinWatchlist] = useState<CoinWatchItem[]>([]);
  const [watchCoins, setWatchCoins] = useState<CoinData[]>([]);
  const [coinLoading, setCoinLoading] = useState(true);
  const [coinUpdatedAt, setCoinUpdatedAt] = useState("");

  // 검색
  const [query, setQuery] = useState("");
  const [stockSearchResults, setStockSearchResults] = useState<SearchResult[]>([]);
  const [stockSearchData, setStockSearchData] = useState<StockData[]>([]);
  const [coinSearchResults, setCoinSearchResults] = useState<CoinSearchResult[]>([]);
  const [coinSearchData, setCoinSearchData] = useState<CoinData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 주식 로드 */
  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const wlRes = await fetch("/api/watchlist");
      const wl: WatchlistItem[] = (await wlRes.json()).watchlist ?? [];
      setWatchlist(wl);
      const [popRes, watchRes] = await Promise.all([
        fetch("/api/stocks?type=popular"),
        wl.length > 0 ? fetch(`/api/stocks?symbols=${wl.map((w) => w.symbol).join(",")}`) : Promise.resolve(null),
      ]);
      setPopular((await popRes.json()).stocks ?? []);
      if (watchRes) setWatchStocks((await watchRes.json()).stocks ?? []);
    } catch { /* no-op */ }
    finally { setLoading(false); setUpdatedAt(format(new Date(), "HH:mm:ss")); }
  }, []);

  /* 코인 로드 */
  const loadCoins = useCallback(async () => {
    setCoinLoading(true);
    try {
      const res = await fetch("/api/coins");
      const data = await res.json();
      setCoins(data.coins ?? []);
      if (data.updatedAt) setCoinUpdatedAt(format(new Date(data.updatedAt), "HH:mm:ss"));
    } catch { /* no-op */ }
    finally { setCoinLoading(false); }
  }, []);

  /* 코인 관심목록 로드 */
  const loadCoinWatch = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/coin-watchlist?userId=${userId}`);
      const data = await res.json();
      setCoinWatchlist(data.watchlist ?? []);
    } catch { /* no-op */ }
  }, [userId]);

  useEffect(() => { loadStocks(); loadCoins(); }, [loadStocks, loadCoins]);
  useEffect(() => { if (isLoaded && userId) loadCoinWatch(); }, [isLoaded, userId, loadCoinWatch]);

  /* 관심 코인 가격 갱신 */
  useEffect(() => {
    if (coinWatchlist.length === 0 || coins.length === 0) { setWatchCoins([]); return; }
    const watchIds = new Set(coinWatchlist.map((w) => w.id));
    const matched = coins.filter((c) => watchIds.has(c.id));
    // 코인 API에 없는 것은 직접 조회
    const missing = coinWatchlist.filter((w) => !matched.some((m) => m.id === w.id));
    if (missing.length > 0) {
      const ids = missing.map((m) => m.id).join(",");
      fetch(`/api/coins?ids=${ids}`).then((r) => r.json()).then((d) => {
        setWatchCoins([...matched, ...(d.coins ?? [])]);
      }).catch(() => setWatchCoins(matched));
    } else {
      setWatchCoins(matched);
    }
  }, [coinWatchlist, coins]);

  /* 주식 관심 토글 */
  const toggleStockWatch = async (symbol: string, name: string) => {
    const exists = watchlist.some((w) => w.symbol === symbol);
    const updated = exists ? watchlist.filter((w) => w.symbol !== symbol) : [...watchlist, { symbol, name }];
    setWatchlist(updated);
    fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watchlist: updated }) });
    if (!exists) {
      const res = await fetch(`/api/stocks?symbols=${updated.map((w) => w.symbol).join(",")}`);
      setWatchStocks((await res.json()).stocks ?? []);
    } else {
      setWatchStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    }
  };

  /* 코인 관심 토글 */
  const toggleCoinWatch = (id: string, symbol: string, name: string) => {
    const exists = coinWatchlist.some((w) => w.id === id);
    const updated = exists ? coinWatchlist.filter((w) => w.id !== id) : [...coinWatchlist, { id, symbol, name }];
    setCoinWatchlist(updated);
    fetch("/api/coin-watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, watchlist: updated }) });
  };

  /* 검색 */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setStockSearchResults([]); setStockSearchData([]); setCoinSearchResults([]); setCoinSearchData([]); return; }
    setSearchLoading(true);
    try {
      if (searchMode === "stock") {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        const items: SearchResult[] = (await res.json()).items ?? [];
        setStockSearchResults(items);
        if (items.length > 0) {
          const priceRes = await fetch(`/api/stocks?symbols=${items.map((i) => i.symbol).join(",")}`);
          const nameMap = Object.fromEntries(items.map((i) => [i.symbol, i.name]));
          setStockSearchData(((await priceRes.json()).stocks ?? []).map((s: StockData) => ({ ...s, name: nameMap[s.symbol] ?? s.name })));
        }
      } else {
        const res = await fetch(`/api/coins/search?q=${encodeURIComponent(q)}`);
        const items: CoinSearchResult[] = (await res.json()).items ?? [];
        setCoinSearchResults(items);
        if (items.length > 0) {
          // 로컬 coins 캐시에서 매핑
          const found = items.map((item) => coins.find((c) => c.id === item.id)).filter(Boolean) as CoinData[];
          setCoinSearchData(found);
        }
      }
    } catch { /* no-op */ }
    finally { setSearchLoading(false); }
  }, [searchMode, coins]);

  const handleQuery = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 400);
  };

  const clearSearch = () => { setQuery(""); setStockSearchResults([]); setStockSearchData([]); setCoinSearchResults([]); setCoinSearchData([]); };

  const TABS = [
    { key: "popular" as MainTab, label: "📊 인기" },
    { key: "search"  as MainTab, label: "🔍 검색" },
    { key: "watch"   as MainTab, label: `⭐ 관심(${watchlist.length + coinWatchlist.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 헤더 */}
      <div className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">📈 주식 & 코인</h1>
            <p className="text-[13px] text-gray-400 mt-1">실시간 시세 조회</p>
          </div>
          <button type="button" onClick={() => { loadStocks(); loadCoins(); }} aria-label="새로고침"
            className={`text-gray-400 hover:text-blue-500 transition-colors ${loading || coinLoading ? "animate-spin" : ""}`}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          {TABS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 인기 탭 ── */}
        {tab === "popular" && (
          <div className="space-y-4">
            {/* 주식 섹션 */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">📊 KOSPI 인기 주식</p>
              <div className="bg-white rounded-2xl shadow-sm px-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <>
                    {popular.map((s) => <StockRow key={s.symbol} stock={s} watchlist={watchlist} onToggle={toggleStockWatch} />)}
                    {updatedAt && <p className="text-[11px] text-gray-400 text-center py-2">{updatedAt} 기준 · ★ 터치로 관심 추가</p>}
                  </>
                )}
              </div>
            </div>

            {/* 코인 섹션 */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">🪙 코인 TOP 20</p>
              <div className="bg-white rounded-2xl shadow-sm px-4">
                {coinLoading ? (
                  <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <>
                    {coins.map((c) => <CoinRow key={c.id} coin={c} watchlist={coinWatchlist} onToggle={toggleCoinWatch} />)}
                    {coinUpdatedAt && <p className="text-[11px] text-gray-400 text-center py-2">{coinUpdatedAt} 기준 · CoinGecko</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 검색 탭 ── */}
        {tab === "search" && (
          <div className="space-y-3">
            {/* 주식/코인 토글 */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(["stock", "coin"] as SearchMode[]).map((m) => (
                <button key={m} type="button" onClick={() => { setSearchMode(m); clearSearch(); }}
                  className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${searchMode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                  {m === "stock" ? "📊 주식" : "🪙 코인"}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input type="text" value={query} onChange={(e) => handleQuery(e.target.value)}
                placeholder={searchMode === "stock" ? "종목명 입력 (예: 삼성, 카카오...)" : "코인 입력 (예: Bitcoin, SOL...)"}
                className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
              {query && (
                <button type="button" onClick={clearSearch} aria-label="초기화" className="absolute right-3 top-2.5 text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>

            {searchLoading && <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}

            {!searchLoading && !query && (
              <div className="text-center py-12 text-gray-400">
                <Search size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-[14px]">{searchMode === "stock" ? "코스피·코스닥 전 종목" : "글로벌 코인"} 검색</p>
              </div>
            )}

            {/* 주식 검색 결과 */}
            {!searchLoading && searchMode === "stock" && stockSearchData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm px-4">
                {stockSearchData.map((s) => <StockRow key={s.symbol} stock={s} watchlist={watchlist} onToggle={toggleStockWatch} />)}
              </div>
            )}
            {!searchLoading && searchMode === "stock" && query && stockSearchData.length === 0 && (
              <p className="text-[14px] text-gray-400 text-center py-8">검색 결과가 없어요</p>
            )}

            {/* 코인 검색 결과 */}
            {!searchLoading && searchMode === "coin" && coinSearchResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm px-4">
                {coinSearchResults.map((item) => {
                  const found = coinSearchData.find((c) => c.id === item.id);
                  if (found) return <CoinRow key={found.id} coin={found} watchlist={coinWatchlist} onToggle={toggleCoinWatch} />;
                  const inWatch = coinWatchlist.some((w) => w.id === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleCoinWatch(item.id, item.symbol, item.name)} aria-label="관심 추가">
                          {inWatch ? <Star size={16} className="text-yellow-400 fill-yellow-400" /> : <StarOff size={16} className="text-gray-300" />}
                        </button>
                        <div className="w-7 h-7 rounded-full bg-yellow-50 flex items-center justify-center text-[12px] font-black text-yellow-600">{item.symbol.slice(0, 2)}</div>
                        <div>
                          <p className="text-[14px] font-medium text-gray-800">{item.name}</p>
                          <p className="text-[12px] text-gray-400">{item.symbol}{item.rank ? ` · #${item.rank}` : ""}</p>
                        </div>
                      </div>
                      <p className="text-[12px] text-gray-300">시세 없음</p>
                    </div>
                  );
                })}
              </div>
            )}
            {!searchLoading && searchMode === "coin" && query && coinSearchResults.length === 0 && (
              <p className="text-[14px] text-gray-400 text-center py-8">검색 결과가 없어요</p>
            )}
          </div>
        )}

        {/* ── 관심 탭 ── */}
        {tab === "watch" && (
          <div className="space-y-4">
            {/* 관심 주식 */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">📊 관심 주식 {watchlist.length}개</p>
              {watchlist.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                  <Star size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-[13px] text-gray-400">인기·검색 탭에서 ★ 눌러 추가</p>
                </div>
              ) : watchStocks.length === 0 ? (
                <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm px-4">
                  {watchStocks.map((s) => <StockRow key={s.symbol} stock={s} watchlist={watchlist} onToggle={toggleStockWatch} />)}
                </div>
              )}
            </div>

            {/* 관심 코인 */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-2">🪙 관심 코인 {coinWatchlist.length}개</p>
              {coinWatchlist.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                  <Star size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-[13px] text-gray-400">인기·검색 탭에서 ★ 눌러 추가</p>
                </div>
              ) : watchCoins.length === 0 ? (
                <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm px-4">
                  {watchCoins.map((c) => <CoinRow key={c.id} coin={c} watchlist={coinWatchlist} onToggle={toggleCoinWatch} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
