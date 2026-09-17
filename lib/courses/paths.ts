export function lessonPlayerHref(courseSlug: string, lessonSlug: string) {
  return `/learn/${courseSlug}/lessons/${lessonSlug}`;
}

export function lessonPageHref(courseSlug: string, lessonSlug: string, page: number) {
  return `${lessonPlayerHref(courseSlug, lessonSlug)}?page=${page}`;
}

export function moduleQuizHref(courseSlug: string, moduleSlug: string) {
  return `/learn/${courseSlug}/quiz?module=${encodeURIComponent(moduleSlug)}`;
}

export function isPlayIntroLesson(_courseSlug: string, _lessonSlug: string) {
  return false;
}
