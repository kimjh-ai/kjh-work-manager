import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "gather:current";

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ call: raw ? JSON.parse(raw) : null });
  } catch {
    return NextResponse.json({ call: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 체크인
  if (body.action === "checkin") {
    try {
      const raw = await redis.get(KEY);
      if (!raw) return NextResponse.json({ ok: false });
      const call = JSON.parse(raw);
      if (!call.checkins.includes(body.name)) {
        call.checkins.push(body.name);
        await redis.set(KEY, JSON.stringify(call));
      }
    } catch { /* no-op */ }
    return NextResponse.json({ ok: true });
  }

  // 집합 발령
  const call = {
    id: Date.now().toString(),
    location: body.location,
    message: body.message ?? "",
    calledBy: body.calledBy,
    calledAt: new Date().toISOString(),
    checkins: [] as string[],
  };
  await redis.set(KEY, JSON.stringify(call));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
