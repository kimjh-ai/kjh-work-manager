import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

const KEY = "coffee:current";

export async function GET() {
  try {
    const raw = await redis.get(KEY);
    return NextResponse.json({ run: raw ? JSON.parse(raw) : null });
  } catch {
    return NextResponse.json({ run: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "start") {
    const run = {
      id: Date.now().toString(),
      startedBy: body.startedBy,
      location: body.location,
      deadline: body.deadline,
      orders: [],
      closed: false,
      createdAt: new Date().toISOString(),
    };
    await redis.set(KEY, JSON.stringify(run));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "order") {
    const raw = await redis.get(KEY);
    if (!raw) return NextResponse.json({ ok: false });
    const run = JSON.parse(raw);
    run.orders = run.orders.filter((o: { name: string }) => o.name !== body.name);
    run.orders.push({
      name: body.name,
      imageUrl: body.imageUrl ?? null,
      menu: body.menu,
      note: body.note ?? "",
      createdAt: new Date().toISOString(),
    });
    await redis.set(KEY, JSON.stringify(run));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "close") {
    const raw = await redis.get(KEY);
    if (!raw) return NextResponse.json({ ok: false });
    const run = JSON.parse(raw);
    run.closed = true;
    await redis.set(KEY, JSON.stringify(run));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false });
}

export async function DELETE() {
  await redis.del(KEY);
  return NextResponse.json({ ok: true });
}
