import { privacyCopy } from "@/lib/content/privacy";

export function PrivacyNotice() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
        {privacyCopy.badge}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight break-words sm:text-4xl">
        {privacyCopy.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-400">{privacyCopy.versionLabel}</p>

      <p
        className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950"
        role="note"
      >
        {privacyCopy.draftBanner}
      </p>

      <p className="mt-8 text-[15px] leading-relaxed text-neutral-600">
        {privacyCopy.intro}
      </p>

      {privacyCopy.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-lg font-bold text-neutral-950">{section.heading}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
            {section.body.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-lg font-bold text-neutral-950">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {privacyCopy.contactLead}{" "}
          <a
            href={`mailto:${privacyCopy.contactEmail}`}
            className="font-semibold text-neutral-950 underline underline-offset-2"
          >
            {privacyCopy.contactEmail}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
