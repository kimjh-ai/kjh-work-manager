"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Droplets, Wind, Thermometer, Eye } from "lucide-react";

interface WeatherCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  apparent_temperature: number;
}
interface WeatherDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}
interface WeatherData { current: WeatherCurrent; daily: WeatherDaily }

const CITIES = [
  { id: "seoul",   name: "서울",  lat: "37.5665", lon: "126.9780" },
  { id: "busan",   name: "부산",  lat: "35.1796", lon: "129.0756" },
  { id: "incheon", name: "인천",  lat: "37.4563", lon: "126.7052" },
  { id: "daegu",   name: "대구",  lat: "35.8714", lon: "128.6014" },
  { id: "daejeon", name: "대전",  lat: "36.3504", lon: "127.3845" },
  { id: "gwangju", name: "광주",  lat: "35.1595", lon: "126.8526" },
  { id: "suwon",   name: "수원",  lat: "37.2636", lon: "127.0286" },
  { id: "jeju",    name: "제주",  lat: "33.4996", lon: "126.5312" },
];

function wmoEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2)  return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}
function wmoLabel(code: number): string {
  if (code === 0) return "맑음";
  if (code <= 2)  return "대체로 맑음";
  if (code === 3) return "흐림";
  if (code <= 48) return "안개";
  if (code <= 55) return "이슬비";
  if (code <= 67) return "비";
  if (code <= 77) return "눈";
  if (code <= 82) return "소나기";
  if (code <= 99) return "뇌우";
  return "";
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default function WeatherPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [cityId, setCityId] = useState("seoul");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !user) router.replace("/sign-in");
  }, [isLoaded, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem("weather_city");
    if (saved && CITIES.find((c) => c.id === saved)) setCityId(saved);
  }, []);

  useEffect(() => {
    const c = CITIES.find((c) => c.id === cityId) ?? CITIES[0];
    setLoading(true);
    fetch(`/api/weather?lat=${c.lat}&lon=${c.lon}`)
      .then((r) => r.json())
      .then((d) => { if (d.current) setWeather(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cityId]);

  const selectCity = (id: string) => {
    setCityId(id);
    localStorage.setItem("weather_city", id);
  };

  if (!isLoaded || !user) return null;

  const cityName = CITIES.find((c) => c.id === cityId)?.name ?? "서울";

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-sky-500 to-blue-700 pt-14 pb-6 px-5">
        <h1 className="text-white text-[18px] font-bold mb-4">날씨 예보</h1>

        {/* 도시 선택 칩 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCity(c.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                cityId === c.id
                  ? "bg-white text-blue-700 shadow-md"
                  : "bg-white/20 text-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">

        {/* 현재 날씨 카드 */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weather ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-semibold text-gray-400">현재 날씨 · {cityName}</p>
              </div>
              <div className="flex items-center gap-5 mb-5">
                <span className="text-[72px] leading-none">{wmoEmoji(weather.current.weather_code)}</span>
                <div>
                  <p className="text-[56px] font-black text-gray-900 leading-none">
                    {Math.round(weather.current.temperature_2m)}°
                  </p>
                  <p className="text-[15px] font-semibold text-gray-600 mt-1">
                    {wmoLabel(weather.current.weather_code)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-sky-50 rounded-xl p-3 flex flex-col items-center gap-1">
                  <Thermometer size={16} className="text-sky-500" />
                  <p className="text-[11px] text-gray-400">체감</p>
                  <p className="text-[15px] font-bold text-gray-800">{Math.round(weather.current.apparent_temperature)}°</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3 flex flex-col items-center gap-1">
                  <Droplets size={16} className="text-sky-500" />
                  <p className="text-[11px] text-gray-400">습도</p>
                  <p className="text-[15px] font-bold text-gray-800">{weather.current.relative_humidity_2m}%</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3 flex flex-col items-center gap-1">
                  <Wind size={16} className="text-sky-500" />
                  <p className="text-[11px] text-gray-400">바람</p>
                  <p className="text-[15px] font-bold text-gray-800">{Math.round(weather.current.wind_speed_10m)}<span className="text-[11px] font-normal">km/h</span></p>
                </div>
              </div>
            </div>

            {/* 7일 예보 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-[14px] font-bold text-gray-800">7일 예보</p>
              </div>
              <div className="divide-y divide-gray-50">
                {weather.daily.time.map((date, i) => {
                  const d = new Date(date);
                  const isSun = d.getDay() === 0;
                  const isSat = d.getDay() === 6;
                  const label = i === 0 ? "오늘" : i === 1 ? "내일" : DAY_NAMES[d.getDay()] + "요일";
                  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
                  const rain = weather.daily.precipitation_probability_max[i];
                  const max = Math.round(weather.daily.temperature_2m_max[i]);
                  const min = Math.round(weather.daily.temperature_2m_min[i]);
                  const range = (weather.daily.temperature_2m_max[0] - weather.daily.temperature_2m_min[0]) || 1;
                  const barMin = Math.min(...weather.daily.temperature_2m_min);
                  const barMax = Math.max(...weather.daily.temperature_2m_max);
                  const barRange = barMax - barMin || 1;
                  const barLeft = Math.round(((min - barMin) / barRange) * 100);
                  const barWidth = Math.round(((max - min) / barRange) * 100);

                  void range;

                  return (
                    <div key={date} className="flex items-center px-5 py-3.5 gap-3">
                      {/* 요일 + 날짜 */}
                      <div className="w-[52px] flex-shrink-0">
                        <p className={`text-[14px] font-bold ${i === 0 ? "text-blue-600" : isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-gray-800"}`}>
                          {label}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateLabel}</p>
                      </div>

                      {/* 날씨 아이콘 */}
                      <span className="text-[26px] flex-shrink-0 w-8 text-center">{wmoEmoji(weather.daily.weather_code[i])}</span>

                      {/* 강수 확률 */}
                      <div className="w-[36px] flex-shrink-0 text-center">
                        {rain > 10 ? (
                          <p className="text-[12px] font-semibold text-blue-500">💧{rain}%</p>
                        ) : (
                          <p className="text-[12px] text-gray-200">-</p>
                        )}
                      </div>

                      {/* 기온 바 */}
                      <div className="flex-1 flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-blue-400 w-7 text-right">{min}°</p>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full relative">
                          <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                            style={{ left: `${barLeft}%`, width: `${Math.max(barWidth, 8)}%` }}
                          />
                        </div>
                        <p className="text-[13px] font-semibold text-orange-400 w-7">{max}°</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 오늘 요약 */}
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white">
              <p className="text-[12px] font-semibold opacity-80 mb-2">오늘 요약</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[28px]">{wmoEmoji(weather.daily.weather_code[0])}</span>
                  <div>
                    <p className="text-[15px] font-bold">{wmoLabel(weather.daily.weather_code[0])}</p>
                    <p className="text-[12px] opacity-75">
                      최저 {Math.round(weather.daily.temperature_2m_min[0])}° / 최고 {Math.round(weather.daily.temperature_2m_max[0])}°
                    </p>
                  </div>
                </div>
                {weather.daily.precipitation_probability_max[0] > 30 && (
                  <div className="text-right">
                    <p className="text-[20px] font-black">💧{weather.daily.precipitation_probability_max[0]}%</p>
                    <p className="text-[11px] opacity-75">강수 확률</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-300 pb-2">Open-Meteo 제공 · 10분마다 업데이트</p>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <Eye size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] text-gray-400">날씨 정보를 불러올 수 없어요</p>
          </div>
        )}
      </div>
    </div>
  );
}
