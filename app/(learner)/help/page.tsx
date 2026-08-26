import { site } from "@/lib/content/landing";

export const metadata = { title: "Help Center" };

export default function HelpPage() {
  return (
    <div className="max-w-xl py-4">
      <p className="text-sm text-neutral-400">Support</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Help Center</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-neutral-500">
        Training support for the KADSAMHSA LMS. Reach the Kaduna team if you
        cannot access a course, a quiz, or a certificate.
      </p>
      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-neutral-950">Email</dt>
          <dd>
            <a
              href={`mailto:${site.email}`}
              className="text-neutral-600 underline"
            >
              {site.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-950">Phone</dt>
          <dd className="text-neutral-600">{site.phone}</dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-950">Location</dt>
          <dd className="text-neutral-600">{site.location}</dd>
        </div>
      </dl>
    </div>
  );
}
