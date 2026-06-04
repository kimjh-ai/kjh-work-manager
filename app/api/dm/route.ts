import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { sendDmPush } from "@/lib/sendPush";

export const runtime = "nodejs";

const MAX_MSGS = 200;

function roomId(a: string, b: string) {
  return [a, b].sort().join("|||");
}
function msgsKey(rid: string)   { return `dm:msgs:${rid}`; }
function inboxKey(u: string)    { return `dm:inbox:${u}`; }
function readsKey(rid: string)  { return `dm:reads:${rid}`; }

interface DmMessage {
  id: string;
  from: string;
  fromImage: string | null;
  text: string;
  createdAt: string;
}

interface InboxEntry {
  roomId: string;
  partnerName: string;
  partnerImage: string | null;
  lastMsg: string;
  lastAt: string;
  unread: number;
}

async function updateInbox(
  me: string, rid: string,
  partnerName: string, partnerImage: string | null,
  msg: DmMessage, incrementUnread = false
) {
  const key = inboxKey(me);
  const raw = await redis.get(key);
  const inbox: InboxEntry[] = raw ? JSON.parse(raw) : [];
  const idx = inbox.findIndex((e) => e.roomId === rid);
  const entry: InboxEntry = idx === -1
    ? { roomId: rid, partnerName, partnerImage, lastMsg: msg.text, lastAt: msg.createdAt, unread: 0 }
    : { ...inbox[idx], partnerName, partnerImage, lastMsg: msg.text, lastAt: msg.createdAt };
  if (incrementUnread) entry.unread = (entry.unread ?? 0) + 1;
  if (idx !== -1) inbox.splice(idx, 1);
  inbox.unshift(entry);
  await redis.set(key, JSON.stringify(inbox.slice(0, 100)));
}

export async function GET(req: NextRequest) {
  const rid = req.nextUrl.searchParams.get("roomId");
  if (!rid) return NextResponse.json({ messages: [], reads: {} });
  try {
    const [rawMsgs, rawReads] = await Promise.all([redis.get(msgsKey(rid)), redis.get(readsKey(rid))]);
    return NextResponse.json({
      messages: rawMsgs ? JSON.parse(rawMsgs) : [],
      reads: rawReads ? JSON.parse(rawReads) : {},
    });
  } catch {
    return NextResponse.json({ messages: [], reads: {} });
  }
}

export async function PATCH(req: NextRequest) {
  const { roomId: rid, user, readAt } = await req.json();
  if (!rid || !user) return NextResponse.json({ ok: false });
  const key = readsKey(rid);
  const raw = await redis.get(key);
  const reads: Record<string, string> = raw ? JSON.parse(raw) : {};
  reads[user] = readAt ?? new Date().toISOString();
  await redis.set(key, JSON.stringify(reads));
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { from, fromImage, to, toImage, text } = await req.json();
  if (!from || !to || !text?.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const rid = roomId(from, to);
  const key = msgsKey(rid);
  const raw = await redis.get(key);
  const messages: DmMessage[] = raw ? JSON.parse(raw) : [];
  const msg: DmMessage = {
    id: Date.now().toString(),
    from, fromImage: fromImage ?? null,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  messages.push(msg);
  await redis.set(key, JSON.stringify(messages.slice(-MAX_MSGS)));

  await updateInbox(from, rid, to, toImage ?? null, msg, false);
  await updateInbox(to, rid, from, fromImage ?? null, msg, true);

  try {
    await sendDmPush(`💬 ${from}`, text.trim().slice(0, 60), to, fromImage ?? undefined);
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}
