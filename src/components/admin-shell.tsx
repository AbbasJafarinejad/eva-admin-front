"use client";

import type React from "react";
import { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@heroui/react";
import { ChartBar, DownloadSimple, Heartbeat, House, Users, Archive } from "@phosphor-icons/react";
import clsx from "clsx";

export type AdminNavItem = { href: string; label: string; Icon: (props: { size?: number }) => React.ReactElement };

export function getNavItems() {
  const items: AdminNavItem[] = [
    { href: "/", label: "نمای کلی", Icon: (p) => <House size={p.size ?? 18} /> },
    { href: "/users", label: "کاربران", Icon: (p) => <Users size={p.size ?? 18} /> },
    { href: "/ai-usage", label: "مصرف و هزینه", Icon: (p) => <ChartBar size={p.size ?? 18} /> },
    { href: "/turns", label: "لاگ‌ها و خروجی‌ها", Icon: (p) => <DownloadSimple size={p.size ?? 18} /> },
    { href: "/backups", label: "پشتیبان‌ها", Icon: (p) => <Archive size={p.size ?? 18} /> },
    { href: "/service-health", label: "سلامت سرویس", Icon: (p) => <Heartbeat size={p.size ?? 18} /> },
  ];
  return items;
}

export function AdminShell({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const pathname = usePathname() || "/";
  const items = getNavItems();
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-separator bg-surface-secondary lg:block lg:border-l">
        <div className="sticky top-0 h-dvh p-4">
          <a href="/" className="mb-4 flex items-center gap-3 rounded-2xl p-2 text-accent">
            <div className="grid size-10 place-items-center rounded-2xl bg-accent/15 font-black text-accent">E</div>
            <div><p className="font-extrabold">مدیریت ایوا</p><p className="text-xs text-muted">پنل مدیریت</p></div>
          </a>
          <nav className="mt-2 grid gap-1">
            {items.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <a key={href} href={href} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold", active ? "bg-accent/15 text-accent" : "hover:bg-surface")}>
                  <span className={clsx("grid size-8 place-items-center rounded-lg", active ? "bg-accent/20 text-accent" : "bg-surface text-muted")}>
                    <Icon size={18} />
                  </span>
                  <span>{label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-separator bg-background/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-accent/15 font-black text-accent">E</div>
              <div><p className="font-extrabold">مدیریت ایوا</p><p className="text-xs text-muted">پنل مدیریت</p></div>
            </div>
          </div>
          <div className="border-t border-separator">
            <nav className="mx-auto grid max-w-7xl grid-cols-3 gap-1 px-3 py-2 text-xs">
              {items.slice(0, 3).map(({ href, label }) => (
                <a key={href} href={href} className={clsx("rounded-xl px-2 py-2 text-center font-semibold", pathname === href ? "bg-accent/15 text-accent" : "bg-surface text-muted")}>{label}</a>
              ))}
              {items.slice(3).map(({ href, label }) => (
                <a key={href} href={href} className={clsx("rounded-xl px-2 py-2 text-center font-semibold", pathname === href ? "bg-accent/15 text-accent" : "bg-surface text-muted")}>{label}</a>
              ))}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-accent">{subtitle || ""}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1></div>
          </div>
          <Card className="contents">{children}</Card>
        </div>
      </section>
    </main>
  );
}

