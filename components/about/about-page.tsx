import Image from "next/image";

import { OrgCta } from "@/components/about/org-cta";
import { FaqList } from "@/components/landing/faq-list";
import { aboutPage } from "@/lib/content/about";

export function AboutPage() {
  return (
    <div className="bg-white font-sans text-neutral-950">
      <Hero />
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
            src="/landing/about-apple.webp"
            alt="A world of learning growing from a single curriculum"
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

          <div className="mt-8 space-y-3">
            <article className="rounded-2xl bg-[#2c2c2c] px-5 py-5">
              <h2 className="text-[11px] font-bold tracking-[0.14em] text-[#c8e6c4] uppercase">
                {aboutPage.mission.label}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                {aboutPage.mission.text}
              </p>
            </article>
            <article className="rounded-2xl bg-[#2c2c2c] px-5 py-5">
              <h2 className="text-[11px] font-bold tracking-[0.14em] text-[#c8e6c4] uppercase">
                {aboutPage.vision.label}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                {aboutPage.vision.text}
              </p>
            </article>
          </div>
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
            defaultOpen={1}
            pill={aboutPage.faqPill}
          />
          <OrgCta />
        </div>
      </div>
    </section>
  );
}
