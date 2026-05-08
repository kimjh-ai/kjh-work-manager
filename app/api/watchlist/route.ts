import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import redis from "@/lib/redis";

const key = (userId: string) => `watchlist:${userId}`;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ watchlist: [] });
  try {
    const raw = await redis.get(key(userId));
    return NextResponse.json({ watchlist: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ watchlist: [] });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false });
  const { watchlist } = await req.json();
  await redis.set(key(userId), JSON.stringify(watchlist));
  return NextResponse.json({ ok: true });
}
