import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { SUB_KEY, StoredSub, DEFAULT_PREFS } from "@/lib/sendPush";

export async function POST(req: NextRequest) {
  const sub = await req.json();
  if (!sub?.endpoint) return NextResponse.json({ ok: false });

  const raw = await redis.get(SUB_KEY);
  const subs: StoredSub[] = raw ? JSON.parse(raw) : [];

  const idx = subs.findIndex((s) => s.endpoint === sub.endpoint);
  if (idx === -1) {
    // 신규 구독 — 모든 알림 기본값 true
    subs.push({ ...sub, prefs: DEFAULT_PREFS });
  } else {
    // 재등록 시 prefs 유지
    subs[idx] = { ...sub, prefs: subs[idx].prefs ?? DEFAULT_PREFS };
  }
  await redis.set(SUB_KEY, JSON.stringify(subs));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  const raw = await redis.get(SUB_KEY);
  const subs: StoredSub[] = raw ? JSON.parse(raw) : [];
  await redis.set(SUB_KEY, JSON.stringify(subs.filter((s) => s.endpoint !== endpoint)));
  return NextResponse.json({ ok: true });
}
