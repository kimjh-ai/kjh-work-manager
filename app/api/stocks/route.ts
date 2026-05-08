import { NextRequest, NextResponse } from "next/server";

const NAVER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Referer: "https://m.stock.naver.com/",
  Accept: "application/json",
  "Accept-Language": "ko-KR,ko;q=0.9",
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

// 네이버 증권 거래량 상위 종목 실시간 조회
async function fetchVolumeRanking(): Promise<{ symbol: string; name: string }[]> {
  try {
    const res = await fetch(
      "https://m.stock.naver.com/front-api/v1/rank/trade/upper?market=KOSPI&count=20",
      {
        headers: NAVER_HEADERS,
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    const list: { itemCode?: string; itemName?: string; stockName?: string }[] =
      data?.result?.stocks ?? data?.stocks ?? data?.result?.list ?? [];
    if (list.length === 0) throw new Error("empty");
    return list.map((item) => ({
      symbol: item.itemCode ?? "",
      name: item.itemName ?? item.stockName ?? "",
    })).filter((s) => s.symbol);
  } catch {
    // KOSDAQ 포함 전체 시장으로 재시도
    try {
      const res2 = await fetch(
        "https://m.stock.naver.com/front-api/v1/rank/trade/upper?market=STOCK&count=20",
        { headers: NAVER_HEADERS, next: { revalidate: 300 } }
      );
      if (!res2.ok) throw new Error("not ok");
      const data2 = await res2.json();
      const list2: { itemCode?: string; itemName?: string; stockName?: string }[] =
        data2?.result?.stocks ?? data2?.stocks ?? data2?.result?.list ?? [];
      if (list2.length === 0) throw new Error("empty");
      return list2.map((item) => ({
        symbol: item.itemCode ?? "",
        name: item.itemName ?? item.stockName ?? "",
      })).filter((s) => s.symbol);
    } catch {
      return [];
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");
  const type = searchParams.get("type");

  if (type === "popular") {
    // 거래량 상위 실시간 조회
    const rankList = await fetchVolumeRanking();
    if (rankList.length > 0) {
      const results = await Promise.all(rankList.map((t) => fetchOne(t.symbol)));
      const stocks = results
        .filter(Boolean)
        .map((s, i) => ({ ...s!, name: s!.name || rankList[i]?.name || s!.symbol }));
      return NextResponse.json({ stocks, listType: "volume" });
    }
    // 거래량 API 실패 시 빈 배열 반환 (프론트에서 처리)
    return NextResponse.json({ stocks: [], listType: "volume" });
  }

  if (symbolsParam) {
    const syms = symbolsParam.split(",");
    const targets = syms.map((s) => ({ symbol: s, name: s }));
    const results = await Promise.all(targets.map((t) => fetchOne(t.symbol)));
    const stocks = results.filter(Boolean);
    return NextResponse.json({ stocks });
  }

  return NextResponse.json({ stocks: [] });
}
