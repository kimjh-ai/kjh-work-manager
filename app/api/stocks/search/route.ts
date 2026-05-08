import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Referer: "https://m.stock.naver.com/",
  Accept: "application/json",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 1) {
    return NextResponse.json({ items: [] });
  }

  try {
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock,index,etf,fund,futures,option`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 0 } });
    if (!res.ok) return NextResponse.json({ items: [] });

    const data = await res.json();
    const raw: unknown[] = data.items ?? [];

    // 신규 형식: items = [{ code, name, typeCode, ... }, ...]
    // 구형식: items = [["code","name","market"], ...]
    const items = raw
      .map((item) => {
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          // 신규 객체 형식
          const obj = item as Record<string, unknown>;
          const symbol = String(obj.code ?? obj.reutersCode ?? "");
          const name = String(obj.name ?? "");
          const market = String(obj.typeCode ?? obj.typeName ?? "");
          return symbol && name ? { symbol, name, market } : null;
        } else if (Array.isArray(item) && item.length >= 2) {
          // 구형 배열 형식 [code, name, market]
          return {
            symbol: String(item[0]),
            name: String(item[1]),
            market: String(item[2] ?? ""),
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 20);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
