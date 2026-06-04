"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LayoutDashboard, Gamepad2, MessageCircle, MoreHorizontal } from "lucide-react";

const navItems = [
  { href: "/",      icon: LayoutDashboard, label: "홈" },
  { href: "/games", icon: Gamepad2,        label: "게임" },
  { href: "/dm",    icon: MessageCircle,   label: "메시지" },
  { href: "/more",  icon: MoreHorizontal,  label: "더보기" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;
  if (pathname.startsWith("/sign-")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="max-w-lg mx-auto flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
