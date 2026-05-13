import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const getKey = () => `mood:${new Date().toISOString().slice(0, 10)}`;

export async function GET() {
  try {
    const raw = await redis.get(getKey());
    return NextResponse.json({ moods: raw ? JSON.parse(raw) : {} });
  } catch {
    return NextResponse.json({ moods: {} });
  }
}

export async function POST(req: NextRequest) {
  const { name, emoji, imageUrl } = await req.json();
  const key = getKey();
  const raw = await redis.get(key);
  const moods = raw ? JSON.parse(raw) : {};
  moods[name] = { emoji, imageUrl: imageUrl ?? null, updatedAt: new Date().toISOString() };
  await redis.set(key, JSON.stringify(moods), "EX", 86400);
  return NextResponse.json({ ok: true });
}
