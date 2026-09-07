"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  GraduationCap,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { site } from "@/lib/content/landing";
import { clearLearner, firstNameOf } from "@/lib/learner-session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap },
  { href: "/admin/users", label: "Users Metric", icon: Users },
] as const;

export function AdminChrome({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const name = firstNameOf(user.name || "Admin");

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Still clear leftover client keys below.
    }
    clearLearner();
    router.push("/");
    router.refresh();
  }

  const initial = name.charAt(0).toUpperCase();
  const builderMode = /^\/admin\/courses\/[^/]+/.test(pathname);

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950 text-white">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          {builderMode ? null : (
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 lg:hidden"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            <span className="sr-only">Toggle navigation</span>
          </button>
          )}
          <Link href="/admin" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
            <span className="text-sm font-bold tracking-[0.14em] uppercase">
              {site.name}
            </span>
          </Link>

          <form
            className="mx-auto hidden w-[280px] md:block lg:w-[360px]"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="admin-search" className="sr-only">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/45" />
              <input
                id="admin-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="search..."
                className="h-10 w-full rounded-full bg-white/10 pr-4 pl-10 text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </button>
            <Link
              href="/admin"
              className="flex size-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
            <div className="ml-2 hidden items-center gap-2 sm:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                {initial}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold" title={user.email}>
                  {name}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[11px] text-white/55 hover:text-white"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-start">
        {builderMode ? (
          <main className="min-w-0 flex-1">{children}</main>
        ) : (
          <>
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
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className="size-4" strokeWidth={active ? 2.4 : 2} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:pr-8 lg:pl-2">
              {children}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
