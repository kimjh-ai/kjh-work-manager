import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

type GameType = "reaction" | "mole" | "suika";

function key(game: GameType) { return `game_rank:${game}`; }

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game") as GameType;
  if (!game) return NextResponse.json({ ranks: [] });

  const raw = await redis.get(key(game));
  const scores: Record<string, number> = raw ? JSON.parse(raw) : {};

  const ranks = Object.entries(scores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => game === "reaction" ? a.score - b.score : b.score - a.score)
    .slice(0, 10);

  return NextResponse.json({ ranks });
}

export async function POST(req: NextRequest) {
  const { game, name, score } = await req.json() as { game: GameType; name: string; score: number };
  if (!game || !name || score == null) return NextResponse.json({ ok: false });

  const raw = await redis.get(key(game));
  const scores: Record<string, number> = raw ? JSON.parse(raw) : {};

  const prev = scores[name];
  const isBetter = game === "reaction"
    ? prev == null || score < prev
    : prev == null || score > prev;

  if (isBetter) {
    scores[name] = score;
    await redis.set(key(game), JSON.stringify(scores));
  }
  return NextResponse.json({ ok: true, newBest: isBetter });
}
