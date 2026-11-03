import { notFound } from "next/navigation";

import { CourseAnalyticsView } from "@/components/admin/course-analytics";
import { CoursePricing } from "@/components/admin/course-pricing";
import { GrantAccess } from "@/components/admin/grant-access";
import { getCourseAnalytics } from "@/lib/admin/analytics";
import { getSeatTerms } from "@/lib/payments/checkout";
import { paystackConfigured } from "@/lib/payments/paystack";

export const metadata = { title: "Course analytics" };

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [analytics, terms] = await Promise.all([getCourseAnalytics(slug), getSeatTerms(slug)]);
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
        </>
      ) : null}
    </>
  );
}
