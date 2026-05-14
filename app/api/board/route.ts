import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import webpush from "web-push";

export const runtime = "nodejs";

const KEY = "board:posts";
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
    return NextResponse.json({ posts: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: NextRequest) {
  const { title, content, author, authorImage } = await req.json();
  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  posts.unshift({
    id: Date.now().toString(),
    title,
    content: content ?? "",
    author,
    authorImage: authorImage ?? null,
    createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(posts.slice(0, 200)));

  try {
    const preview = content?.trim() ? content.trim().slice(0, 40) : "";
    await sendPush(
      `📋 ${author}님이 글을 올렸어요`,
      preview ? `${title} — ${preview}` : title
    );
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { id, name } = await req.json();
  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  const idx = posts.findIndex((p: { id: string }) => p.id === id);
  if (idx === -1) return NextResponse.json({ ok: false }, { status: 404 });
  const likes: string[] = posts[idx].likes ?? [];
  posts[idx].likes = likes.includes(name) ? likes.filter((l: string) => l !== name) : [...likes, name];
  await redis.set(KEY, JSON.stringify(posts));
  return NextResponse.json({ ok: true, likes: posts[idx].likes });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(posts.filter((p: { id: string }) => p.id !== id)));
  return NextResponse.json({ ok: true });
}
