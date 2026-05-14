import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { isAdmin } from "@/lib/auth";

const KEY = "notices";

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ notices: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ notices: [] });
  }
}

export async function POST(req: NextRequest) {
  const { title, content, author, authorEmail, important } = await req.json();
  if (!isAdmin(authorEmail)) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await redis.get(KEY);
  const notices = raw ? JSON.parse(raw) : [];
  notices.unshift({
    id: Date.now().toString(),
    title,
    content: content ?? "",
    author,
    important: !!important,
    createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(notices.slice(0, 100)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id, authorEmail } = await req.json();
  if (!isAdmin(authorEmail)) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await redis.get(KEY);
  const notices = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(notices.filter((n: { id: string }) => n.id !== id)));
  return NextResponse.json({ ok: true });
}
