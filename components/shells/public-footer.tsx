import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";

import { footer, site } from "@/lib/content/landing";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "hover:text-white";
  if (href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        className="fill-current"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        className="fill-current"
        d="M13.5 21v-7.2h2.4l.36-2.8H13.5V9.2c0-.8.22-1.35 1.38-1.35H16.5V5.35C16.16 5.3 15.2 5.2 14.08 5.2c-2.34 0-3.94 1.43-3.94 4.05v1.75H7.8v2.8h2.34V21h3.36z"
      />
    </svg>
  );
}

const social = [
  { href: "https://www.instagram.com", label: "Instagram", icon: InstagramIcon },
  { href: "https://twitter.com", label: "X (Twitter)", icon: XIcon },
  { href: "https://www.facebook.com", label: "Facebook", icon: FacebookIcon },
] as const;

export function PublicFooter() {
  return (
    <footer>
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20" aria-label={site.name}>
        <div className="mx-auto flex max-w-[1120px] flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kadsamhsa.svg"
            alt=""
            className="h-24 w-24 object-contain sm:h-28 sm:w-28"
          />
          <p className="mt-4 text-2xl font-bold tracking-[0.22em] text-neutral-950 uppercase">
            {site.name}
          </p>
          <p className="mt-2 max-w-md text-sm text-neutral-500">{site.fullName}</p>

          <div className="mt-6 flex items-center gap-2">
            {social.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex size-9 items-center justify-center rounded-md bg-neutral-950 text-white"
                aria-label={item.label}
              >
                <item.icon className="size-3.5" />
              </a>
            ))}
          </div>

          <div className="mt-10 flex w-full max-w-3xl flex-col items-center gap-4 text-xs font-semibold tracking-[0.12em] text-neutral-700 uppercase sm:flex-row sm:justify-center sm:gap-0">
            <div className="flex items-center gap-2 px-6">
              <MapPin className="size-3.5" />
              <span>{site.location}</span>
            </div>
            <span className="hidden h-8 w-px bg-neutral-200 sm:block" aria-hidden="true" />
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 px-6">
              <Phone className="size-3.5" />
              <span>{site.phone}</span>
            </a>
            <span className="hidden h-8 w-px bg-neutral-200 sm:block" aria-hidden="true" />
            <a href={`mailto:${site.email}`} className="flex items-center gap-2 px-6">
              <Mail className="size-3.5" />
              <span className="normal-case tracking-normal">{site.email}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">{footer.product.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {footer.product.links.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">{footer.resources.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {footer.resources.links.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <p className="text-xs text-white/55">
              © {site.year} {site.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/about" className="text-xs text-white/55 hover:text-white">
                Privacy
              </Link>
              <Link href="/about" className="text-xs text-white/55 hover:text-white">
                Terms of use
              </Link>
              <a
                href="#top"
                className="flex size-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
                aria-label="Back to top"
              >
                <ArrowUp className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
