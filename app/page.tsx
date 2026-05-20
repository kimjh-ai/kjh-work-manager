"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CheckCircle2, Circle, TrendingUp, TrendingDown, Minus,
  AlertTriangle, ChevronRight, Users, MessageSquare,
  Pin, RefreshCw,
} from "lucide-react";
import { getTodos, saveTodos } from "@/lib/storage";
import { Todo } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface StockData { symbol: string; name: string; price: number; change: number; changePercent: number }
interface OnlineUser { name: string; imageUrl: string | null }
interface Notice { id: string; title: string; content: string; author: string; important: boolean; createdAt: string }
interface Birthday { name: string; month: number; day: number; imageUrl: string | null }

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

const CATEGORY_LABEL: Record<string, string> = {
  quality: "품질", deadline: "마감", document: "문서", meeting: "회의",
  expense: "경비", material: "부자재", general: "일반",
};

function daysUntil(month: number, day: number) {
  const today = new Date();
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  const diff = thisYear.getTime() - new Date().setHours(0, 0, 0, 0);
  if (diff >= 0) return Math.ceil(diff / 86400000);
  return Math.ceil((new Date(today.getFullYear() + 1, month - 1, day).getTime() - Date.now()) / 86400000);
}

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 11) return `좋은 아침이에요, ${name}님 🌅`;
  if (h < 13) return `점심 시간이에요, ${name}님 🍱`;
  if (h < 18) return `오후도 화이팅, ${name}님 ☀️`;
  if (h < 21) return `퇴근하셨나요, ${name}님 🌙`;
  return `야근 중이세요, ${name}님? 😅`;
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cityId, setCityId] = useState("seoul");

  const today = format(new Date(), "M월 d일 (EEE)", { locale: ko });
  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
  const myImage = user?.imageUrl ?? null;

  useEffect(() => {
    if (isLoaded && !user) router.replace("/sign-in");
  }, [isLoaded, user, router]);

  useEffect(() => {
    setTodos(getTodos());
    const refresh = () => setTodos(getTodos());
    window.addEventListener("todosUpdated", refresh);
    return () => window.removeEventListener("todosUpdated", refresh);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/stocks?symbols=005930,000660,034020,373220,005380")
      .then((r) => r.json()).then((d) => setStocks(d.stocks ?? [])).catch(() => {}).finally(() => setStockLoading(false));
    fetch("/api/online").then((r) => r.json()).then((d) => setOnlineUsers(d.users ?? [])).catch(() => {});
    fetch("/api/notice").then((r) => r.json()).then((d) => setNotices(d.notices ?? [])).catch(() => {});
    fetch("/api/birthday").then((r) => r.json()).then((d) => setBirthdays(d.birthdays ?? [])).catch(() => {});
    // localStorage에서 마지막 선택 도시 복원
    const saved = localStorage.getItem("weather_city");
    if (saved && CITIES.find((c) => c.id === saved)) setCityId(saved);
  }, [isLoaded, user]);

  useEffect(() => {
    const c = CITIES.find((c) => c.id === cityId) ?? CITIES[0];
    fetch(`/api/weather?lat=${c.lat}&lon=${c.lon}`)
      .then((r) => r.json())
      .then((d) => { if (d.current) setWeather(d); })
      .catch(() => {});
  }, [cityId]);

  const toggle = (id: string) => {
    const updated = todos.map((t) => t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t);
    setTodos(updated); saveTodos(updated);
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const pendingTodos = todos.filter((t) => !t.completed && (!t.dueDate || t.dueDate <= todayStr));
  const completedCount = todos.filter((t) => t.completed).length;

  // 가까운 생일 (30일 이내)
  const nearBirthdays = birthdays
    .map((b) => ({ ...b, days: daysUntil(b.month, b.day) }))
    .filter((b) => b.days <= 7)
    .sort((a, b) => a.days - b.days);

  const topNotice = notices.find((n) => n.important) ?? notices[0];

  if (!isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 헤더 */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-gray-400">{today}</p>
            <p className="text-[20px] font-bold text-gray-900 mt-0.5 leading-snug">{greeting(myName)}</p>
          </div>
          <Link href="/profile">
            {myImage
              ? <img src={myImage} alt="프로필" className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 flex-shrink-0" />
              : <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0" />
            }
          </Link>
        </div>

        {/* 온라인 유저 */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-2 mt-4 bg-green-50 rounded-2xl px-3 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 6).map((u) => <Avatar key={u.name} imageUrl={u.imageUrl} name={u.name} size={24} />)}
            </div>
            <p className="text-[12px] text-green-700 font-semibold">{onlineUsers.length}명 접속 중</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* 날씨 카드 */}
        {weather ? (
          <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl p-4 text-white">
            {/* 도시 선택 + 바람/습도 */}
            <div className="flex items-center justify-between mb-3">
              <select
                value={cityId}
                onChange={(e) => { setCityId(e.target.value); localStorage.setItem("weather_city", e.target.value); }}
                aria-label="지역 선택" title="지역 선택"
                className="bg-white/20 text-white text-[13px] font-bold rounded-xl px-3 py-1.5 outline-none appearance-none cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id} className="text-gray-900 bg-white">{c.name}</option>
                ))}
              </select>
              <div className="text-right text-[12px] opacity-80 space-y-0.5">
                <p>💧 {weather.current.relative_humidity_2m}%</p>
                <p>💨 {Math.round(weather.current.wind_speed_10m)}km/h</p>
              </div>
            </div>

            {/* 현재 날씨 */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[52px] leading-none">{wmoEmoji(weather.current.weather_code)}</span>
              <div>
                <p className="text-[46px] font-black leading-none">{Math.round(weather.current.temperature_2m)}°</p>
                <p className="text-[13px] font-semibold opacity-90 mt-0.5">{wmoLabel(weather.current.weather_code)}</p>
                <p className="text-[12px] opacity-70 mt-0.5">
                  체감 {Math.round(weather.current.apparent_temperature)}° &nbsp;·&nbsp;
                  최저 {Math.round(weather.daily.temperature_2m_min[0])}° / 최고 {Math.round(weather.daily.temperature_2m_max[0])}°
                </p>
              </div>
            </div>

            {/* 7일 예보 */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {weather.daily.time.map((date, i) => {
                const d = new Date(date);
                const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
                const label = i === 0 ? "오늘" : i === 1 ? "내일" : dayNames[d.getDay()];
                const rain = weather.daily.precipitation_probability_max[i];
                return (
                  <div key={date} className="flex-shrink-0 flex flex-col items-center gap-1 bg-white/15 rounded-xl px-2.5 py-2 min-w-[46px]">
                    <p className="text-[11px] font-bold opacity-90">{label}</p>
                    <span className="text-[18px]">{wmoEmoji(weather.daily.weather_code[i])}</span>
                    <p className="text-[12px] font-bold">{Math.round(weather.daily.temperature_2m_max[i])}°</p>
                    <p className="text-[11px] opacity-65">{Math.round(weather.daily.temperature_2m_min[i])}°</p>
                    {rain > 30 && <p className="text-[10px] opacity-80">💧{rain}%</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl p-4 h-[170px] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* 퀵 액세스 */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: "/gathering", emoji: "🚨", label: "집합" },
            { href: "/board",     emoji: "📋", label: "게시판" },
            { href: "/gathering?tab=today", emoji: "☀️", label: "오늘" },
            { href: "/notice",    emoji: "📌", label: "공지" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-3.5 gap-1 active:bg-gray-50">
              <span className="text-[22px]">{item.emoji}</span>
              <span className="text-[12px] font-semibold text-gray-600">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 진행률 카드 */}
        {todos.length > 0 && (
          <div className="bg-blue-600 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[14px] font-semibold opacity-90">오늘 할 일</span>
              <span className="text-[13px] opacity-80">{completedCount}/{todos.length} 완료</span>
            </div>
            <div className="w-full bg-blue-500/50 rounded-full h-2 mb-2">
              <div className="progress-bar bg-white rounded-full h-2 transition-all"
                style={{ "--progress": todos.length ? `${(completedCount / todos.length) * 100}%` : "0%" } as React.CSSProperties} />
            </div>
            <p className="text-[12px] opacity-75">
              {todos.length - completedCount === 0 ? "모두 완료했어요 🎉" : `${todos.length - completedCount}개 남았어요`}
            </p>
          </div>
        )}

        {/* 생일 알림 (7일 이내) */}
        {nearBirthdays.length > 0 && (
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
            <p className="text-[12px] font-bold text-pink-500 mb-2">🎂 곧 생일이에요!</p>
            <div className="space-y-2">
              {nearBirthdays.map((b) => (
                <div key={b.name} className="flex items-center gap-2.5">
                  <Avatar imageUrl={b.imageUrl} name={b.name} size={32} />
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-gray-800">{b.name}</p>
                    <p className="text-[12px] text-pink-400">{b.month}월 {b.day}일 · {b.days === 0 ? "🎉 오늘!" : `D-${b.days}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최신 공지 */}
        {topNotice && (
          <Link href="/notice" className="block bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-2">
              {topNotice.important && <Pin size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">최신 공지</p>
                <p className="text-[15px] font-bold text-gray-900 truncate">{topNotice.title}</p>
                {topNotice.content && <p className="text-[13px] text-gray-500 mt-0.5 truncate">{topNotice.content}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
            </div>
          </Link>
        )}

        {/* 할 일 목록 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-gray-800">📋 오늘 할 일</h2>
            <Link href="/todos" className="text-[12px] text-blue-500 font-semibold flex items-center gap-0.5">
              전체보기 <ChevronRight size={13} />
            </Link>
          </div>
          {pendingTodos.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle2 size={28} className="mx-auto text-green-400 mb-2" />
              <p className="text-[13px] text-gray-400">모든 할 일을 완료했어요!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingTodos.slice(0, 5).map((todo) => (
                <button key={todo.id} type="button" onClick={() => toggle(todo.id)}
                  aria-label={`${todo.title} 완료 처리`}
                  className="w-full flex items-center gap-3 text-left rounded-xl p-2 -mx-2 hover:bg-gray-50 transition-colors">
                  <Circle size={18} className="text-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-gray-800 truncate">{todo.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full priority-badge-${todo.priority}`}>
                        {CATEGORY_LABEL[todo.category]}
                      </span>
                      {todo.dueDate && <span className="text-[11px] text-gray-400">{todo.dueDate}</span>}
                    </div>
                  </div>
                  {todo.priority === "high" && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                </button>
              ))}
              {pendingTodos.length > 5 && (
                <Link href="/todos" className="block text-center text-[12px] text-blue-500 pt-1 font-semibold">
                  +{pendingTodos.length - 5}개 더 있어요
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 주식 위젯 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-gray-800">📈 주요 주식</h2>
            <Link href="/stocks" className="text-[12px] text-blue-500 font-semibold flex items-center gap-0.5">
              전체보기 <ChevronRight size={13} />
            </Link>
          </div>
          {stockLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stocks.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-2">데이터를 불러올 수 없어요</p>
          ) : (
            <div className="space-y-1">
              {stocks.slice(0, 4).map((s) => {
                const up = s.change > 0; const down = s.change < 0;
                const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
                const cls = up ? "up" : down ? "down" : "flat";
                return (
                  <div key={s.symbol} className="flex items-center justify-between py-1.5">
                    <p className="text-[14px] text-gray-800 font-medium">{s.name}</p>
                    <div className="text-right">
                      <span className={`text-[14px] font-semibold ${cls}`}>{s.price.toLocaleString()}</span>
                      <div className={`flex items-center justify-end gap-0.5 text-[12px] ${cls}`}>
                        <Icon size={10} /><span>{up ? "+" : ""}{s.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 팀 바로가기 */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/gathering" className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 active:bg-gray-50">
            <Users size={20} className="text-red-500" />
            <div>
              <p className="text-[14px] font-semibold text-gray-800">집합</p>
              <p className="text-[12px] text-gray-400">팀 채팅 · 현황</p>
            </div>
          </Link>
          <Link href="/board" className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 active:bg-gray-50">
            <MessageSquare size={20} className="text-blue-500" />
            <div>
              <p className="text-[14px] font-semibold text-gray-800">게시판</p>
              <p className="text-[12px] text-gray-400">자유 소통</p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
