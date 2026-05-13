import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "praises";

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ praises: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ praises: [] });
  }
}

export async function POST(req: NextRequest) {
  const { to, message, emoji } = await req.json();
  const raw = await redis.get(KEY);
  const praises = raw ? JSON.parse(raw) : [];
  praises.unshift({
    id: Date.now().toString(),
    to,
    message,
    emoji: emoji ?? "👏",
    createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(praises.slice(0, 50)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const raw = await redis.get(KEY);
  const praises = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(praises.filter((p: { id: string }) => p.id !== id)));
  return NextResponse.json({ ok: true });
}
