import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type SplitCtaProps = {
  href?: string;
  children: React.ReactNode;
  icon?: "arrow" | "plus";
  variant?: "dark" | "light";
  size?: "sm" | "md";
  type?: "button" | "submit";
  className?: string;
  onClick?: () => void;
};

export function SplitCta({
  href: hrefProp,
  children,
  icon = "arrow",
  variant = "dark",
  size = "md",
  type = "button",
  className,
  onClick,
}: SplitCtaProps) {
  const Icon = icon === "plus" ? Plus : ArrowRight;
  const classNameMerged = cn("group inline-flex items-stretch gap-1", className);
  const labelClass = cn(
    "inline-flex flex-1 items-center justify-center rounded-full font-semibold tracking-wide whitespace-nowrap",
    size === "sm" ? "px-4 py-2 text-xs" : "px-5 py-3 text-sm",
    variant === "dark" ? "bg-neutral-950 text-white" : "bg-white text-neutral-950"
  );
  const iconClass = cn(
    "flex shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5",
    size === "sm" ? "size-9" : "size-12",
    variant === "dark"
      ? "bg-white text-neutral-950 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
      : "bg-neutral-950 text-white"
  );

  const inner = (
    <>
      <span className={labelClass}>{children}</span>
      <span className={iconClass} aria-hidden="true">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
    </>
  );

  if (!hrefProp) {
    return (
      <button type={type} className={classNameMerged} onClick={onClick}>
        {inner}
      </button>
    );
  }

  if (hrefProp?.startsWith("mailto:") || hrefProp?.startsWith("http")) {
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
