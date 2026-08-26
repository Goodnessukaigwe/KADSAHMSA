"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { nav, site } from "@/lib/content/landing";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/#")) return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-self-start"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kadsamhsa.svg" alt="" className="h-10 w-10 object-contain" />
          <span className="text-sm font-bold tracking-[0.14em] text-neutral-950 uppercase">
            {site.name}
          </span>
        </Link>

        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label="Primary"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors hover:text-neutral-950",
                isActive(pathname, item.href)
                  ? "text-neutral-950 underline decoration-neutral-300 underline-offset-8"
                  : "text-neutral-800"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-4 justify-self-end">
          <Link
            href="/login"
            className="hidden text-[11px] font-semibold tracking-[0.18em] text-neutral-800 uppercase hover:text-neutral-950 lg:inline"
          >
            Log in
          </Link>
          <div className="hidden lg:block">
            <SplitCta href="/register" size="sm">
              {pathname === "/login" || pathname === "/register"
                ? "Sign up"
                : "Join now"}
            </SplitCta>
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl border border-neutral-200 lg:hidden"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
            <span className="sr-only">Toggle navigation</span>
          </button>
        </div>
      </div>

      <div
        id="landing-mobile-nav"
        className={cn(
          "border-t border-neutral-200 bg-white px-4 py-4 lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1" aria-label="Mobile">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold",
                isActive(pathname, item.href) ? "bg-neutral-100 text-neutral-950" : "text-neutral-800"
              )}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-800"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
          <div className="pt-2">
            <SplitCta href="/register" className="w-full" onClick={() => setOpen(false)}>
              {pathname === "/login" || pathname === "/register"
                ? "Sign up"
                : "Join now"}
            </SplitCta>
          </div>
        </nav>
      </div>
    </header>
  );
}
