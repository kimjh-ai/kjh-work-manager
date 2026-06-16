import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ limit: 200, orderBy: "-created_at" });
    const users = result.data.map((u) => {
      const name =
        u.firstName ??
        u.username ??
        u.primaryEmailAddress?.emailAddress?.split("@")[0] ??
        "";
      return { name, imageUrl: u.imageUrl ?? null };
    }).filter(u => u.name);
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
