import { NextRequest, NextResponse } from "next/server";

const POPULAR_KR = [
  { symbol: "005930", name: "삼성전자" },
  { symbol: "000660", name: "SK하이닉스" },
  { symbol: "034020", name: "두산에너빌리티" },
  { symbol: "373220", name: "LG에너지솔루션" },
  { symbol: "005380", name: "현대차" },
  { symbol: "000270", name: "기아" },
  { symbol: "035420", name: "NAVER" },
  { symbol: "035720", name: "카카오" },
  { symbol: "068270", name: "셀트리온" },
  { symbol: "207940", name: "삼성바이오로직스" },
  { symbol: "105560", name: "KB금융" },
  { symbol: "055550", name: "신한지주" },
  { symbol: "006400", name: "삼성SDI" },
  { symbol: "051910", name: "LG화학" },
  { symbol: "005490", name: "POSCO홀딩스" },
  { symbol: "012450", name: "한화에어로스페이스" },
  { symbol: "066570", name: "LG전자" },
  { symbol: "096770", name: "SK이노베이션" },
  { symbol: "009150", name: "삼성전기" },
  { symbol: "012330", name: "현대모비스" },
];

const NAVER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  Referer: "https://m.stock.naver.com/",
};

function toNum(val: unknown): number {
  return Number(String(val ?? "0").replace(/,/g, "")) || 0;
}

async function fetchOne(symbol: string) {
  const url = `https://m.stock.naver.com/api/stock/${symbol}/basic`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: NAVER_HEADERS,
      signal: controller.signal,
      next: { revalidate: 30 },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;
  const d = await res.json();

  const trendName: string = d.compareToPreviousPrice?.name ?? "UNCHANGED";
  const isFalling = trendName === "FALLING";

  const price = toNum(d.closePrice);
  const rawChange = toNum(d.compareToPreviousClosePrice);
  const rawPct = toNum(d.fluctuationsRatio);
  const change = isFalling ? -Math.abs(rawChange) : Math.abs(rawChange);
  const changePercent = isFalling ? -Math.abs(rawPct) : Math.abs(rawPct);

  // 프리장(시간외) 데이터
  const over = d.overMarketPriceInfo;
  let preMarket: {
    price: number;
    change: number;
    changePercent: number;
    session: string;
  } | null = null;

  if (over && over.overMarketStatus === "OPEN") {
    const overPrice = toNum(over.overPrice);
    const overChange = toNum(over.compareToPreviousClosePrice);
    const overPct = toNum(over.fluctuationsRatio);
    const overFalling = over.compareToPreviousPrice?.name === "FALLING";
    preMarket = {
      price: overPrice,
      change: overFalling ? -Math.abs(overChange) : Math.abs(overChange),
      changePercent: overFalling ? -Math.abs(overPct) : Math.abs(overPct),
      session: over.tradingSessionType ?? "UNKNOWN",
    };
  }

  return {
    symbol,
    name: d.stockName as string,
    price,
    change,
    changePercent,
    marketStatus: d.marketStatus as string,
    preMarket,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");
  const type = searchParams.get("type");

  let targets: { symbol: string; name: string }[] = [];

  if (type === "popular") {
    targets = POPULAR_KR;
  } else if (symbolsParam) {
    const syms = symbolsParam.split(",");
    targets = syms.map((s) => ({
      symbol: s,
      name: POPULAR_KR.find((p) => p.symbol === s)?.name ?? s,
    }));
  } else {
    targets = POPULAR_KR.slice(0, 10);
  }

  try {
    const results = await Promise.all(targets.map((t) => fetchOne(t.symbol)));
    const stocks = results.filter(Boolean);
    return NextResponse.json({ stocks, popularList: POPULAR_KR });
  } catch (err) {
    console.error("Naver stock fetch error:", err);
    return NextResponse.json({ stocks: [], popularList: POPULAR_KR });
  }
}
