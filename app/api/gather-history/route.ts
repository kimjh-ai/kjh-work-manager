import { NextResponse } from "next/server";
import redis from "@/lib/redis";

const HISTORY_KEY = "gather:history";

export async function GET() {
  try {
    const raw = await redis.get(HISTORY_KEY);
    const history: { calledAt: string; calledBy: string; location: string }[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();

    const day   = history.filter((h) => now - new Date(h.calledAt).getTime() < 86_400_000);
    const week  = history.filter((h) => now - new Date(h.calledAt).getTime() < 7 * 86_400_000);
    const month = history.filter((h) => now - new Date(h.calledAt).getTime() < 30 * 86_400_000);

    // 발령자별 횟수 (이번달 기준)
    const callerMap: Record<string, number> = {};
    for (const h of month) callerMap[h.calledBy] = (callerMap[h.calledBy] ?? 0) + 1;
    const callerStats = Object.entries(callerMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    // 장소별 횟수 (이번달 기준)
    const locMap: Record<string, number> = {};
    for (const h of month) locMap[h.location] = (locMap[h.location] ?? 0) + 1;
    const locStats = Object.entries(locMap)
      .sort(([, a], [, b]) => b - a)
      .map(([location, count]) => ({ location, count }));

    return NextResponse.json({
      history: history.slice(0, 30),
      stats: { day: day.length, week: week.length, month: month.length },
      callerStats,
      locStats,
    });
  } catch {
    return NextResponse.json({
      history: [],
      stats: { day: 0, week: 0, month: 0 },
      callerStats: [],
      locStats: [],
    });
  }
}
