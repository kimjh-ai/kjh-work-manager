import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

// 사용자별 코인 관심목록 (userId 기반)

const key = (userId: string) => `coin_watchlist:${userId}`;

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.json({ watchlist: [] });
  try {
    const raw = await redis.get(key(userId));
    return NextResponse.json({ watchlist: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ watchlist: [] });
  }
}

export async function POST(req: NextRequest) {
  const { userId, watchlist } = await req.json();
  if (!userId) return NextResponse.json({ ok: false }, { status: 400 });
  await redis.set(key(userId), JSON.stringify(watchlist ?? []));
  return NextResponse.json({ ok: true });
}
