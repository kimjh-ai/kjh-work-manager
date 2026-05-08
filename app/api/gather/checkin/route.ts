import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  store.addCheckin(name);
  return NextResponse.json({ ok: true, call: store.getGather() });
}
