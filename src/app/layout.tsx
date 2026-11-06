import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazirmatn", display: "swap" });

export const metadata: Metadata = {
  title: "پنل مدیریت ایوا",
  description: "پنل خصوصی مدیریت و پایش ایوا",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" className={`${vazirmatn.variable} dark h-full`}><body className="min-h-dvh font-sans antialiased">{children}</body></html>;
}
