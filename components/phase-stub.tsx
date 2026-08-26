import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PhaseStub({
  eyebrow,
  title,
  description,
  requirement,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  requirement: string;
  compact?: boolean;
}) {
  return (
    <main
      className={
        compact
          ? "flex flex-col gap-4"
          : "mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-4 px-6 py-16"
      }
    >
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="font-heading text-3xl font-semibold text-foreground">
        {title}
      </h1>
      <p className="text-muted-foreground">{description}</p>
      <p className="text-sm text-muted-foreground">PRD: {requirement}</p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
      >
        Back to home
      </Link>
    </main>
  );
}
