"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Menu, X } from "lucide-react";

import { ChromeAccount } from "@/components/shells/chrome-account";
import { ChromeNavLink } from "@/components/shells/chrome-nav-link";
import { site } from "@/lib/content/landing";
import { cn } from "@/lib/utils";

export function OrgChrome({
  children,
  user,
  isStaff = false,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; avatarUrl?: string | null };
  isStaff?: boolean;
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
          <Link href="/org" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
            <span className="hidden text-sm font-bold tracking-[0.14em] uppercase sm:inline">
              {site.name}
            </span>
          </Link>
          <ChromeAccount
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            profileHref="/org/profile"
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
          <nav className="flex flex-col gap-1" aria-label="Organisation">
            <ChromeNavLink
              href="/org"
              active={pathname === "/org"}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </ChromeNavLink>
            {isStaff ? (
              <ChromeNavLink href="/admin/organizations">
                <Building2 className="size-4" />
                Admin organisations
              </ChromeNavLink>
            ) : (
              <ChromeNavLink href="/my">
                <LayoutDashboard className="size-4" />
                Learner home
              </ChromeNavLink>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:pr-8 lg:pl-2">{children}</main>
      </div>
    </div>
  );
}
