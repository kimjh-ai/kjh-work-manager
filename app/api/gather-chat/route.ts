import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { sendPush, sendDmPush } from "@/lib/sendPush";

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

  // @멘션 타겟 푸시
  try {
    const rawMatches = (text.trim().match(/@(\S+)/g) ?? []) as string[];
    const mentions = [...new Set(rawMatches.map(m => m.slice(1)))];
    if (mentions.length > 0) {
      const pRaw = await redis.get("user:profiles");
      const pMap: Record<string, string> = pRaw ? JSON.parse(pRaw) : {};
      if (mentions.includes("ALL")) {
        const targets = Object.keys(pMap).filter(m => m !== name);
        await Promise.all(targets.map(m =>
          sendDmPush(`🔔 ${name}이(가) 전체 멘션했어요`, `집합채팅: ${text.trim().slice(0, 40)}`, m).catch(() => {})
        ));
      } else {
        const valid = mentions.filter(m => m !== name && m in pMap);
        await Promise.all(valid.map(m =>
          sendDmPush(`🔔 ${name}이(가) 멘션했어요`, `집합채팅: ${text.trim().slice(0, 40)}`, m).catch(() => {})
        ));
      }
    }
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("callId");
  if (callId) await redis.del(getKey(callId));
  return NextResponse.json({ ok: true });
}
