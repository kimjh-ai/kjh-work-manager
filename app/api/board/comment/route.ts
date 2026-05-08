import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "board:posts";

export async function POST(req: NextRequest) {
  const { postId, content, author, authorImage } = await req.json();
  if (!postId || !content?.trim()) return NextResponse.json({ ok: false });

  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  const post = posts.find((p: { id: string }) => p.id === postId);
  if (!post) return NextResponse.json({ ok: false });

  if (!post.comments) post.comments = [];
  post.comments.push({
    id: Date.now().toString(),
    content: content.trim(),
    author,
    authorImage: authorImage ?? null,
    createdAt: new Date().toISOString(),
  });

  await redis.set(KEY, JSON.stringify(posts));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId") ?? "";
  const commentId = searchParams.get("commentId") ?? "";

  const raw = await redis.get(KEY);
  const posts = raw ? JSON.parse(raw) : [];
  const post = posts.find((p: { id: string }) => p.id === postId);
  if (post?.comments) {
    post.comments = post.comments.filter((c: { id: string }) => c.id !== commentId);
    await redis.set(KEY, JSON.stringify(posts));
  }
  return NextResponse.json({ ok: true });
}
