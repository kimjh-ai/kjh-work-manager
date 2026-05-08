import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "push:subscriptions";

export async function POST(req: NextRequest) {
  const sub = await req.json();
  if (!sub?.endpoint) return NextResponse.json({ ok: false });

  const raw = await redis.get(KEY);
  const subs: object[] = raw ? JSON.parse(raw) : [];

  const exists = subs.some((s: object) => (s as { endpoint: string }).endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    await redis.set(KEY, JSON.stringify(subs));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  const raw = await redis.get(KEY);
  const subs: object[] = raw ? JSON.parse(raw) : [];
  const filtered = subs.filter((s: object) => (s as { endpoint: string }).endpoint !== endpoint);
  await redis.set(KEY, JSON.stringify(filtered));
  return NextResponse.json({ ok: true });
}
