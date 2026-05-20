import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat") ?? "37.5665";
  const lon = req.nextUrl.searchParams.get("lon") ?? "126.9780";

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FSeoul&forecast_days=7`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } }); // 10분 캐시
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "weather fetch failed" }, { status: 500 });
  }
}
