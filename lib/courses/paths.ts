export function lessonPlayerHref(courseSlug: string, lessonSlug: string) {
  if (courseSlug === "dptc" && lessonSlug === "introduction") {
    return `/learn/${courseSlug}/play`;
  }
  return `/learn/${courseSlug}/lessons/${lessonSlug}`;
}

export function lessonPageHref(courseSlug: string, lessonSlug: string, page: number) {
  return `${lessonPlayerHref(courseSlug, lessonSlug)}?page=${page}`;
}

export function isPlayIntroLesson(courseSlug: string, lessonSlug: string) {
  return lessonPlayerHref(courseSlug, lessonSlug).endsWith("/play");
}
