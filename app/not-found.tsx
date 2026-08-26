import { NotFoundPage } from "@/components/not-found/not-found-page";
import { PublicFooter } from "@/components/shells/public-footer";
import { PublicHeader } from "@/components/shells/public-header";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-white text-neutral-950">
      <PublicHeader />
      <main id="main" className="flex-1">
        <NotFoundPage />
      </main>
      <PublicFooter />
    </div>
  );
}
