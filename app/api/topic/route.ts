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

function key(topicId: string)      { return `topic:msgs:${topicId}`; }
function readsKey(topicId: string) { return `topic:reads:${topicId}`; }
function unreadKey(user: string)   { return `topic:user_unread:${user}`; }

async function incrementUnread(topicId: string, sender: string) {
  const pRaw = await redis.get("user:profiles");
  const profiles: Record<string, string> = pRaw ? JSON.parse(pRaw) : {};
  const others = Object.keys(profiles).filter(u => u !== sender);
  await Promise.all(others.map(async (u) => {
    const raw = await redis.get(unreadKey(u));
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    counts[topicId] = (counts[topicId] ?? 0) + 1;
    await redis.set(unreadKey(u), JSON.stringify(counts));
  }));
}

// GET ?topicId=xxx → messages + reads
// GET ?user=xxx    → unread counts for all topics
export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId") ?? "";
  const user    = req.nextUrl.searchParams.get("user") ?? "";

  if (user && !topicId) {
    try {
      const raw = await redis.get(unreadKey(user));
      return NextResponse.json({ counts: raw ? JSON.parse(raw) : {} });
    } catch {
      return NextResponse.json({ counts: {} });
    }
  }

  if (!VALID.has(topicId)) return NextResponse.json({ messages: [], reads: {} });
  try {
    const [rawMsgs, rawReads] = await Promise.all([redis.get(key(topicId)), redis.get(readsKey(topicId))]);
    return NextResponse.json({
      messages: rawMsgs ? JSON.parse(rawMsgs) : [],
      reads: rawReads ? JSON.parse(rawReads) : {},
    });
  } catch {
    return NextResponse.json({ messages: [], reads: {} });
  }
}

// PATCH: update read timestamp + reset unread count
export async function PATCH(req: NextRequest) {
  const { topicId, user, readAt } = await req.json();
  if (!VALID.has(topicId) || !user) return NextResponse.json({ ok: false });

  const now = readAt ?? new Date().toISOString();
  const raw = await redis.get(readsKey(topicId));
  const reads: Record<string, string> = raw ? JSON.parse(raw) : {};
  reads[user] = now;
  await redis.set(readsKey(topicId), JSON.stringify(reads));

  try {
    const uRaw = await redis.get(unreadKey(user));
    const counts: Record<string, number> = uRaw ? JSON.parse(uRaw) : {};
    counts[topicId] = 0;
    await redis.set(unreadKey(user), JSON.stringify(counts));
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { topicId, name, imageUrl, text } = await req.json();
  if (!VALID.has(topicId) || !name || !text?.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const raw = await redis.get(key(topicId));
  const msgs: TopicMsg[] = raw ? JSON.parse(raw) : [];
  msgs.push({
    id: Date.now().toString(),
    from: name, fromImage: imageUrl ?? null,
    text: text.trim(), createdAt: new Date().toISOString(),
  });
  await redis.set(key(topicId), JSON.stringify(msgs.slice(-MAX)));

  try { await incrementUnread(topicId, name); } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}
