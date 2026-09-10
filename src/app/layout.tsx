import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KobinFlow · jin kobin",
    template: "%s · KobinFlow",
  },
  description:
    "jin kobin 个人站脚手架：Next.js 15 + R3F。Agent DoD 闸门、材质球墙、产品转盘、机械臂仿真。",
};

/**
 * Layout notes — failure + mobile degrade:
 * - Dark base bg prevents white screen on slow JS / WebGL fail
 * - Header sticky; nav scrolls horizontally on narrow viewports
 * - Demo pages keep acceptance + fallback copy readable without WebGL
 * - prefers-reduced-motion handled in HomeExperience (disables R3F)
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-950 text-zinc-200">
        <Header />
        {children}
      </body>
    </html>
  );
}
