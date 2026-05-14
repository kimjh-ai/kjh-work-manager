import { NextRequest, NextResponse } from "next/server";

interface CoinGeckoSearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

let searchCache: Record<string, { data: unknown; at: number }> = {};

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ items: [] });

  const key = q.toLowerCase().trim();
  if (searchCache[key] && Date.now() - searchCache[key].at < 60_000) {
    return NextResponse.json(searchCache[key].data);
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error("CoinGecko search error");
    const raw = await res.json();
    const coins: CoinGeckoSearchCoin[] = raw.coins ?? [];
    const items = coins.slice(0, 10).map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      rank: c.market_cap_rank,
    }));
    const data = { items };
    searchCache[key] = { data, at: Date.now() };
    // 캐시 키 1000개 초과 시 오래된 것 정리
    if (Object.keys(searchCache).length > 1000) searchCache = {};
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
