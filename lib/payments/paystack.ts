import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const API = "https://api.paystack.co";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("Paystack is not configured (PAYSTACK_SECRET_KEY).");
  return key;
}

/**
 * References start with a project tag so every KADSAMHSA LMS payment can be found on the shared
 * Paystack account: search "KADLMS" under Transactions. Override with PAYSTACK_REFERENCE_PREFIX.
 */
export function referencePrefix() {
  const raw = process.env.PAYSTACK_REFERENCE_PREFIX?.trim() || "KADLMS";
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "KADLMS";
}

export function newPaymentReference() {
  return `${referencePrefix()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Shown on the transaction page in the Paystack dashboard. */
export type CustomField = { display_name: string; variable_name: string; value: string };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: T }
    | null;
  if (!response.ok || !body?.status || body.data === undefined) {
    throw new Error(body?.message || `Paystack request failed (${response.status}).`);
  }
  return body.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  customFields?: CustomField[];
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { project: "KADSAMHSA LMS", custom_fields: input.customFields ?? [] },
      }),
    }
  );
}

export type VerifiedTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel?: string | null;
  fees?: number | null;
};

export async function verifyTransaction(reference: string) {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs the raw webhook body with HMAC SHA512 using the account secret key. */
export function signatureIsValid(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const key = process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Cheap authenticated call used by the admin setup check to prove the secret key works. */
export async function pingPaystack() {
  try {
    await call<unknown>("/transaction/totals?perPage=1");
    return { ok: true as const };
  } catch (cause) {
    return { ok: false as const, error: cause instanceof Error ? cause.message : "Could not reach Paystack." };
  }
}

export function keyMode(): "test" | "live" | "unknown" | "missing" {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unknown";
}
