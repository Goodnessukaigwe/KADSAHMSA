import { fulfilPayment } from "@/lib/payments/checkout";
import { signatureIsValid } from "@/lib/payments/paystack";

export const runtime = "nodejs";

/** Paystack calls this when a charge succeeds, even if the learner closes the tab. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!signatureIsValid(raw, request.headers.get("x-paystack-signature"))) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const result = await fulfilPayment(event.data.reference);
    if (!result.ok && result.pending) {
      // Ask Paystack to retry later.
      return Response.json({ received: false }, { status: 503 });
    }
  }
  return Response.json({ received: true });
}
