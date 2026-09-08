export type CataloguePrice = "free" | "paid";

export type CatalogueCourse = {
  slug: string;
  title: string;
  lessons: number;
  priceType: CataloguePrice;
  image: string;
};

export const catalogueHero = {
  title: "Insights that move your learning forward",
  subtitle:
    "Explore expert-led courses on drug prevention, treatment, care, and professional skill development.",
} as const;

export const emptyCatalogueCopy = "No published courses yet.";

export function isStockLandingCover(path: string) {
  return path.trim().startsWith("/landing/");
}

export function courseInitials(title: string) {
  const parts = title
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function coverForSlug(_slug: string, coverPath?: string | null) {
  const trimmed = coverPath?.trim() ?? "";
  if (!trimmed || isStockLandingCover(trimmed)) return "";
  return trimmed;
}
