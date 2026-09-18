import { cn } from "@/lib/utils";

export function TabButton({
  selected,
  children,
  onClick,
  className,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center border-b-2 px-3 py-2 text-[11px] font-bold tracking-[0.14em] uppercase",
        selected
          ? "border-neutral-950 text-neutral-950"
          : "border-transparent text-neutral-400 hover:text-neutral-700",
        className
      )}
    >
      {children}
    </button>
  );
}
