const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(kobo: number) {
  return naira.format(kobo / 100);
}

/** "₦10,000" for a priced course, "Free" when no price is set. */
export function priceLabel(kobo: number) {
  return kobo > 0 ? formatNaira(kobo) : "Free";
}
