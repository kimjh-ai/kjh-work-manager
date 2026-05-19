import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import webpush from "web-push";

export const runtime = "nodejs";

const KEY = "gather_chat";
const SUB_KEY = "push:subscriptions";
const MAX = 200;

interface ChatMessage {
  id: string;
  name: string;
  imageUrl: string | null;
  text: string;
  createdAt: string;
}

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
  const validSubs = subs.filter((_, i) => {
    const r = results[i];
    return !(r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410);
  });
  if (validSubs.length !== subs.length) await redis.set(SUB_KEY, JSON.stringify(validSubs));
}

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ messages: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const { name, imageUrl, text } = await req.json();
  if (!name || !text?.trim()) return NextResponse.json({ ok: false }, { status: 400 });
  const raw = await redis.get(KEY);
  const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
  messages.push({
    id: Date.now().toString(),
    name,
    imageUrl: imageUrl ?? null,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(messages.slice(-MAX)));

  // 채팅 알림 — 메시지 미리보기 40자
  try {
    const preview = text.trim().slice(0, 40);
    await sendPush(`💬 ${name}`, preview);
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
