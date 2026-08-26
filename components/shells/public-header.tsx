import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/courses", label: "Courses" },
  { href: "/verify", label: "Verify certificate" },
];

export function PublicHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="KADSAMHSA" className="h-8 w-auto" />
          <span className="font-heading text-sm font-semibold tracking-wide sm:text-base">
            KADSAMHSA
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Log in
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
