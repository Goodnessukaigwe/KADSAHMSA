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

/** "First 100 learners free · 37 places left", or null when it does not apply. */
export function freePlacesNote(priceKobo: number, freeSeatsLeft: number | null) {
  if (priceKobo <= 0 || freeSeatsLeft === null || freeSeatsLeft <= 0) return null;
  return `${freeSeatsLeft} free ${freeSeatsLeft === 1 ? "place" : "places"} left`;
}
