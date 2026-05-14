import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import webpush from "web-push";

export const runtime = "nodejs";

const KEY = "gather:current";
const SUB_KEY = "push:subscriptions";
const HISTORY_KEY = "gather:history";

async function sendPush(title: string, body: string) {
  const vKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vPriv = process.env.VAPID_PRIVATE_KEY;
  const vEmail = process.env.VAPID_EMAIL;
  if (!vKey || !vPriv || !vEmail) return;

  webpush.setVapidDetails(vEmail, vKey, vPriv);
  const subRaw = await redis.get(SUB_KEY);
  const subs: webpush.PushSubscription[] = subRaw ? JSON.parse(subRaw) : [];
  const payload = JSON.stringify({ title, body });

  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, payload))
  );
  const validSubs = subs.filter((_, i) => {
    const r = results[i];
    return !(r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410);
  });
  if (validSubs.length !== subs.length) {
    await redis.set(SUB_KEY, JSON.stringify(validSubs));
  }
}

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

  // 체크인 (상태 변경 허용 - 기존 응답 덮어씀)
  if (body.action === "checkin") {
    try {
      const raw = await redis.get(KEY);
      if (!raw) return NextResponse.json({ ok: false });
      const call = JSON.parse(raw);
      call.checkins = call.checkins.filter(
        (c: string | { name: string }) => (typeof c === "string" ? c : c.name) !== body.name
      );
      call.checkins.push({
        name: body.name,
        imageUrl: body.imageUrl ?? null,
        status: body.status ?? "going",
        reason: body.reason ?? "",
      });
      await redis.set(KEY, JSON.stringify(call));
    } catch { /* no-op */ }
    return NextResponse.json({ ok: true });
  }

  // 재알림
  if (body.action === "renotify") {
    try {
      const raw = await redis.get(KEY);
      if (!raw) return NextResponse.json({ ok: false });
      const call = JSON.parse(raw);
      const locationEmoji: Record<string, string> = { "3층": "🏢", "옥상": "🌤️", "편의점": "🏪" };
      const emoji = locationEmoji[call.location] ?? "📍";
      await sendPush(
        `🔔 집합 재알림! ${emoji} ${call.location}`,
        `아직 응답 안 하신 분들 확인해주세요! - ${call.calledBy}`
      );
    } catch { /* no-op */ }
    return NextResponse.json({ ok: true });
  }

  // 신규 집합 발령
  const callId = Date.now().toString();
  const call = {
    id: callId,
    location: body.location,
    message: body.message ?? "",
    calledBy: body.calledBy,
    calledAt: new Date().toISOString(),
    checkins: [],
  };
  await redis.set(KEY, JSON.stringify(call));

  // 히스토리 기록
  try {
    const hRaw = await redis.get(HISTORY_KEY);
    const history = hRaw ? JSON.parse(hRaw) : [];
    history.unshift({ id: callId, location: body.location, message: body.message ?? "", calledBy: body.calledBy, calledAt: call.calledAt, checkins: [] });
    await redis.set(HISTORY_KEY, JSON.stringify(history.slice(0, 500)));
  } catch { /* no-op */ }

  try {
    const locationEmoji: Record<string, string> = { "3층": "🏢", "옥상": "🌤️", "편의점": "🏪" };
    const emoji = locationEmoji[body.location] ?? "📍";
    await sendPush(
      `🚨 집합! ${emoji} ${body.location}`,
      body.message ? `"${body.message}" - ${body.calledBy}` : `${body.calledBy}님이 집합을 발령했습니다`
    );
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  // 히스토리에 최종 체크인 결과 저장
  try {
    const raw = await redis.get(KEY);
    if (raw) {
      const current = JSON.parse(raw);
      const hRaw = await redis.get(HISTORY_KEY);
      const history = hRaw ? JSON.parse(hRaw) : [];
      const idx = history.findIndex((h: { id: string }) => h.id === current.id);
      if (idx !== -1) history[idx] = { ...history[idx], checkins: current.checkins };
      await redis.set(HISTORY_KEY, JSON.stringify(history));
    }
  } catch { /* no-op */ }
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
