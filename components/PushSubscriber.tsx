"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function saveSubscription(sub: PushSubscription, username?: string) {
  const subObj = sub.toJSON();
  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...subObj, username }),
  });
}

export async function unregisterPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch { /* no-op */ }
}

export async function registerPush(username?: string): Promise<"granted" | "denied" | "unsupported"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
    }
    // 항상 Redis에 재저장 (Redis 초기화 대비)
    await saveSubscription(sub, username);
    return "granted";
  } catch {
    return "denied";
  }
}

export default function PushSubscriber() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const name = user.firstName ?? user.username ?? user.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
    const imageUrl = user.imageUrl ?? null;

    // 최신 프로필 사진 Redis에 저장 (게시판 소급 적용용)
    if (name && imageUrl) {
      fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, imageUrl }),
      }).catch(() => {});
    }

    // 자동 등록 시도 (이미 권한 있으면 조용히 구독 갱신)
    if (Notification.permission === "granted") {
      registerPush(name).catch(() => {});
    }

    // 온라인 하트비트 — 30초마다 lastSeen 갱신
    const ping = () => {
      if (!name) return;
      fetch("/api/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, imageUrl }),
      }).catch(() => {});
    };
    ping();
    const timer = setInterval(ping, 30_000);
    return () => clearInterval(timer);
  }, [isLoaded, user]);

  return null;
}
