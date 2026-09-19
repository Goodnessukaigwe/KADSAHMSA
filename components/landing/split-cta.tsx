import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type SplitCtaProps = {
  href?: string;
  children: React.ReactNode;
  icon?: "arrow" | "plus";
  iconPlacement?: "split" | "inline";
  variant?: "dark" | "light";
  size?: "sm" | "md";
  type?: "button" | "submit";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
};

export function SplitCta({
  href: hrefProp,
  children,
  icon = "arrow",
  iconPlacement = "split",
  variant = "dark",
  size = "md",
  type = "button",
  className,
  onClick,
  disabled = false,
  busy = false,
}: SplitCtaProps) {
  const Icon = icon === "plus" ? Plus : ArrowRight;
  const isDisabled = disabled || busy;
  const inline = iconPlacement === "inline";
  const classNameMerged = cn(
    "group inline-flex min-h-11",
    inline ? "items-center" : "items-stretch gap-1",
    isDisabled && "pointer-events-none opacity-50",
    className
  );
  const labelClass = cn(
    "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full font-semibold tracking-wide whitespace-nowrap",
    inline && "gap-2",
    size === "sm" ? "px-4 py-2 text-xs" : "px-5 py-3 text-sm",
    inline && size === "sm" ? "pr-3.5" : inline ? "pr-4" : null,
    variant === "dark" ? "bg-neutral-950 text-white" : "bg-white text-neutral-950"
  );
  const iconClass = cn(
    "flex shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5",
    size === "sm" ? "size-11" : "size-12",
    variant === "dark"
      ? "border border-neutral-200 bg-white text-neutral-950"
      : "bg-neutral-950 text-white"
  );

  const inner = inline ? (
    <span className={labelClass}>
      {children}
      <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
    </span>
  ) : (
    <>
      <span className={labelClass}>{children}</span>
      <span className={iconClass} aria-hidden="true">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
    </>
  );

  if (isDisabled) {
    if (type === "submit") {
      return (
        <button
          type="submit"
          className={classNameMerged}
          disabled
          aria-disabled="true"
          aria-busy={busy || undefined}
        >
          {inner}
        </button>
      );
    }
    return (
      <span
        className={classNameMerged}
        role="button"
        aria-disabled="true"
        aria-busy={busy || undefined}
      >
        {inner}
      </span>
    );
  }

  if (!hrefProp) {
    return (
      <button
        type={type}
        className={classNameMerged}
        onClick={onClick}
        aria-busy={busy || undefined}
      >
        {inner}
      </button>
    );
  }

  if (hrefProp.startsWith("mailto:") || hrefProp.startsWith("http")) {
    return (
      <a href={hrefProp} className={classNameMerged} onClick={onClick}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={hrefProp} className={classNameMerged} onClick={onClick}>
      {inner}
    </Link>
  );
}
