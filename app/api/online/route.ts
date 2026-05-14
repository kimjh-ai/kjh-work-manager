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
    const raw = await redis.get(KEY);
    const map: Record<string, OnlineUser> = raw ? JSON.parse(raw) : {};
    map[name] = { name, imageUrl: imageUrl ?? null, lastSeen: Date.now() };
    // 오래된 항목 정리
    const now = Date.now();
    for (const key of Object.keys(map)) {
      if (now - map[key].lastSeen > TTL_MS * 2) delete map[key];
    }
    await redis.set(KEY, JSON.stringify(map), "EX", 300);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
