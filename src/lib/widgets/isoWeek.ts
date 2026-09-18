const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * ISO-8601 week number. The ISO week belongs to the year of its Thursday, so
 * January 1st can land in week 52 or 53 of the *previous* year. Implemented
 * by hand, no date library.
 */
export function getIsoWeek(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // Monday=0 ... Sunday=6, then shift to that week's Thursday.
  const dayNum = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - dayNum + 3);

  const yearOfThursday = utcDate.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(yearOfThursday, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  return Math.round((utcDate.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY)) + 1;
}
