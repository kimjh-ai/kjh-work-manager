import { NextResponse } from "next/server";

const COINS = [
  { id: "bitcoin",      symbol: "BTC", name: "비트코인" },
  { id: "ethereum",     symbol: "ETH", name: "이더리움" },
  { id: "solana",       symbol: "SOL", name: "솔라나" },
  { id: "ripple",       symbol: "XRP", name: "리플" },
  { id: "binancecoin",  symbol: "BNB", name: "바이낸스" },
  { id: "dogecoin",     symbol: "DOGE", name: "도지코인" },
];

let cache: { data: unknown; at: number } | null = null;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < 30_000) {
      return NextResponse.json(cache.data);
    }
    const ids = COINS.map((c) => c.id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=krw&include_24hr_change=true`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error("CoinGecko error");
    const raw = await res.json();
    const coins = COINS.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      price: raw[c.id]?.krw ?? 0,
      changePercent: raw[c.id]?.krw_24h_change ?? 0,
    }));
    const data = { coins, updatedAt: new Date().toISOString() };
    cache = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ coins: [], updatedAt: null });
  }
}
