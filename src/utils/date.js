export const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T/;
const hasTimeZoneInfo = /([zZ]|[+-]\d{2}:?\d{2})$/;

export const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  if (isoDatePattern.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }

  if (isoDateTimePattern.test(trimmed)) {
    const normalized = hasTimeZoneInfo.test(trimmed)
      ? trimmed
      : `${trimmed.replace(/\s+/g, 'T')}Z`;

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const ddMmYyyyMatch = trimmed.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
  if (ddMmYyyyMatch) {
    const [, dayStr, monthStr, yearStr] = ddMmYyyyMatch;
    const day = Number.parseInt(dayStr, 10);
    const month = Number.parseInt(monthStr, 10);
    let year = Number.parseInt(yearStr, 10);

    if (Number.isNaN(day) || Number.isNaN(month) || day <= 0 || month <= 0 || month > 12) {
      return null;
    }

    if (yearStr.length === 2) {
      year += year >= 70 ? 1900 : 2000;
    }

    if (year < 1900 || year > 9999) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateTime = (value, options = {}) => {
  const date = parseDateValue(value);
  if (!date) {
    return '—';
  }

  const formatter = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
    ...options,
  });

  return formatter.format(date);
};

export const formatDateOnly = (value, options = {}) => {
  const date = parseDateValue(value);
  if (!date) {
    return '—';
  }

  const formatter = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    ...options,
  });

  return formatter.format(date);
};

export const normalizeDateFilterValue = (rawValue) => {
  if (!rawValue) {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  if (isoDatePattern.test(trimmed)) {
    return trimmed;
  }

  const parsed = parseDateValue(trimmed);
  if (!parsed) {
    return trimmed;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
