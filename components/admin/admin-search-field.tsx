import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function AdminSearchField({
  id,
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-full max-w-[280px] items-center rounded-full border border-neutral-200 bg-[#f4f4f4] px-3.5",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-neutral-400" aria-hidden />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="ml-2 h-full min-w-0 flex-1 appearance-none bg-transparent text-sm leading-none text-neutral-950 outline-none placeholder:text-neutral-400 placeholder:tracking-wide [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
    </div>
  );
}
