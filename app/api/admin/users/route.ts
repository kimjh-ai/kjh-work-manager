import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

async function getAdminClient() {
  const { userId } = await auth();
  if (!userId) return null;
  const client = await clerkClient();
  const me = await client.users.getUser(userId);
  const email = me.primaryEmailAddress?.emailAddress ?? "";
  if (!isAdmin(email)) return null;
  return client;
}

export async function GET() {
  const client = await getAdminClient();
  if (!client) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await client.users.getUserList({ limit: 200 });
  const users = (result.data ?? []).map((u) => ({
    id: u.id,
    name: u.firstName ?? u.username ?? u.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "(이름없음)",
    email: u.primaryEmailAddress?.emailAddress ?? "",
    imageUrl: u.imageUrl ?? null,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ users });
}

export async function DELETE(req: NextRequest) {
  const client = await getAdminClient();
  if (!client) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId: targetId } = await req.json();
  if (!targetId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const { userId: myId } = await auth();
  if (targetId === myId) return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다" }, { status: 400 });

  await client.users.deleteUser(targetId);
  return NextResponse.json({ ok: true });
}
