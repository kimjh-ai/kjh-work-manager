import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "user:profiles";

export async function GET() {
  const raw = await redis.get(KEY);
  return NextResponse.json({ profiles: raw ? JSON.parse(raw) : {} });
}

export async function POST(req: NextRequest) {
  const { name, imageUrl } = await req.json();
  if (!name) return NextResponse.json({ ok: false });

  const raw = await redis.get(KEY);
  const profiles: Record<string, string> = raw ? JSON.parse(raw) : {};
  profiles[name] = imageUrl ?? profiles[name] ?? "";
  await redis.set(KEY, JSON.stringify(profiles));
  return NextResponse.json({ ok: true });
}
