import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

interface BirthdayEntry {
  name: string;
  month: number;
  day: number;
  imageUrl: string | null;
  wish: string;
}

const KEY = "birthdays";

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ birthdays: raw ? JSON.parse(raw) : [] });
  } catch {
    return NextResponse.json({ birthdays: [] });
  }
}

export async function POST(req: NextRequest) {
  const { name, month, day, imageUrl, wish } = await req.json();
  const raw = await redis.get(KEY);
  const birthdays: BirthdayEntry[] = raw ? JSON.parse(raw) : [];
  const filtered = birthdays.filter((b) => b.name !== name);
  filtered.push({ name, month: Number(month), day: Number(day), imageUrl: imageUrl ?? null, wish: wish ?? "" });
  await redis.set(KEY, JSON.stringify(filtered));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { name } = await req.json();
  const raw = await redis.get(KEY);
  const birthdays: BirthdayEntry[] = raw ? JSON.parse(raw) : [];
  await redis.set(KEY, JSON.stringify(birthdays.filter((b) => b.name !== name)));
  return NextResponse.json({ ok: true });
}
