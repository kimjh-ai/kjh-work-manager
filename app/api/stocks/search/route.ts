import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 1) {
    return NextResponse.json({ items: [] });
  }

  try {
    // 네이버 증권 자동완성 API
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock,index,etf,fund,futures,option`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Referer: "https://m.stock.naver.com/",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return NextResponse.json({ items: [] });

    const data = await res.json();
    // 응답: { items: [[코드, 이름, 시장], ...] } — 이미 배열의 배열이므로 flat() 불필요
    const rawItems: unknown[] = data.items ?? [];

    // 혹시 한 번 더 감싸진 경우([[...],[...]]) 대비해 한 레벨만 평탄화
    const normalized: string[][] = (
      rawItems.length > 0 && Array.isArray((rawItems[0] as unknown[])?.[0])
        ? (rawItems as string[][][]).flat(1)
        : (rawItems as string[][])
    );

    const items = normalized
      .filter((item) => Array.isArray(item) && item.length >= 2)
      .map((item) => ({
        symbol: item[0],
        name: item[1],
        market: item[2] ?? "",
      }))
      .slice(0, 20);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
