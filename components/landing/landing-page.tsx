import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { FaqList } from "@/components/landing/faq-list";
import { SplitCta } from "@/components/landing/split-cta";
import { TeamCta } from "@/components/landing/team-cta";
import { emptyCatalogueCopy } from "@/lib/content/catalogue";
import {
  about,
  faqs,
  featured,
  hero,
  plans,
  stats,
} from "@/lib/content/landing";
import type { CatalogueCourse } from "@/lib/courses/types";

const HERO_IMAGES = [
  { src: "/landing/hero-cabin.webp", alt: "A training retreat cabin at dusk" },
  { src: "/landing/hero-phoenix.webp", alt: "A phoenix rising, a symbol of recovery" },
  { src: "/landing/hero-crystal.webp", alt: "A glowing structure in a forest clearing" },
] as const;

export function LandingPage({
  publishedCourses = [],
}: {
  publishedCourses?: CatalogueCourse[];
}) {
  return (
    <div className="overflow-x-clip bg-white font-sans text-neutral-950">
      <Hero />
      <About />
      <FeaturedCourses courses={publishedCourses} />
      <Plans />
      <Faq />
    </div>
  );
}

function Hero() {
  return (
    <section className="landing-grid relative overflow-hidden">
      <div className="mx-auto max-w-[1120px] px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-14">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kadsamhsa.svg" alt="" className="h-5 w-5 object-contain" />
          <span className="text-[11px] font-semibold tracking-[0.08em] text-neutral-600">
            {hero.badge}
          </span>
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-[1.75rem] leading-[1.12] font-bold tracking-tight break-words text-neutral-950 sm:text-5xl lg:text-[56px]">
          {hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-neutral-500">
          {hero.subtitle}
        </p>
        <div className="mt-8 flex justify-center">
          <SplitCta href="/courses">{hero.cta}</SplitCta>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {HERO_IMAGES.map((image, index) => (
            <div
              key={image.src}
              className="relative aspect-[16/10] overflow-hidden rounded-2xl"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-[1120px] items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500">
            {about.badge}
          </span>
          <h2 className="mt-4 max-w-lg text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {about.title}
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-500">
            {about.body}
          </p>
          <div className="mt-6">
            <SplitCta href="/about">{about.cta}</SplitCta>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white px-3 py-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:px-4"
              >
                <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {item.value}
                </div>
                <div className="mt-1 text-[11px] leading-snug break-words text-neutral-500 sm:text-xs">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl sm:aspect-[4/5] lg:aspect-auto lg:min-h-[560px]">
            <Image
              src="/landing/about-stall.webp"
              alt="Evening gathering under lantern light"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
          <Link
            href="/courses"
            className="absolute top-1/2 -right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg lg:flex"
            aria-label="Browse courses"
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedCourses({ courses }: { courses: CatalogueCourse[] }) {
  return (
    <section id="courses" className="scroll-mt-24 bg-[#f7f7f7] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <header className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {featured.title}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-neutral-500">
            {featured.subtitle}
          </p>
        </header>

        {courses.length === 0 ? (
          <p className="mt-12 text-center text-sm text-neutral-500">
            {emptyCatalogueCopy}
          </p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {courses.map((course) => {
              const href = `/courses/${course.slug}`;
              const duration =
                course.durationLabel ||
                `${course.lessons} ${course.lessons === 1 ? "lesson" : "lessons"}`;
              return (
                <article
                  key={course.slug}
                  className="relative rounded-2xl bg-white px-5 pt-10 pb-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
                >
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white uppercase">
                    Free
                  </span>
                  <h3 className="min-h-[3.5rem] text-[17px] leading-snug font-bold">
                    {course.title}
                  </h3>
                  <dl className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 text-center">
                    <div className="px-1">
                      <dt className="text-[10px] tracking-wide text-neutral-400 uppercase">
                        Price
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">Free</dd>
                    </div>
                    <div className="px-1">
                      <dt className="text-[10px] tracking-wide text-neutral-400 uppercase">
                        Method
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">Self-paced</dd>
                    </div>
                    <div className="px-1">
                      <dt className="text-[10px] tracking-wide text-neutral-400 uppercase">
                        Duration
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">{duration}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 min-h-[4.5rem] text-sm leading-relaxed text-neutral-500">
                    {course.summary || "A published KADSAMHSA course."}
                  </p>
                  <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <SplitCta href={href} icon="plus" className="min-w-0 w-full sm:w-auto">
                      View course
                    </SplitCta>
                    <Link
                      href={href}
                      className="inline-flex h-9 shrink-0 items-center justify-center text-[11px] font-semibold tracking-[0.14em] text-neutral-800 uppercase"
                    >
                      Learn more
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section id="plans" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <header className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {plans.title}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-neutral-500">
            {plans.subtitle}
          </p>
        </header>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            {plans.highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <PlanCard plan={plans.free} tone="light" />
          <PlanCard plan={plans.org} tone="dark" />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  tone,
}: {
  plan: typeof plans.free | typeof plans.org;
  tone: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="p-5">
        <div className="rounded-2xl bg-neutral-950 px-5 py-6 text-center text-white">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase">
            {plan.name}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{plan.price}</p>
        </div>
        <p className="mt-4 text-sm text-neutral-500">{plan.blurb}</p>
        <div className="mt-5">
          <SplitCta href={plan.href} className="w-full">
            {plan.cta}
          </SplitCta>
        </div>
      </div>
      <div className={dark ? "flex-1 bg-neutral-950 p-5 text-white" : "flex-1 p-5"}>
        <p className="text-xs font-semibold tracking-[0.12em] uppercase">
          Features
        </p>
        <ul className="mt-4 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <span
                className={
                  dark
                    ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10"
                    : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-neutral-100"
                }
              >
                <Check className="size-3" />
              </span>
              <span className={dark ? "text-white/80" : "text-neutral-600"}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:pb-8 sm:pt-8">
      <div className="mx-auto grid max-w-[1120px] items-start gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Common questions we&apos;ve been asked
          </h2>
          <div className="mt-8">
            <FaqList items={faqs} />
          </div>
        </div>
        <TeamCta />
      </div>
    </section>
  );
}
