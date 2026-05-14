"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Star, StarOff, RefreshCw, Search, X } from "lucide-react";
// watchlist는 Redis API로 관리 (cross-device sync)
import { WatchlistItem } from "@/lib/types";

interface PreMarket {
  price: number;
  change: number;
  changePercent: number;
  session: string;
}
interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketStatus?: string;
  preMarket?: PreMarket | null;
}
interface SearchResult {
  symbol: string;
  name: string;
  market: string;
}

type Tab = "popular" | "search" | "watch" | "coin";

interface CoinData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

function StockRow({
  stock,
  watchlist,
  onToggleWatch,
}: {
  stock: StockData;
  watchlist: WatchlistItem[];
  onToggleWatch: (sym: string, name: string) => void;
}) {
  const up = stock.change > 0;
  const down = stock.change < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const cls = up ? "up" : down ? "down" : "flat";
  const inWatch = watchlist.some((w) => w.symbol === stock.symbol);

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button type="button" onClick={() => onToggleWatch(stock.symbol, stock.name)}
          aria-label={inWatch ? "관심종목 제거" : "관심종목 추가"} className="flex-shrink-0">
          {inWatch
            ? <Star size={16} className="text-yellow-400 fill-yellow-400" />
            : <StarOff size={16} className="text-gray-300" />}
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{stock.name}</p>
          <div className="flex items-center gap-1">
            <p className="text-xs text-gray-400">{stock.symbol}</p>
            {stock.marketStatus === "PREOPEN" && (
              <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">프리장</span>
            )}
            {stock.marketStatus === "CLOSE" && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">장마감</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${cls}`}>
          {stock.price.toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span>
        </p>
        <div className={`flex items-center justify-end gap-0.5 text-xs ${cls}`}>
          <Icon size={11} />
          <span>{up ? "+" : ""}{stock.change.toLocaleString()}</span>
          <span className="ml-0.5">({up ? "+" : ""}{stock.changePercent.toFixed(2)}%)</span>
        </div>
        {stock.preMarket && (() => {
          const pm = stock.preMarket!;
          const pmUp = pm.change > 0;
          const pmCls = pmUp ? "up" : pm.change < 0 ? "down" : "flat";
          return (
            <div className={`text-[11px] ${pmCls} flex items-center justify-end gap-0.5`}>
              <span className="text-gray-400">{pm.session === "PRE_MARKET" ? "프리" : "시간외"}</span>
              <span>{pm.price.toLocaleString()}</span>
              <span>({pmUp ? "+" : ""}{pm.changePercent.toFixed(2)}%)</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function StocksPage() {
  const [tab, setTab] = useState<Tab>("popular");
  const [popular, setPopular] = useState<StockData[]>([]);
  const [watchStocks, setWatchStocks] = useState<StockData[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [coinLoading, setCoinLoading] = useState(false);
  const [coinUpdatedAt, setCoinUpdatedAt] = useState("");

  // 검색
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStocks, setSearchStocks] = useState<StockData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Redis에서 관심종목 불러오기
      const wlRes = await fetch("/api/watchlist");
      const wlData = await wlRes.json();
      const wl: WatchlistItem[] = wlData.watchlist ?? [];
      setWatchlist(wl);

      const [popRes, watchRes] = await Promise.all([
        fetch("/api/stocks?type=popular"),
        wl.length > 0
          ? fetch(`/api/stocks?symbols=${wl.map((w) => w.symbol).join(",")}`)
          : Promise.resolve(null),
      ]);
      const popData = await popRes.json();
      setPopular(popData.stocks ?? []);
      if (watchRes) {
        const watchData = await watchRes.json();
        setWatchStocks(watchData.stocks ?? []);
      }
    } catch { /* no-op */ }
    finally {
      setLoading(false);
      setUpdatedAt(format(new Date(), "HH:mm:ss"));
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 검색: 자동완성 → 가격 조회
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setSearchStocks([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const items: SearchResult[] = data.items ?? [];
      setSearchResults(items);
      if (items.length > 0) {
        const codes = items.map((i) => i.symbol).join(",");
        const priceRes = await fetch(`/api/stocks?symbols=${codes}`);
        const priceData = await priceRes.json();
        // 이름 매핑: 검색 결과 이름 우선
        const nameMap = Object.fromEntries(items.map((i) => [i.symbol, i.name]));
        const stocks = (priceData.stocks ?? []).map((s: StockData) => ({
          ...s,
          name: nameMap[s.symbol] ?? s.name,
        }));
        setSearchStocks(stocks);
      } else {
        setSearchStocks([]);
      }
    } catch { setSearchStocks([]); }
    finally { setSearchLoading(false); }
  }, []);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 400);
  };

  const toggleWatch = async (symbol: string, name: string) => {
    const exists = watchlist.some((w) => w.symbol === symbol);
    const updated = exists
      ? watchlist.filter((w) => w.symbol !== symbol)
      : [...watchlist, { symbol, name }];
    setWatchlist(updated);
    // Redis에 저장
    fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: updated }),
    });
    if (!exists) {
      try {
        const res = await fetch(`/api/stocks?symbols=${updated.map((w) => w.symbol).join(",")}`);
        const data = await res.json();
        setWatchStocks(data.stocks ?? []);
      } catch { /* no-op */ }
    } else {
      setWatchStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    }
  };

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

  useEffect(() => {
    if (tab === "coin" && coins.length === 0) loadCoins();
  }, [tab, coins.length, loadCoins]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "popular", label: "📊 인기" },
    { key: "coin",    label: "🪙 코인" },
    { key: "search",  label: "🔍 검색" },
    { key: "watch",   label: `⭐ 관심(${watchlist.length})` },
  ];

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">주식</h1>
          {updatedAt && <p className="text-xs text-gray-400 mt-0.5">{updatedAt} 기준</p>}
        </div>
        <button type="button" onClick={loadData} aria-label="새로고침"
          className={`text-gray-400 hover:text-blue-600 transition-colors ${loading ? "animate-spin" : ""}`}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 인기종목 탭 ── */}
      {tab === "popular" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">📊 KOSPI 주요 종목 20</span>
                <span className="text-xs text-gray-400">{popular.length}종목</span>
              </div>
              {popular.map((s) => (
                <StockRow key={s.symbol} stock={s} watchlist={watchlist} onToggleWatch={toggleWatch} />
              ))}
              <p className="text-xs text-gray-400 text-center mt-3">★ 터치 → 관심종목 추가</p>
            </div>
          )}
        </>
      )}

      {/* ── 코인 탭 ── */}
      {tab === "coin" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-gray-400">코인게코 기준 · KRW · 24h 변동</p>
            <button type="button" onClick={loadCoins} aria-label="새로고침"
              className={`text-gray-400 hover:text-blue-500 transition-colors ${coinLoading ? "animate-spin" : ""}`}>
              <RefreshCw size={15} />
            </button>
          </div>
          {coinLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : coins.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <p className="text-sm">데이터를 불러올 수 없어요</p>
            </div>
          ) : (
            <div className="card">
              {coins.map((coin, idx) => {
                const up = coin.changePercent > 0;
                const down = coin.changePercent < 0;
                const cls = up ? "up" : down ? "down" : "flat";
                const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
                return (
                  <div key={coin.symbol} className={`flex items-center justify-between py-3 ${idx < coins.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-yellow-50 flex items-center justify-center text-[16px] font-black text-yellow-600 flex-shrink-0">
                        {coin.symbol.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-gray-800">{coin.name}</p>
                        <p className="text-[12px] text-gray-400">{coin.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[15px] font-semibold ${cls}`}>
                        {coin.price >= 1_000_000
                          ? `${(coin.price / 1_000_000).toFixed(2)}백만`
                          : coin.price >= 1000
                          ? `${coin.price.toLocaleString()}`
                          : coin.price.toFixed(2)}
                        <span className="text-[12px] font-normal ml-0.5">원</span>
                      </p>
                      <div className={`flex items-center justify-end gap-0.5 text-[12px] ${cls}`}>
                        <Icon size={11} />
                        <span>{up ? "+" : ""}{coin.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {coinUpdatedAt && <p className="text-[11px] text-gray-400 text-center mt-3 pt-3 border-t border-gray-50">{coinUpdatedAt} 기준</p>}
            </div>
          )}
        </>
      )}

      {/* ── 검색 탭 ── */}
      {tab === "search" && (
        <>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="종목명 입력 (예: 삼성, 셀트리온, 카카오...)"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setSearchResults([]); setSearchStocks([]); }}
                aria-label="검색 초기화" className="absolute right-3 top-2.5 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>

          {searchLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!searchLoading && query && searchStocks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">검색 결과가 없습니다</p>
          )}

          {!searchLoading && !query && (
            <div className="text-center py-12 text-gray-400">
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">코스피·코스닥 전 종목 검색</p>
              <p className="text-xs mt-1">종목명을 입력하세요</p>
            </div>
          )}

          {!searchLoading && searchStocks.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">검색 결과</span>
                <span className="text-xs text-gray-400">{searchStocks.length}종목</span>
              </div>
              {searchStocks.map((s) => (
                <StockRow key={s.symbol} stock={s} watchlist={watchlist} onToggleWatch={toggleWatch} />
              ))}
            </div>
          )}

          {/* 가격 없는 결과 (거래소 외 종목) */}
          {!searchLoading && searchResults.length > searchStocks.length && (
            <div className="mt-2 card">
              <p className="text-xs text-gray-500 mb-2">가격 정보 없음 (ETF·펀드·지수)</p>
              {searchResults
                .filter((r) => !searchStocks.some((s) => s.symbol === r.symbol))
                .map((r) => (
                  <div key={r.symbol} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-700">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.symbol} · {r.market}</p>
                    </div>
                    <button type="button" onClick={() => toggleWatch(r.symbol, r.name)}
                      aria-label="관심종목 추가" className="flex-shrink-0">
                      {watchlist.some((w) => w.symbol === r.symbol)
                        ? <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        : <StarOff size={16} className="text-gray-300" />}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* ── 관심종목 탭 ── */}
      {tab === "watch" && (
        <div className="card">
          {watchlist.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Star size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">관심종목이 없습니다</p>
              <p className="text-xs mt-1">인기종목·검색 탭에서 ★ 눌러 추가하세요</p>
            </div>
          ) : watchStocks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {watchStocks.map((s) => (
                <StockRow key={s.symbol} stock={s} watchlist={watchlist} onToggleWatch={toggleWatch} />
              ))}
              <p className="text-xs text-gray-400 text-center mt-3 pt-3 border-t border-gray-100">
                관심종목 {watchlist.length}개
              </p>
            </>
          )}
        </div>
      )}

      <div className="mt-4 bg-blue-50 rounded-xl p-3">
        <p className="text-xs text-blue-500">
          📌 네이버 증권 실시간 · 코스피·코스닥 전 종목 검색 가능 · ★ 터치로 관심종목 저장
        </p>
      </div>
    </div>
  );
}
