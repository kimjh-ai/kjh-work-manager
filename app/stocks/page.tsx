"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  StarOff,
  RefreshCw,
  Search,
} from "lucide-react";
import { getWatchlist, saveWatchlist } from "@/lib/storage";
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

interface PopularItem {
  symbol: string;
  name: string;
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
        <button
          type="button"
          onClick={() => onToggleWatch(stock.symbol, stock.name)}
          aria-label={inWatch ? "관심종목 제거" : "관심종목 추가"}
          className="flex-shrink-0"
        >
          {inWatch ? (
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
          ) : (
            <StarOff size={16} className="text-gray-300" />
          )}
        </button>
        <div>
          <p className="text-sm font-medium text-gray-800">{stock.name}</p>
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
      <div className="text-right">
        {/* 정규장 가격 */}
        <p className={`text-sm font-semibold ${cls}`}>
          {stock.price.toLocaleString()}
          <span className="text-xs font-normal ml-0.5">원</span>
        </p>
        <div className={`flex items-center justify-end gap-0.5 text-xs ${cls}`}>
          <Icon size={11} />
          <span>{up ? "+" : ""}{stock.change.toLocaleString()}</span>
          <span className="ml-0.5">({up ? "+" : ""}{stock.changePercent.toFixed(2)}%)</span>
        </div>
        {/* 프리장 가격 */}
        {stock.preMarket && (
          <div className="mt-0.5 text-right">
            {(() => {
              const pm = stock.preMarket!;
              const pmUp = pm.change > 0;
              const pmDown = pm.change < 0;
              const pmCls = pmUp ? "up" : pmDown ? "down" : "flat";
              const label = pm.session === "PRE_MARKET" ? "프리" : "시간외";
              return (
                <div className={`text-[11px] ${pmCls} flex items-center justify-end gap-0.5`}>
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium">{pm.price.toLocaleString()}</span>
                  <span>({pmUp ? "+" : ""}{pm.changePercent.toFixed(2)}%)</span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StocksPage() {
  const [popular, setPopular] = useState<StockData[]>([]);
  const [watchStocks, setWatchStocks] = useState<StockData[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [popularList, setPopularList] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"popular" | "watch">("popular");
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const wl = getWatchlist();
    setWatchlist(wl);
    try {
      const [popRes, watchRes] = await Promise.all([
        fetch("/api/stocks?type=popular"),
        wl.length > 0
          ? fetch(`/api/stocks?symbols=${wl.map((w) => w.symbol).join(",")}`)
          : Promise.resolve(null),
      ]);
      const popData = await popRes.json();
      setPopular(popData.stocks ?? []);
      setPopularList(popData.popularList ?? []);
      if (watchRes) {
        const watchData = await watchRes.json();
        setWatchStocks(watchData.stocks ?? []);
      }
    } catch {
      setPopular([]);
    } finally {
      setLoading(false);
      setUpdatedAt(format(new Date(), "HH:mm:ss"));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleWatch = async (symbol: string, name: string) => {
    const cur = getWatchlist();
    const exists = cur.some((w) => w.symbol === symbol);
    const updated = exists
      ? cur.filter((w) => w.symbol !== symbol)
      : [...cur, { symbol, name }];
    saveWatchlist(updated);
    setWatchlist(updated);
    if (!exists) {
      try {
        const res = await fetch(`/api/stocks?symbols=${updated.map((w) => w.symbol).join(",")}`);
        const data = await res.json();
        setWatchStocks(data.stocks ?? []);
      } catch {
        /* no-op */
      }
    } else {
      setWatchStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    }
  };

  const displayPopular = search
    ? popular.filter(
        (s) =>
          s.name.includes(search) ||
          s.symbol.toLowerCase().includes(search.toLowerCase())
      )
    : popular;

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">주식</h1>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-0.5">{updatedAt} 업데이트</p>
          )}
        </div>
        <button
          type="button"
          onClick={loadData}
          aria-label="새로고침"
          className={`text-gray-400 hover:text-blue-600 transition-colors ${loading ? "animate-spin" : ""}`}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {(["popular", "watch"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {t === "popular" ? "📊 인기종목" : `⭐ 관심종목 (${watchlist.length})`}
          </button>
        ))}
      </div>

      {/* 검색 (인기종목 탭) */}
      {tab === "popular" && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="종목명 또는 코드 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "popular" ? (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              KOSPI 인기종목
            </span>
            <span className="text-xs text-gray-400">
              {displayPopular.length}종목
            </span>
          </div>
          {displayPopular.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              검색 결과가 없습니다
            </p>
          ) : (
            displayPopular.map((s) => (
              <StockRow
                key={s.symbol}
                stock={s}
                watchlist={watchlist}
                onToggleWatch={toggleWatch}
              />
            ))
          )}
          <p className="text-xs text-gray-400 text-center mt-3">
            ★ 터치하면 관심종목에 추가/제거됩니다
          </p>
        </div>
      ) : (
        <div className="card">
          {watchlist.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Star size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">관심종목이 없습니다</p>
              <p className="text-xs mt-1">인기종목 탭에서 ☆를 눌러 추가하세요</p>
            </div>
          ) : watchStocks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              데이터를 불러오는 중...
            </p>
          ) : (
            <>
              {watchStocks.map((s) => (
                <StockRow
                  key={s.symbol}
                  stock={s}
                  watchlist={watchlist}
                  onToggleWatch={toggleWatch}
                />
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  관심종목 {watchlist.length}개
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* 안내 */}
      <div className="mt-4 bg-blue-50 rounded-xl p-3">
        <p className="text-xs text-blue-600 font-medium mb-1">📌 이용 안내</p>
        <p className="text-xs text-blue-500">
          • 네이버 증권 데이터 기준 (실시간)<br />
          • 회사 PC에서 차단된 주식 정보를 확인할 수 있습니다<br />
          • ★ 터치로 관심종목 저장
        </p>
      </div>
    </div>
  );
}
