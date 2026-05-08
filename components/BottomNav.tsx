"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  TrendingUp,
  FileText,
  MoreHorizontal,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "홈" },
  { href: "/todos", icon: CheckSquare, label: "할일" },
  { href: "/stocks", icon: TrendingUp, label: "주식" },
  { href: "/notes", icon: FileText, label: "메모" },
  { href: "/more", icon: MoreHorizontal, label: "더보기" },
];

export default function BottomNav() {
  const pathname = usePathname();
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
                active
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
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
