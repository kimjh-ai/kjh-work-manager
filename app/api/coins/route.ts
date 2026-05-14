import { NextResponse } from "next/server";

export const COINS = [
  { id: "bitcoin",         symbol: "BTC",  name: "비트코인" },
  { id: "ethereum",        symbol: "ETH",  name: "이더리움" },
  { id: "binancecoin",     symbol: "BNB",  name: "바이낸스" },
  { id: "solana",          symbol: "SOL",  name: "솔라나" },
  { id: "ripple",          symbol: "XRP",  name: "리플" },
  { id: "dogecoin",        symbol: "DOGE", name: "도지코인" },
  { id: "cardano",         symbol: "ADA",  name: "에이다" },
  { id: "avalanche-2",     symbol: "AVAX", name: "아발란체" },
  { id: "the-open-network",symbol: "TON",  name: "톤코인" },
  { id: "chainlink",       symbol: "LINK", name: "체인링크" },
  { id: "shiba-inu",       symbol: "SHIB", name: "시바이누" },
  { id: "polkadot",        symbol: "DOT",  name: "폴카닷" },
  { id: "near",            symbol: "NEAR", name: "니어" },
  { id: "litecoin",        symbol: "LTC",  name: "라이트코인" },
  { id: "matic-network",   symbol: "POL",  name: "폴리곤" },
  { id: "uniswap",         symbol: "UNI",  name: "유니스왑" },
  { id: "bitcoin-cash",    symbol: "BCH",  name: "비트코인캐시" },
  { id: "stellar",         symbol: "XLM",  name: "스텔라루멘" },
  { id: "pepe",            symbol: "PEPE", name: "페페" },
  { id: "tron",            symbol: "TRX",  name: "트론" },
];

let cache: { data: unknown; at: number } | null = null;
const TTL = 30_000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
    const ids = COINS.map((c) => c.id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=krw&include_24hr_change=true`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error("CoinGecko error");
    const raw = await res.json();
    const coins = COINS.map((c) => ({
      id: c.id,
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
