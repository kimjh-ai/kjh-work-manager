import { NextRequest, NextResponse } from "next/server";
import { store, GatherCall } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ call: store.getGather() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 체크인 처리
  if (body.action === "checkin") {
    store.addCheckin(body.name);
    return NextResponse.json({ ok: true });
  }

  // 집합 발령
  const call: GatherCall = {
    id: Date.now().toString(),
    location: body.location,
    message: body.message ?? "",
    calledBy: body.calledBy,
    calledAt: new Date().toISOString(),
    checkins: [],
  };
  store.setGather(call);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  store.setGather(null);
  return NextResponse.json({ ok: true });
}
