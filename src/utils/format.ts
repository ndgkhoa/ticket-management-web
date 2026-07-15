/**
 * `Intl.DateTimeFormat` instances are expensive to construct, so build once at
 * module scope and reuse. `en-GB` is the locale whose short date form is
 * DD/MM/YYYY — it is chosen for that shape, not for the language.
 */
const dayMonthYearFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Formats a date value as DD/MM/YYYY.
 *
 * Deliberately built on `Intl` instead of a date library: the app only renders
 * dates, so a dependency would earn nothing. Unparseable or missing values render
 * as an empty cell rather than "Invalid Date".
 */
export const formatDate = (value?: string | number | Date | null): string => {
  if (value === null || value === undefined || value === '') return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return dayMonthYearFormatter.format(date);
};
