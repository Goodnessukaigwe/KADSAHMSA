import { PublicFooter } from "@/components/shells/public-footer";
import { PublicHeader } from "@/components/shells/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-white text-neutral-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-neutral-950 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <PublicHeader />
      <div id="main" className="flex-1">
        {children}
      </div>
      <PublicFooter />
    </div>
  );
}
