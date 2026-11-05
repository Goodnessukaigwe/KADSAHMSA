const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(kobo: number) {
  return naira.format(kobo / 100);
}

/** Short line shown in the courses section and on cards. */
export const ADMIN_CHARGES = "Administrative costs apply";

/** Longer note on the course page. The amount itself is shown only at checkout. */
export const ADMIN_FEE_DETAIL =
  "They cover administrative costs only and are not a charge for the programme itself.";

export const ADMIN_FEE_NOTE = `${ADMIN_CHARGES}. ${ADMIN_FEE_DETAIL}`;

/** Courses are presented under Free courses; the administrative charge is noted beside them. */
export function feeBadge() {
  return "Free";
}

export function priceLabel() {
  return "Free";
}
