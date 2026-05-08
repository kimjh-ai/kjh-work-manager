import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "board:posts";

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ posts: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: NextRequest) {
  const { title, content, author } = await req.json();
  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  posts.unshift({
    id: Date.now().toString(),
    title,
    content: content ?? "",
    author,
    createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(posts.slice(0, 200)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(posts.filter((p: { id: string }) => p.id !== id)));
  return NextResponse.json({ ok: true });
}
