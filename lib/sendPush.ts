import webpush from "web-push";
import redis from "@/lib/redis";

export type NotifType = "gather" | "checkin" | "chat" | "board";

export interface NotifPrefs {
  gather: boolean;
  checkin: boolean;
  chat: boolean;
  board: boolean;
}

export interface StoredSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
  prefs?: NotifPrefs;
}

export const DEFAULT_PREFS: NotifPrefs = { gather: true, checkin: true, chat: true, board: true };

export const SUB_KEY = "push:subscriptions";

export async function sendPush(title: string, body: string, type: NotifType): Promise<void> {
  const vKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vPriv = process.env.VAPID_PRIVATE_KEY;
  const vEmail = process.env.VAPID_EMAIL;
  if (!vKey || !vPriv || !vEmail) return;

  webpush.setVapidDetails(vEmail, vKey, vPriv);
  const subRaw = await redis.get(SUB_KEY);
  const subs: StoredSub[] = subRaw ? JSON.parse(subRaw) : [];

  // 해당 타입 알림을 켠 구독자만 필터링
  const targets = subs.filter((s) => {
    const prefs = s.prefs ?? DEFAULT_PREFS;
    return prefs[type] !== false;
  });

  const payload = JSON.stringify({ title, body });
  const results = await Promise.allSettled(
    targets.map((sub) => webpush.sendNotification(sub as unknown as webpush.PushSubscription, payload))
  );

  // 만료된 구독(410) 제거
  const expiredEndpoints = new Set(
    targets
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
      })
      .map((s) => s.endpoint)
  );
  if (expiredEndpoints.size > 0) {
    await redis.set(SUB_KEY, JSON.stringify(subs.filter((s) => !expiredEndpoints.has(s.endpoint))));
  }
}
