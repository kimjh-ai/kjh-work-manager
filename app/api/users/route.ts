import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import redis from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  // 1차: Clerk Admin API
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ limit: 200 });
    const users = (result.data ?? [])
      .map((u) => {
        const name =
          u.firstName ??
          u.username ??
          u.primaryEmailAddress?.emailAddress?.split("@")[0] ??
          "";
        return { name, imageUrl: u.imageUrl ?? null };
      })
      .filter((u) => u.name);
    if (users.length > 0) return NextResponse.json({ users });
  } catch { /* fall through */ }

  // 2차 fallback: Redis profiles
  try {
    const raw = await redis.get("user:profiles");
    const profiles: Record<string, string> = raw ? JSON.parse(raw) : {};
    const users = Object.entries(profiles).map(([name, imageUrl]) => ({
      name,
      imageUrl: imageUrl || null,
    }));
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
