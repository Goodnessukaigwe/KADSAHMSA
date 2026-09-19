"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  GraduationCap,
  Menu,
  MessageSquare,
  Users,
  X,
} from "lucide-react";

import { ChromeAccount } from "@/components/shells/chrome-account";
import { ChromeNavLink } from "@/components/shells/chrome-nav-link";
import { site } from "@/lib/content/landing";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap },
  { href: "/admin/users", label: "Users Metric", icon: Users },
  { href: "/admin/organizations", label: "Organisations", icon: Building2 },
  { href: "/admin/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
] as const;

export function AdminChrome({
  children,
  user,
  unreadFeedback = 0,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarUrl?: string | null };
  unreadFeedback?: number;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950 text-white">
        <div className="flex h-16 items-center gap-3 pl-4 pr-5 sm:pl-6 sm:pr-8">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 lg:hidden"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            <span className="sr-only">Toggle navigation</span>
          </button>
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
            <span className="hidden text-sm font-bold tracking-[0.08em] uppercase sm:inline sm:tracking-[0.14em]">
              {site.name}
            </span>
          </Link>

          <ChromeAccount
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            profileHref="/admin/profile"
          />
        </div>
      </header>

      <div className="flex items-start">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            "fixed top-20 bottom-4 left-4 z-40 flex w-[220px] flex-col rounded-[28px] bg-neutral-950 px-5 py-6 text-white transition-transform lg:sticky lg:top-20 lg:z-0 lg:m-4 lg:h-[calc(100vh-6.5rem)] lg:translate-x-0",
            navOpen
              ? "translate-x-0"
              : "pointer-events-none invisible -translate-x-[120%] lg:pointer-events-auto lg:visible lg:translate-x-0"
          )}
        >
          <nav className="flex flex-col gap-1" aria-label="Admin">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <ChromeNavLink key={item.label} href={item.href} active={active}>
                  <Icon className="size-4" strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                  {item.href === "/admin/feedback" && unreadFeedback > 0 ? (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-neutral-950">
                      {unreadFeedback}
                    </span>
                  ) : null}
                </ChromeNavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:pr-8 lg:pl-2">
          {children}
        </main>
      </div>
    </div>
  );
}
