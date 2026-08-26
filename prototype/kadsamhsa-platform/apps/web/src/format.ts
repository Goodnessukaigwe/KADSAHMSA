/** Estimated course length, rounded to whole hours once past 90 minutes. */
export function formatDuration(minutes: number): string {
  if (minutes < 90) {
    return `${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
