"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Headphones,
  Home,
  Menu,
  Moon,
  PlaySquare,
  Sun,
  X,
} from "lucide-react";

import { ChromeAvatarLink } from "@/components/profile/chrome-avatar";
import { ChromeNavLink } from "@/components/shells/chrome-nav-link";
import { site } from "@/lib/content/landing";
import { firstNameOf } from "@/lib/learner-session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/my", label: "Homepage", icon: Home },
  { href: "/my/courses", label: "Courses", icon: PlaySquare },
  { href: "/quiz", label: "Quiz", icon: GraduationCap },
  { href: "/help", label: "Help Center", icon: Headphones },
] as const;

export function StudentChrome({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarUrl?: string | null };
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const firstName = firstNameOf(user.name || "Learner");

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl border border-neutral-200 lg:hidden"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              <span className="sr-only">Toggle navigation</span>
            </button>
            <Link href="/my" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
              <span className="text-sm font-bold tracking-[0.08em] uppercase sm:tracking-[0.14em]">
                {site.name}
              </span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/help"
              className="flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
              aria-label="Help Center"
            >
              <Headphones className="size-4" />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
            <ChromeAvatarLink
              href="/my/profile"
              name={user.name}
              avatarUrl={user.avatarUrl}
              className="ml-1 size-9 bg-neutral-950 text-xs text-white"
            />
          </div>
        </div>
      </header>

      <div className="flex items-start gap-0 lg:gap-0">
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
            "fixed top-20 bottom-4 left-4 z-40 flex w-[220px] flex-col overflow-y-auto rounded-[28px] bg-neutral-950 px-5 py-6 text-white transition-transform lg:sticky lg:top-20 lg:z-0 lg:m-4 lg:h-[calc(100vh-6.5rem)] lg:translate-x-0",
            navOpen
              ? "translate-x-0"
              : "pointer-events-none invisible -translate-x-[120%] lg:pointer-events-auto lg:visible lg:translate-x-0"
          )}
        >
          <div className="flex items-center gap-3">
            <ChromeAvatarLink
              href="/my/profile"
              name={user.name}
              avatarUrl={user.avatarUrl}
              className="size-11 text-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" title={user.email}>
                {firstName}
              </p>
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-1" aria-label="Learner">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.label === "Quiz"
                  ? pathname === "/quiz" || pathname.includes("/quiz")
                  : item.label === "Courses"
                    ? pathname.startsWith("/my/courses") ||
                      (pathname.startsWith("/learn") &&
                        !pathname.includes("/quiz"))
                    : item.href === "/my"
                      ? pathname === "/my"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
              return (
                <ChromeNavLink key={item.label} href={item.href} active={active}>
                  <Icon className="size-4" strokeWidth={active ? 2.4 : 2} />
                  {item.label}
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
