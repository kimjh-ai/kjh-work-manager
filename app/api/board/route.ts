import { NextRequest, NextResponse } from "next/server";
import { store, BoardPost } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ posts: store.getBoard() });
}

export async function POST(req: NextRequest) {
  const { title, content, author } = await req.json();
  const post: BoardPost = {
    id: Date.now().toString(),
    title,
    content: content ?? "",
    author,
    createdAt: new Date().toISOString(),
  };
  store.addPost(post);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  store.removePost(id);
  return NextResponse.json({ ok: true });
}
