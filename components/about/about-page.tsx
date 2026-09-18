import Image from "next/image";

import { OrgCta } from "@/components/about/org-cta";
import { FaqList } from "@/components/landing/faq-list";
import { SplitCta } from "@/components/landing/split-cta";
import { aboutPage } from "@/lib/content/about";

export function AboutPage() {
  return (
    <div className="bg-white font-sans text-neutral-950">
      <Hero />
      <Why />
      <Outcomes />
      <Audiences />
      <FaqAndOrg />
    </div>
  );
}

function Hero() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-[28px]">
          <Image
            src="/Rigasa/IMG_5748.jpg"
            alt="KADSAMHSA community gathering in Rigasa"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#7dba94] uppercase">
            {aboutPage.badge}
          </p>
          <h1
            id="about-title"
            className="mt-3 max-w-md text-3xl leading-[1.12] font-bold tracking-tight sm:text-4xl lg:text-[2.65rem]"
          >
            {aboutPage.title}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500">
            {aboutPage.lead}
          </p>
          <div className="mt-6">
            <SplitCta href={aboutPage.heroCtaHref}>{aboutPage.heroCta}</SplitCta>
          </div>

          <div className="mt-8 space-y-3">
            {aboutPage.purpose.map((item) => (
              <article key={item.label} className="rounded-2xl bg-[#2c2c2c] px-5 py-5">
                <h2 className="text-[11px] font-bold tracking-[0.14em] text-[#c8e6c4] uppercase">
                  {item.label}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="bg-[#f7f7f7] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-[1120px] items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#7dba94] uppercase">
            {aboutPage.why.badge}
          </p>
          <h2 className="mt-3 max-w-sm text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {aboutPage.why.title}
          </h2>
        </div>
        <div className="max-w-xl lg:pt-8">
          <p className="text-[15px] leading-relaxed text-neutral-500">
            {aboutPage.why.body}
          </p>
          <ul className="mt-6 space-y-3">
            {aboutPage.why.points.map((point) => (
              <li
                key={point}
                className="flex gap-3 text-sm leading-relaxed text-neutral-600"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#7dba94]"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Outcomes() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#7dba94] uppercase">
          {aboutPage.outcomes.badge}
        </p>
        <h2 className="mt-3 max-w-xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {aboutPage.outcomes.title}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {aboutPage.outcomes.items.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <span className="text-[11px] font-semibold tracking-[0.16em] text-neutral-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Audiences() {
  return (
    <section className="px-4 pb-8 sm:px-6 sm:pb-12">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {aboutPage.audiences.title}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {aboutPage.audiences.items.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl bg-[#f7f7f7] px-5 py-6"
            >
              <h3 className="text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqAndOrg() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 pb-8 sm:px-6">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {aboutPage.faqTitle}
        </h2>
        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <FaqList
            items={aboutPage.faqs}
            defaultOpen={0}
            pill={aboutPage.faqPill}
          />
          <OrgCta />
        </div>
      </div>
    </section>
  );
}
