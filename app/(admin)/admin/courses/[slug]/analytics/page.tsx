import { notFound } from "next/navigation";

import { CourseAnalyticsView } from "@/components/admin/course-analytics";
import { CoursePricing } from "@/components/admin/course-pricing";
import { GrantAccess } from "@/components/admin/grant-access";
import { WaitlistPanel } from "@/components/admin/waitlist-panel";
import { getCourseAnalytics } from "@/lib/admin/analytics";
import { getSeatTerms } from "@/lib/payments/checkout";
import { paystackConfigured } from "@/lib/payments/paystack";
import { listWaitlist } from "@/lib/waitlist/queries";

export const metadata = { title: "Course analytics" };

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [analytics, terms, waitlist] = await Promise.all([
    getCourseAnalytics(slug),
    getSeatTerms(slug),
    listWaitlist(slug),
  ]);
  if (!analytics) notFound();
  return (
    <>
      <CourseAnalyticsView analytics={analytics} />
      {terms ? (
        <>
          <CoursePricing
            slug={slug}
            priceNaira={terms.priceKobo / 100}
            paymentsReady={paystackConfigured()}
          />
          <GrantAccess slug={slug} />
          <WaitlistPanel entries={waitlist.entries} ready={waitlist.ready} />
        </>
      ) : null}
    </>
  );
}
