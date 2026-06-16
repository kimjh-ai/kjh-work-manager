import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { sendPush, sendDmPush } from "@/lib/sendPush";

export const runtime = "nodejs";

const KEY = "team_chat";
const READS_KEY = "team_chat:reads";
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
    const [rawMsgs, rawReads] = await Promise.all([redis.get(KEY), redis.get(READS_KEY)]);
    return NextResponse.json({
      messages: rawMsgs ? JSON.parse(rawMsgs) : [],
      reads: rawReads ? JSON.parse(rawReads) : {},
    });
  } catch {
    return NextResponse.json({ messages: [], reads: {} });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, readAt } = await req.json();
  if (!user) return NextResponse.json({ ok: false });

  // update last read timestamp
  const raw = await redis.get(READS_KEY);
  const reads: Record<string, string> = raw ? JSON.parse(raw) : {};
  reads[user] = readAt ?? new Date().toISOString();
  await redis.set(READS_KEY, JSON.stringify(reads));

  // reset teamchat unread count for this user
  try {
    const uKey = `topic:user_unread:${user}`;
    const uRaw = await redis.get(uKey);
    const counts: Record<string, number> = uRaw ? JSON.parse(uRaw) : {};
    counts["teamchat"] = 0;
    await redis.set(uKey, JSON.stringify(counts));
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { name, imageUrl, text } = await req.json();
  if (!name || !text?.trim()) return NextResponse.json({ ok: false }, { status: 400 });
  const raw = await redis.get(KEY);
  const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
  messages.push({
    id: Date.now().toString(),
    name, imageUrl: imageUrl ?? null,
    text: text.trim(), createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(messages.slice(-MAX)));

  // increment unread for all other users
  try {
    const pRaw = await redis.get("user:profiles");
    const profiles: Record<string, string> = pRaw ? JSON.parse(pRaw) : {};
    const others = Object.keys(profiles).filter(u => u !== name);
    await Promise.all(others.map(async (u) => {
      const uKey = `topic:user_unread:${u}`;
      const uRaw = await redis.get(uKey);
      const counts: Record<string, number> = uRaw ? JSON.parse(uRaw) : {};
      counts["teamchat"] = (counts["teamchat"] ?? 0) + 1;
      await redis.set(uKey, JSON.stringify(counts));
    }));
  } catch { /* no-op */ }

  try {
    await sendPush(`💬 ${name}`, text.trim().slice(0, 40), "chat");
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
          sendDmPush(`🔔 ${name}이(가) 전체 멘션했어요`, `팀채팅: ${text.trim().slice(0, 40)}`, m).catch(() => {})
        ));
      } else {
        const valid = mentions.filter(m => m !== name && m in pMap);
        await Promise.all(valid.map(m =>
          sendDmPush(`🔔 ${name}이(가) 멘션했어요`, `팀채팅: ${text.trim().slice(0, 40)}`, m).catch(() => {})
        ));
      }
    }
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
