const dayMonthYearFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const formatDate = (value?: string | number | Date | null): string => {
  if (value === null || value === undefined || value === '') return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return dayMonthYearFormatter.format(date);
};

export const formatMinutes = (mins: number | null): string => {
  if (mins === null) return '—';
  if (mins < 60) return `${Math.round(mins)}m`;
  if (mins < 60 * 24) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / (60 * 24)).toFixed(1)}d`;
};
