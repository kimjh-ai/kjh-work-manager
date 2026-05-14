import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { isAdmin } from "@/lib/auth";

const KEY = "suggestions";

interface Suggestion {
  id: string;
  content: string;
  category: "불만" | "제안" | "칭찬";
  checked: boolean;
  createdAt: string;
}

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ suggestions: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}

export async function POST(req: NextRequest) {
  const { content, category } = await req.json();
  if (!content?.trim()) return NextResponse.json({ ok: false }, { status: 400 });
  const raw = await redis.get(KEY);
  const suggestions: Suggestion[] = raw ? JSON.parse(raw) : [];
  suggestions.unshift({
    id: Date.now().toString(),
    content: content.trim(),
    category: category ?? "제안",
    checked: false,
    createdAt: new Date().toISOString(),
  });
  await redis.set(KEY, JSON.stringify(suggestions.slice(0, 200)));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { id, authorEmail } = await req.json();
  if (!isAdmin(authorEmail)) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await redis.get(KEY);
  const suggestions: Suggestion[] = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(suggestions.map((s) => s.id === id ? { ...s, checked: !s.checked } : s)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id, authorEmail } = await req.json();
  if (!isAdmin(authorEmail)) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await redis.get(KEY);
  const suggestions: Suggestion[] = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(suggestions.filter((s) => s.id !== id)));
  return NextResponse.json({ ok: true });
}
