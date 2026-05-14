import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PushSubscriber from "@/components/PushSubscriber";

export const metadata: Metadata = {
  title: "Work Manager",
  description: "생산품질팀 업무 관리 앱",
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Work Manager",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={koKR}>
      <html lang="ko" className="h-full">
        <body className="h-full antialiased app-bg">
          <PushSubscriber />
          <main className="max-w-lg mx-auto pb-20 min-h-screen">
            {children}
          </main>
          <BottomNav />
        </body>
      </html>
    </ClerkProvider>
  );
}
