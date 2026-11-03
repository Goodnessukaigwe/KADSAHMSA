import { requestEnrolment } from "@/lib/learning/actions";
import { startCheckout } from "@/lib/payments/actions";

export type EnrolOutcome =
  | { kind: "enrolled" }
  | { kind: "redirecting" }
  | { kind: "error"; error: string };

/**
 * What every Enroll button does: enrol straight away when the course has no price, otherwise
 * send the learner to Paystack. Call from client components.
 */
export async function enrolOrPay(slug: string): Promise<EnrolOutcome> {
  const result = await requestEnrolment(slug);
  if (result.ok) return { kind: "enrolled" };
  if ("needsPayment" in result) {
    const checkout = await startCheckout(slug);
    if (checkout.ok) {
      window.location.assign(checkout.url);
      return { kind: "redirecting" };
    }
    return { kind: "error", error: checkout.error };
  }
  return { kind: "error", error: result.error };
}
