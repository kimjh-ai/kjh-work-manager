import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "online:users";
const TTL_MS = 90_000;

interface OnlineUser {
  name: string;
  imageUrl: string | null;
  lastSeen: number;
}

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    const map: Record<string, OnlineUser> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    const active = Object.values(map).filter((u) => now - u.lastSeen < TTL_MS);
    return NextResponse.json({ users: active });
  } catch {
    return NextResponse.json({ users: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, imageUrl } = await req.json();
    if (!name) return NextResponse.json({ ok: false }, { status: 400 });
    const now = Date.now();

    // 온라인 현황 (단기)
    const raw = await redis.get(KEY);
    const map: Record<string, OnlineUser> = raw ? JSON.parse(raw) : {};
    map[name] = { name, imageUrl: imageUrl ?? null, lastSeen: now };
    for (const key of Object.keys(map)) {
      if (now - map[key].lastSeen > TTL_MS * 2) delete map[key];
    }
    await redis.set(KEY, JSON.stringify(map), "EX", 300);

    // 마지막 접속 시각 (영구 기록)
    const lsRaw = await redis.get("user:last_seen");
    const ls: Record<string, number> = lsRaw ? JSON.parse(lsRaw) : {};
    ls[name] = now;
    await redis.set("user:last_seen", JSON.stringify(ls));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
