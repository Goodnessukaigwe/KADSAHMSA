"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  Headphones,
  Home,
  Menu,
  Moon,
  PlaySquare,
  Search,
  Sun,
  X,
} from "lucide-react";

import { site } from "@/lib/content/landing";
import { clearLearner, firstNameOf } from "@/lib/learner-session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/my", label: "Homepage", icon: Home },
  { href: "/my/courses", label: "Courses", icon: PlaySquare },
  { href: "/quiz", label: "Quiz", icon: GraduationCap },
  { href: "/help", label: "Help Center", icon: Headphones },
] as const;

const CourseSearchContext = createContext<{
  query: string;
  setQuery: (value: string) => void;
}>({ query: "", setQuery: () => {} });

export function useCourseSearch() {
  return useContext(CourseSearchContext);
}

export function StudentChrome({
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
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const firstName = firstNameOf(user.name || "Learner");
  const initial = firstName.charAt(0).toUpperCase();

  const searchValue = useMemo(
    () => ({ query, setQuery }),
    [query]
  );

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

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pathname !== "/my") {
      router.push("/my");
    }
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <CourseSearchContext.Provider value={searchValue}>
      <div className="min-h-screen bg-[#f7f7f7] font-sans text-neutral-950">
        <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white">
          <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
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
                <span className="text-sm font-bold tracking-[0.14em] uppercase">
                  {site.name}
                </span>
              </Link>
            </div>

            <form
              onSubmit={onSearchSubmit}
              className="hidden w-[280px] md:block lg:w-[320px]"
            >
              <label htmlFor="learner-search" className="sr-only">
                Search courses
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/55" />
                <input
                  id="learner-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search course..."
                  className="h-10 w-full rounded-full bg-neutral-950 pr-4 pl-10 text-sm text-white outline-none placeholder:text-white/45"
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-1">
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
              <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={user.email}>
                  {firstName}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-white/55 hover:text-white"
                >
                  Log out
                </button>
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
            <form onSubmit={onSearchSubmit} className="mb-5 md:hidden">
              <label htmlFor="learner-search-mobile" className="sr-only">
                Search courses
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/55" />
                <input
                  id="learner-search-mobile"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search course..."
                  className="h-10 w-full rounded-full bg-neutral-950 pr-4 pl-10 text-sm text-white outline-none placeholder:text-white/45"
                />
              </div>
            </form>
            {children}
          </main>
        </div>
      </div>
    </CourseSearchContext.Provider>
  );
}
