const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(kobo: number) {
  return naira.format(kobo / 100);
}

/** Shown wherever the fee appears, so nobody reads it as the cost of the programme. */
export const ADMIN_FEE_NOTE =
  "This is an administrative fee. It covers administrative costs only. It is not a charge for the programme itself.";

/** "₦10,000 admin fee" for a priced course, "Free" when no fee is set. */
export function feeBadge(kobo: number) {
  return kobo > 0 ? `${formatNaira(kobo)} admin fee` : "Free";
}

/** "₦10,000" for a priced course, "Free" when no price is set. */
export function priceLabel(kobo: number) {
  return kobo > 0 ? formatNaira(kobo) : "Free";
}
