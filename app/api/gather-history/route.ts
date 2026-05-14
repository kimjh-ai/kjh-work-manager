import { NextResponse } from "next/server";
import redis from "@/lib/redis";

const HISTORY_KEY = "gather:history";

export async function GET() {
  try {
    const raw = await redis.get(HISTORY_KEY);
    const history: { calledAt: string }[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const day   = history.filter((h) => now - new Date(h.calledAt).getTime() < 86_400_000).length;
    const week  = history.filter((h) => now - new Date(h.calledAt).getTime() < 7 * 86_400_000).length;
    const month = history.filter((h) => now - new Date(h.calledAt).getTime() < 30 * 86_400_000).length;
    return NextResponse.json({ history: history.slice(0, 30), stats: { day, week, month } });
  } catch {
    return NextResponse.json({ history: [], stats: { day: 0, week: 0, month: 0 } });
  }
}
