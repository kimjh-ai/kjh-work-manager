import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

export const runtime = "nodejs";

function inboxKey(u: string) { return `dm:inbox:${u}`; }

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  if (!user) return NextResponse.json({ inbox: [] });
  try {
    const raw = await redis.get(inboxKey(user));
    return NextResponse.json({ inbox: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ inbox: [] });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, roomId } = await req.json();
  if (!user || !roomId) return NextResponse.json({ ok: false });
  try {
    const key = inboxKey(user);
    const raw = await redis.get(key);
    const inbox = raw ? JSON.parse(raw) : [];
    const idx = inbox.findIndex((e: { roomId: string }) => e.roomId === roomId);
    if (idx !== -1) inbox[idx].unread = 0;
    await redis.set(key, JSON.stringify(inbox));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
