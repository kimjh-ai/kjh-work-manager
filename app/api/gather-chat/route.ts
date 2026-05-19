import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { sendPush } from "@/lib/sendPush";

export const runtime = "nodejs";

const KEY = "gather_chat";
const MAX = 200;

interface ChatMessage {
  id: string;
  name: string;
  imageUrl: string | null;
  text: string;
  createdAt: string;
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
    await sendPush(`💬 ${name}`, preview, "chat");
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
