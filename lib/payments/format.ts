const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(kobo: number) {
  return naira.format(kobo / 100);
}

/** Short line shown in the courses section and on cards. */
export const ADMIN_CHARGES = "Administrative charges apply";

/** Longer note on the course page. The amount itself is shown only at checkout. */
export const ADMIN_FEE_NOTE =
  "Administrative charges apply. They cover administrative costs only and are not a charge for the programme itself.";

/** Courses are presented under Free courses; the administrative charge is noted beside them. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function feeBadge(_kobo: number) {
  return "Free";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function priceLabel(_kobo: number) {
  return "Free";
}
