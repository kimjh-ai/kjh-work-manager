import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { SUB_KEY, StoredSub, DEFAULT_PREFS, NotifType } from "@/lib/sendPush";

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ prefs: DEFAULT_PREFS });

  const raw = await redis.get(SUB_KEY);
  const subs: StoredSub[] = raw ? JSON.parse(raw) : [];
  const sub = subs.find((s) => s.endpoint === endpoint);
  return NextResponse.json({ prefs: sub?.prefs ?? DEFAULT_PREFS });
}

export async function PATCH(req: NextRequest) {
  const { endpoint, type, value } = await req.json() as { endpoint: string; type: NotifType; value: boolean };
  if (!endpoint || !type) return NextResponse.json({ ok: false });

  const raw = await redis.get(SUB_KEY);
  const subs: StoredSub[] = raw ? JSON.parse(raw) : [];
  const idx = subs.findIndex((s) => s.endpoint === endpoint);
  if (idx === -1) return NextResponse.json({ ok: false });

  subs[idx].prefs = { ...(subs[idx].prefs ?? DEFAULT_PREFS), [type]: value };
  await redis.set(SUB_KEY, JSON.stringify(subs));
  return NextResponse.json({ ok: true, prefs: subs[idx].prefs });
}
