import Link from "next/link";

import { firstNameOf } from "@/lib/learner-session";
import { cn } from "@/lib/utils";

export function ChromeAvatarLink({
  href,
  name,
  avatarUrl,
  className,
}: {
  href: string;
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const initial = firstNameOf(name || "Learner").charAt(0).toUpperCase();
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 font-bold",
        className
      )}
      aria-label="Profile"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initial
      )}
    </Link>
  );
}
