import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { sendPush } from "@/lib/sendPush";

export const runtime = "nodejs";

const MAX = 100;

function getKey(callId: string) {
  return `gather_chat:${callId}`;
}

interface ChatMessage {
  id: string;
  name: string;
  imageUrl: string | null;
  text: string;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("callId");
  if (!callId) return NextResponse.json({ messages: [] });
  try {
    const raw = await redis.get(getKey(callId));
    return NextResponse.json({ messages: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const { callId, name, imageUrl, text } = await req.json();
  if (!callId || !name || !text?.trim()) return NextResponse.json({ ok: false }, { status: 400 });
  const key = getKey(callId);
  const raw = await redis.get(key);
  const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
  messages.push({
    id: Date.now().toString(),
    name,
    imageUrl: imageUrl ?? null,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  await redis.set(key, JSON.stringify(messages.slice(-MAX)));

  try {
    await sendPush(`💬 ${name}`, text.trim().slice(0, 40), "chat", imageUrl ?? undefined);
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("callId");
  if (callId) await redis.del(getKey(callId));
  return NextResponse.json({ ok: true });
}
