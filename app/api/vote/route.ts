import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import webpush from "web-push";

export const runtime = "nodejs";

const KEY = "vote:current";
const SUB_KEY = "push:subscriptions";

async function sendPush(title: string, body: string) {
  const vKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vPriv = process.env.VAPID_PRIVATE_KEY;
  const vEmail = process.env.VAPID_EMAIL;
  if (!vKey || !vPriv || !vEmail) return;
  webpush.setVapidDetails(vEmail, vKey, vPriv);
  const subRaw = await redis.get(SUB_KEY);
  const subs: webpush.PushSubscription[] = subRaw ? JSON.parse(subRaw) : [];
  const payload = JSON.stringify({ title, body });
  const results = await Promise.allSettled(subs.map((sub) => webpush.sendNotification(sub, payload)));
  const valid = subs.filter((_, i) => {
    const r = results[i];
    return !(r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410);
  });
  if (valid.length !== subs.length) await redis.set(SUB_KEY, JSON.stringify(valid));
}

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ vote: raw ? JSON.parse(raw) : null });
  } catch {
    return NextResponse.json({ vote: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create") {
    const vote = {
      id: Date.now().toString(),
      question: body.question,
      options: (body.options as string[]).map((text) => ({ text, voters: [] as string[] })),
      createdBy: body.createdBy,
      closed: false,
      createdAt: new Date().toISOString(),
    };
    await redis.set(KEY, JSON.stringify(vote));
    try {
      await sendPush(`📊 ${body.createdBy}님이 투표를 열었어요`, body.question);
    } catch { /* no-op */ }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "vote") {
    const raw = await redis.get(KEY);
    if (!raw) return NextResponse.json({ ok: false });
    const vote = JSON.parse(raw);
    vote.options = vote.options.map((opt: { text: string; voters: string[] }) => ({
      ...opt,
      voters: opt.voters.filter((v: string) => v !== body.name),
    }));
    const opt = vote.options.find((o: { text: string }) => o.text === body.option);
    if (opt) opt.voters.push(body.name);
    await redis.set(KEY, JSON.stringify(vote));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "close") {
    const raw = await redis.get(KEY);
    if (!raw) return NextResponse.json({ ok: false });
    const vote = JSON.parse(raw);
    vote.closed = true;
    await redis.set(KEY, JSON.stringify(vote));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
