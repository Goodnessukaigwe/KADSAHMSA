import { SplitCta } from "@/components/landing/split-cta";
import { NewsletterForm } from "@/components/not-found/newsletter-form";
import { notFoundCopy } from "@/lib/content/not-found";

export function NotFoundPage() {
  return (
    <div className="bg-white font-sans text-neutral-950">
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-[1120px]">
          <div className="landing-grid overflow-hidden rounded-[28px] bg-[#f6f6f6] px-6 py-10 shadow-[0_16px_50px_rgba(0,0,0,0.06)] sm:px-10 sm:py-14 lg:px-14">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-md">
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium text-neutral-500 shadow-sm">
                  {notFoundCopy.badge}
                </span>
                <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-[2.6rem]">
                  {notFoundCopy.title}
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-neutral-500">
                  {notFoundCopy.body}
                </p>
                <div className="mt-8">
                  <SplitCta href="/">{notFoundCopy.cta}</SplitCta>
                </div>
              </div>
              <p
                className="select-none text-[7.5rem] leading-none font-bold tracking-[-0.06em] text-neutral-950 sm:text-[9rem] lg:text-[11rem]"
                aria-hidden="true"
              >
                404
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16" aria-labelledby="newsletter-heading">
        <div className="mx-auto max-w-[1120px] rounded-[28px] bg-neutral-950 px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2
                id="newsletter-heading"
                className="max-w-sm text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {notFoundCopy.newsTitle}
              </h2>
              <ul className="mt-6 space-y-3">
                {notFoundCopy.newsItems.map((item, index) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/85">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/20 text-[11px] font-semibold">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  );
}
