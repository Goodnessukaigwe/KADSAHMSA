"use client";

import Link, { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils";

export function ChromeNavLink({
  href,
  active = false,
  children,
  className,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} prefetch className={cn("block", className)}>
      <ChromeNavLinkStatus active={active}>{children}</ChromeNavLinkStatus>
    </Link>
  );
}

function ChromeNavLinkStatus({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        active || pending
          ? "bg-white/10 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </span>
  );
}
