import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

export const runtime = "nodejs";

const VALID = new Set(["general", "work", "daily", "lunch"]);
const MAX = 200;

interface TopicMsg {
  id: string;
  from: string;
  fromImage: string | null;
  text: string;
  createdAt: string;
}

function key(topicId: string) { return `topic:msgs:${topicId}`; }

export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId") ?? "";
  if (!VALID.has(topicId)) return NextResponse.json({ messages: [] });
  try {
    const raw = await redis.get(key(topicId));
    return NextResponse.json({ messages: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const { topicId, name, imageUrl, text } = await req.json();
  if (!VALID.has(topicId) || !name || !text?.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const raw = await redis.get(key(topicId));
  const msgs: TopicMsg[] = raw ? JSON.parse(raw) : [];
  msgs.push({
    id: Date.now().toString(),
    from: name,
    fromImage: imageUrl ?? null,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  await redis.set(key(topicId), JSON.stringify(msgs.slice(-MAX)));
  return NextResponse.json({ ok: true });
}
