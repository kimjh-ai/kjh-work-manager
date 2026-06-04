"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
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
  const [msgUnread, setMsgUnread] = useState(0);

  const myName = user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";

  const loadUnread = useCallback(() => {
    if (!myName) return;
    Promise.all([
      fetch(`/api/dm/inbox?user=${encodeURIComponent(myName)}`).then(r => r.json()).catch(() => ({ inbox: [] })),
      fetch(`/api/topic?user=${encodeURIComponent(myName)}`).then(r => r.json()).catch(() => ({ counts: {} })),
    ]).then(([dmData, topicData]) => {
      const dmUnread = (dmData.inbox ?? []).reduce((sum: number, e: { unread: number }) => sum + (e.unread ?? 0), 0);
      const topicUnread = Object.values(topicData.counts ?? {}).reduce((sum: number, v) => sum + (v as number), 0);
      setMsgUnread(dmUnread + topicUnread);
    }).catch(() => {});
  }, [myName]);

  useEffect(() => {
    if (!myName) return;
    loadUnread();
    const t = setInterval(loadUnread, 10000);
    return () => clearInterval(t);
  }, [loadUnread]);

  if (!isLoaded || !user) return null;
  if (pathname.startsWith("/sign-")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="max-w-lg mx-auto flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isDm = href === "/dm";
          const badge = isDm && msgUnread > 0 ? msgUnread : 0;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}>
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
