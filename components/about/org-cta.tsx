import Image from "next/image";

import { SplitCta } from "@/components/landing/split-cta";
import { aboutPage } from "@/lib/content/about";

export function OrgCta() {
  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[#2c2c2c]">
      <div className="relative min-h-[220px] flex-1">
        <Image
          src="/Panel%20Discussion/IMG_1651.jpg"
          alt="KADSAMHSA staff at a panel discussion"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 40vw"
        />
      </div>
      <div className="bg-[#2c2c2c] p-5 sm:p-7">
        <h3 className="text-xl font-semibold text-white sm:text-2xl">
          {aboutPage.org.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          {aboutPage.org.body}
        </p>
        <div className="mt-6">
          <SplitCta href={aboutPage.org.href} variant="light" className="w-full">
            {aboutPage.org.cta}
          </SplitCta>
        </div>
      </div>
    </div>
  );
}
