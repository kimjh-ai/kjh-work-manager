import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { isAdmin } from "@/lib/auth";

const KEY = "team_links";

interface TeamLink {
  id: string;
  title: string;
  url: string;
  desc: string;
  category: string;
  createdBy: string;
}

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ links: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  const { title, url, desc, category, authorEmail, createdBy } = await req.json();
  if (!isAdmin(authorEmail)) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await redis.get(KEY);
  const links: TeamLink[] = raw ? JSON.parse(raw) : [];
  links.unshift({ id: Date.now().toString(), title, url, desc: desc ?? "", category: category ?? "기타", createdBy });
  await redis.set(KEY, JSON.stringify(links.slice(0, 100)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id, authorEmail } = await req.json();
  if (!isAdmin(authorEmail)) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await redis.get(KEY);
  const links: TeamLink[] = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(links.filter((l) => l.id !== id)));
  return NextResponse.json({ ok: true });
}
