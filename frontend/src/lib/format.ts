/**
 * Date, range and currency helpers for the travel screens.
 *
 * Dates from the API come back as `YYYY-MM-DD` strings. They are parsed as
 * local dates (not UTC) so a trip never shifts a day for users in IST.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3))

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return startOfDay(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : startOfDay(parsed)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay())
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

/**
 * The weeks of days (Sunday first) that cover `cursor`'s month. Months that
 * start on a Sunday and have 28 days get exactly four rows, so the grid never
 * shows a full extra week that belongs to the next month.
 */
export function monthWeeks(cursor: Date): Date[][] {
  const first = startOfMonth(cursor)
  const gridStart = startOfWeek(first)
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate()
  const rowCount = Math.ceil((diffDays(gridStart, first) + daysInMonth) / 7)
  return Array.from({ length: rowCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(gridStart, week * 7 + day)),
  )
}

/** The seven days of the week that contains `cursor`. */
export function weekDays(cursor: Date): Date[] {
  const start = startOfWeek(cursor)
  return Array.from({ length: 7 }, (_, day) => addDays(start, day))
}

export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateLong(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`.toUpperCase()
}

export function formatWeekRange(days: Date[]): string {
  const start = days[0]
  const end = days[days.length - 1]
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${end.getFullYear()}`
  }
  return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`
}

export function formatDayPadded(date: Date): string {
  return String(date.getDate()).padStart(2, '0')
}

export function formatMonthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()].toUpperCase()
}

export function formatWeekdayShort(date: Date): string {
  return WEEKDAYS[date.getDay()].slice(0, 3).toUpperCase()
}

export function formatDate(value?: string | Date | null): string {
  const date = parseDate(value)
  if (!date) return '—'
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function formatRange(
  startValue?: string | Date | null,
  endValue?: string | Date | null,
): string {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  if (!start) return '—'
  if (!end || isSameDay(start, end)) return formatDate(start)

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`
  }
  return `${formatDate(start)} – ${formatDate(end)}`
}

export function formatLongRange(
  startValue?: string | Date | null,
  endValue?: string | Date | null,
): string {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  if (!start) return '—'
  if (!end || isSameDay(start, end)) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`
  }

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
  }
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** Number of days a trip covers, including both departure and return day. */
export function tripDays(startValue?: string | null, endValue?: string | null): number {
  const start = parseDate(startValue)
  if (!start) return 0
  const end = parseDate(endValue) || start
  return Math.max(1, diffDays(start, end) + 1)
}

export function tripNights(startValue?: string | null, endValue?: string | null): number {
  return Math.max(0, tripDays(startValue, endValue) - 1)
}

export function formatDuration(startValue?: string | null, endValue?: string | null): string {
  if (!startValue) return '—'
  const days = tripDays(startValue, endValue)
  const nights = days - 1
  if (nights <= 0) return `${days} day`
  return `${days} days · ${nights} ${nights === 1 ? 'night' : 'nights'}`
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value?: number | string | null): string {
  const amount = Number(value || 0)
  if (!amount) return '—'
  return currencyFormatter.format(amount)
}

export function firstName(name?: string | null): string {
  if (!name) return 'there'
  const clean = name.trim()
  if (!clean) return 'there'
  // Employee names are stored in upper case; show them in title case.
  const first = clean.split(/\s+/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export function toTitleCase(name?: string | null): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function today(): Date {
  return startOfDay(new Date())
}

export interface RangeEvent {
  start: string
  end?: string | null
}

export interface PlacedEvent<T> {
  event: T
  startIndex: number
  endIndex: number
  lane: number
}

export interface WeekLayout<T> {
  items: PlacedEvent<T>[]
  laneCount: number
}

/**
 * Places multi-day events on a week row: events that overlap the week are
 * clamped to its first and last day and stacked into the first free lane so
 * bars never overlap.
 */
export function layoutWeekEvents<T extends RangeEvent>(
  days: Date[],
  events: T[],
): WeekLayout<T> {
  if (!days.length) return { items: [], laneCount: 0 }
  const weekStart = days[0]
  const weekEnd = days[days.length - 1]

  const prepared = events
    .map((event) => {
      const start = parseDate(event.start)
      const end = parseDate(event.end) || start
      return { event, start, end }
    })
    .filter(
      (item): item is { event: T; start: Date; end: Date } =>
        !!item.start && !!item.end && item.end >= weekStart && item.start <= weekEnd,
    )
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        b.end.getTime() - a.end.getTime(),
    )

  const lanes: Array<Array<{ start: number; end: number }>> = []
  const items: PlacedEvent<T>[] = []

  for (const item of prepared) {
    const startIndex = Math.min(
      days.length - 1,
      Math.max(0, diffDays(weekStart, item.start)),
    )
    const endIndex = Math.min(
      days.length - 1,
      Math.max(0, diffDays(weekStart, item.end)),
    )

    let lane = 0
    while (
      lanes[lane] &&
      lanes[lane].some(
        (slot) => !(endIndex < slot.start || startIndex > slot.end),
      )
    ) {
      lane += 1
    }

    if (!lanes[lane]) lanes[lane] = []
    lanes[lane].push({ start: startIndex, end: endIndex })
    items.push({ event: item.event, startIndex, endIndex, lane })
  }

  return { items, laneCount: lanes.length }
}
