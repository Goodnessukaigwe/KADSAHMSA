export function lessonPlayerHref(courseSlug: string, lessonSlug: string) {
  if (courseSlug === "dptc" && lessonSlug === "introduction") {
    return `/learn/${courseSlug}/play`;
  }
  return `/learn/${courseSlug}/lessons/${lessonSlug}`;
}
