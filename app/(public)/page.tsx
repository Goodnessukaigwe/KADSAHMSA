import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            KADSAMHSA Learning Platform
          </p>
          <h1 className="font-heading text-4xl leading-tight font-semibold sm:text-5xl">
            Drug prevention training, at your pace, with a verifiable certificate.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Self-paced courses for individuals and partner organisations in
            Nigeria. Launch course: Sensitization on Drug Use, Drug Dependence
            and Drug Prevention, Treatment and Care (DPTC).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/courses" className={cn(buttonVariants({ size: "lg" }))}>
              Browse courses
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Create a free account
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Image
            src="/Course.png"
            alt="KADSAMHSA course catalogue"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </section>
    </main>
  );
}
