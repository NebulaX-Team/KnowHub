const DEFAULT_SITE_TIMEZONE = 'UTC+8'
const UTC_OFFSET_REGEX = /^UTC\s*([+-])\s*(\d{1,2})(?::?\s*(\d{2}))?$/i

export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = value < 1e12 ? value * 1000 : value
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return null

    if (/^\d+$/.test(raw)) {
      return parseDateValue(Number(raw))
    }

    const normalizedBase = /^\d{4}-\d{2}-\d{2}\s/.test(raw) ? raw.replace(' ', 'T') : raw
    let normalized = normalizedBase

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      normalized = `${normalized}T00:00:00Z`
    } else {
      normalized = normalized.replace(/\.(\d{3})\d+([zZ]|[+-]\d{2}(?::?\d{2})?)$/, '.$1$2')
      const hasTimezone = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(normalized)
      if (!hasTimezone) {
        normalized = `${normalized}Z`
      }
    }

    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

export function normalizeUtcOffset(value: string | undefined | null): string {
  if (!value) return DEFAULT_SITE_TIMEZONE

  const raw = value.trim()
  if (!raw) return DEFAULT_SITE_TIMEZONE

  const match = raw.match(UTC_OFFSET_REGEX)
  if (!match) return DEFAULT_SITE_TIMEZONE

  const sign = match[1] as '+' | '-'
  const hours = Number(match[2])
  const minutes = match[3] ? Number(match[3]) : 0

  if (
    !Number.isInteger(hours)
    || !Number.isInteger(minutes)
    || hours < 0
    || hours > 14
    || minutes < 0
    || minutes > 59
    || (hours === 14 && minutes !== 0)
  ) {
    return DEFAULT_SITE_TIMEZONE
  }

  if (minutes === 0) {
    return `UTC${sign}${hours}`
  }

  return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

export function isValidUtcOffset(value: string | undefined | null): boolean {
  if (!value) return false
  const raw = value.trim()
  if (!raw) return false

  const match = raw.match(UTC_OFFSET_REGEX)
  if (!match) return false

  const hours = Number(match[2])
  const minutes = match[3] ? Number(match[3]) : 0

  return (
    Number.isInteger(hours)
    && Number.isInteger(minutes)
    && hours >= 0
    && hours <= 14
    && minutes >= 0
    && minutes <= 59
    && !(hours === 14 && minutes !== 0)
  )
}

export function parseUtcOffsetToMinutes(value: string | undefined | null): number {
  const normalized = normalizeUtcOffset(value)
  const match = normalized.match(UTC_OFFSET_REGEX)
  if (!match) return 8 * 60

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2])
  const minutes = match[3] ? Number(match[3]) : 0
  return sign * (hours * 60 + minutes)
}

function shiftToConfiguredOffset(date: Date, timezone: string | undefined | null): Date {
  const offsetMinutes = parseUtcOffsetToMinutes(timezone)
  return new Date(date.getTime() + offsetMinutes * 60 * 1000)
}

export function formatDateTimeByOffset(
  value: unknown,
  timezone: string | undefined | null,
  locale?: string,
): string {
  const date = parseDateValue(value)
  if (!date) return '-'

  const shifted = shiftToConfiguredOffset(date, timezone)
  return new Intl.DateTimeFormat(locale || undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(shifted)
}

export function formatDateByOffset(
  value: unknown,
  timezone: string | undefined | null,
  locale?: string,
): string {
  const date = parseDateValue(value)
  if (!date) return '-'

  const shifted = shiftToConfiguredOffset(date, timezone)
  return new Intl.DateTimeFormat(locale || undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted)
}

export function formatWithOptionsByOffset(
  value: unknown,
  timezone: string | undefined | null,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = parseDateValue(value)
  if (!date) return '-'

  const shifted = shiftToConfiguredOffset(date, timezone)
  return new Intl.DateTimeFormat(locale || undefined, {
    timeZone: 'UTC',
    ...options,
  }).format(shifted)
}
