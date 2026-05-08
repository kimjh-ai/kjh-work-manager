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
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        Referer: "https://m.stock.naver.com/",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return NextResponse.json({ items: [] });

    const data = await res.json();
    // 응답: { items: [[코드, 이름, 시장], ...] }
    const items = (data.items ?? [])
      .flat()
      .filter((item: string[]) => item.length >= 2)
      .map((item: string[]) => ({
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
