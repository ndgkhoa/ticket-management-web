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

/**
 * Coarse human duration from a minute count: minutes under an hour, hours under a day, else
 * days — one significant decimal. Null (no data) renders as "—". Used by the dashboard's KPI
 * and agent metrics.
 */
export const formatMinutes = (mins: number | null): string => {
  if (mins === null) return '—';
  if (mins < 60) return `${Math.round(mins)}m`;
  if (mins < 60 * 24) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / (60 * 24)).toFixed(1)}d`;
};
