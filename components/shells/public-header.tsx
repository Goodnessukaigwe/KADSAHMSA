"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { nav, site } from "@/lib/content/landing";
import { cn } from "@/lib/utils";

type NavHref = (typeof nav)[number]["href"];

function getActiveHref(pathname: string, hash: string): NavHref | null {
  if (pathname === "/" && hash === "#plans") return "/#plans";
  if (pathname === "/") return "/";

  for (const item of nav) {
    if (item.href === "/" || item.href.startsWith("/#")) continue;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.href;
    }
  }

  return null;
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const scrollToPlansOnHome = useRef(false);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/about");
    router.prefetch("/courses");
  }, [router]);

  useLayoutEffect(() => {
    setHash(window.location.hash);
    if (scrollToPlansOnHome.current && pathname === "/") {
      scrollToPlansOnHome.current = false;
      document
        .getElementById("plans")
        ?.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, [pathname]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const routeHref = getActiveHref(pathname, hash);
  const activeHref = pendingHref ?? routeHref;

  useEffect(() => {
    if (pendingHref && routeHref === pendingHref) {
      setPendingHref(null);
    }
  }, [pendingHref, routeHref]);

  const onPending = useCallback((href: string, pending: boolean) => {
    if (pending) setPendingHref(href);
  }, []);

  function onNavClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) {
    setOpen(false);
    setPendingHref(href);

    if (href === "/#plans") {
      if (pathname === "/") {
        event.preventDefault();
        document
          .getElementById("plans")
          ?.scrollIntoView({ behavior: "auto", block: "start" });
        window.history.replaceState(null, "", "/#plans");
        setHash("#plans");
        setPendingHref(null);
      } else {
        scrollToPlansOnHome.current = true;
      }
      return;
    }

    if (href === "/" && pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "auto" });
      window.history.replaceState(null, "", "/");
      setHash("");
      setPendingHref(null);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-self-start"
          onClick={() => {
            setOpen(false);
            if (pathname === "/") {
              window.history.replaceState(null, "", "/");
              window.scrollTo({ top: 0, behavior: "auto" });
              setHash("");
              setPendingHref(null);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kadsamhsa.svg" alt="" className="h-10 w-10 object-contain" />
          <span className="text-sm font-bold tracking-[0.08em] text-neutral-950 uppercase sm:tracking-[0.14em]">
            {site.name}
          </span>
        </Link>

        <PublicDesktopNav
          activeHref={activeHref}
          onNavClick={onNavClick}
          onPending={onPending}
        />

        <div className="flex items-center justify-end gap-4 justify-self-end">
          <Link
            href="/login"
            className="hidden min-h-11 items-center px-2 py-2 text-[11px] font-semibold tracking-[0.18em] text-neutral-800 uppercase hover:text-neutral-950 lg:inline-flex"
          >
            Log in
          </Link>
          <div className="hidden lg:block">
            <SplitCta href="/register" size="sm" iconPlacement="inline">
              Sign up
            </SplitCta>
          </div>

          <button
            type="button"
            className="outline-control flex size-10 items-center justify-center rounded-xl lg:hidden"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
            <span className="sr-only">Toggle navigation</span>
          </button>
        </div>
      </div>

      <div
        id="landing-mobile-nav"
        className={cn(
          "border-t border-neutral-200 bg-white px-4 py-4 lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1" aria-label="Mobile">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              scroll={item.href !== "/#plans"}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold",
                activeHref === item.href
                  ? "bg-neutral-100 text-neutral-950"
                  : "text-neutral-800"
              )}
              aria-current={activeHref === item.href ? "page" : undefined}
              onClick={(event) => onNavClick(event, item.href)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-neutral-800"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
          <div className="pt-2">
            <SplitCta
              href="/register"
              className="w-full"
              iconPlacement="inline"
              onClick={() => setOpen(false)}
            >
              Sign up
            </SplitCta>
          </div>
        </nav>
      </div>
    </header>
  );
}

function PublicDesktopNav({
  activeHref,
  onNavClick,
  onPending,
}: {
  activeHref: string | null;
  onNavClick: (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => void;
  onPending: (href: string, pending: boolean) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [bar, setBar] = useState({ x: 0, width: 0, visible: false });
  const [animate, setAnimate] = useState(false);

  const updateBar = useCallback(() => {
    const navEl = navRef.current;
    const linkEl = activeHref ? linkRefs.current.get(activeHref) : undefined;
    if (!navEl || !linkEl) {
      setBar((current) => ({ ...current, visible: false }));
      return;
    }

    const navRect = navEl.getBoundingClientRect();
    const linkRect = linkEl.getBoundingClientRect();
    const inset = 8;
    setBar({
      x: linkRect.left - navRect.left + inset,
      width: Math.max(0, linkRect.width - inset * 2),
      visible: true,
    });
  }, [activeHref]);

  useLayoutEffect(() => {
    updateBar();
  }, [updateBar]);

  useEffect(() => {
    if (!bar.visible) return;
    const frame = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, [bar.visible]);

  useEffect(() => {
    window.addEventListener("resize", updateBar);
    return () => window.removeEventListener("resize", updateBar);
  }, [updateBar]);

  return (
    <nav
      ref={navRef}
      className="relative hidden items-center gap-8 lg:flex"
      aria-label="Primary"
    >
      {nav.map((item) => (
        <PublicNavLink
          key={item.href}
          href={item.href}
          active={activeHref === item.href}
          onClick={(event) => onNavClick(event, item.href)}
          onPending={onPending}
          onElement={(element) => {
            if (element) linkRefs.current.set(item.href, element);
            else linkRefs.current.delete(item.href);
          }}
        >
          {item.label}
        </PublicNavLink>
      ))}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-2.5 h-px bg-neutral-300",
          animate && "transition-[transform,width] duration-100 ease-out"
        )}
        style={{
          width: bar.visible ? bar.width : 0,
          transform: `translateX(${bar.x}px)`,
          opacity: bar.visible ? 1 : 0,
        }}
      />
    </nav>
  );
}

function PublicNavLink({
  href,
  active,
  onClick,
  onPending,
  onElement,
  children,
}: {
  href: string;
  active: boolean;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onPending: (href: string, pending: boolean) => void;
  onElement: (element: HTMLAnchorElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      ref={onElement}
      href={href}
      prefetch
      scroll={href !== "/#plans"}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex min-h-11 items-center px-2 py-2 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors duration-100 hover:text-neutral-950",
        active ? "text-neutral-950" : "text-neutral-800"
      )}
    >
      {children}
      <PublicNavPending href={href} onPending={onPending} />
    </Link>
  );
}

function PublicNavPending({
  href,
  onPending,
}: {
  href: string;
  onPending: (href: string, pending: boolean) => void;
}) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    onPending(href, pending);
  }, [href, pending, onPending]);

  return null;
}
