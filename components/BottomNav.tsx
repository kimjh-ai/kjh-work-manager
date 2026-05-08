"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";

const adminNav = [
  { href: "/", icon: LayoutDashboard, label: "홈" },
  { href: "/gathering", icon: Users, label: "집합" },
  { href: "/board", icon: MessageSquare, label: "게시판" },
  { href: "/more", icon: MoreHorizontal, label: "프로필만들기" },
  { href: "/stocks", icon: TrendingUp, label: "주식" },
];

const userNav = [
  { href: "/gathering", icon: Users, label: "집합" },
  { href: "/board", icon: MessageSquare, label: "게시판" },
  { href: "/more", icon: MoreHorizontal, label: "프로필만들기" },
  { href: "/stocks", icon: TrendingUp, label: "주식" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  // 로그인 전 또는 auth 페이지에선 숨김
  if (!isLoaded || !user) return null;
  if (pathname.startsWith("/sign-")) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const navItems = isAdmin(email) ? adminNav : userNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="max-w-lg mx-auto flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
