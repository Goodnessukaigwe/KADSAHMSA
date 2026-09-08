"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutDashboard, Menu, X } from "lucide-react";

import { site } from "@/lib/content/landing";
import { clearLearner, firstNameOf } from "@/lib/learner-session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function OrgChrome({
  children,
  user,
  isStaff = false,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  isStaff?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-neutral-950">
      <header className="sticky top-0 z-40 bg-neutral-950 text-white">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 lg:hidden"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            <span className="sr-only">Toggle navigation</span>
          </button>
          <Link href="/org" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
            <span className="text-sm font-bold tracking-[0.14em] uppercase">
              {site.name}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
              {initial}
            </span>
            <div className="hidden leading-tight sm:block">
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
          <nav className="flex flex-col gap-1" aria-label="Organisation">
            <Link
              href="/org"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                pathname === "/org" || pathname.startsWith("/org/")
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
            {isStaff ? (
              <Link
                href="/admin/organizations"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Building2 className="size-4" />
                Admin organisations
              </Link>
            ) : (
              <Link
                href="/my"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LayoutDashboard className="size-4" />
                Learner home
              </Link>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:pr-8 lg:pl-2">{children}</main>
      </div>
    </div>
  );
}
