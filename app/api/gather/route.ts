import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

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
      const already = call.checkins.some(
        (c: string | { name: string }) => (typeof c === "string" ? c : c.name) === body.name
      );
      if (!already) {
        call.checkins.push({ name: body.name, imageUrl: body.imageUrl ?? null });
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

  // 푸시 알림 전송
  try {
    const subRaw = await redis.get("push:subscriptions");
    const subs: webpush.PushSubscription[] = subRaw ? JSON.parse(subRaw) : [];
    const locationEmoji: Record<string, string> = { "3층": "🏢", "옥상": "🌤️", "편의점": "🏪" };
    const emoji = locationEmoji[body.location] ?? "📍";
    const payload = JSON.stringify({
      title: `🚨 집합! ${emoji} ${body.location}`,
      body: body.message ? `"${body.message}" - ${body.calledBy}` : `${body.calledBy}님이 집합을 발령했습니다`,
    });
    await Promise.allSettled(subs.map((sub) => webpush.sendNotification(sub, payload)));
  } catch { /* 푸시 실패해도 집합은 저장됨 */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
