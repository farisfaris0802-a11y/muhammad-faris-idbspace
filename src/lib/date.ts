/** Helper tanggal & waktu. Semua tanggal disimpan sebagai `YYYY-MM-DD` (zona waktu lokal). */

export const DAY_START = '07:00'
export const WEEKDAY_CLOSE = '21:00'
export const SATURDAY_OPEN = '08:00'
export const SATURDAY_CLOSE = '14:00'

const pad = (value: number) => String(value).padStart(2, '0')

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function addDaysISO(iso: string, amount: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(iso))
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseISODate(iso))
}

/** "Hari ini", "Besok", atau tanggal pendek. */
export function relativeDayLabel(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Hari ini'
  if (iso === addDaysISO(today, 1)) return 'Besok'
  if (iso === addDaysISO(today, -1)) return 'Kemarin'
  return formatDateShort(iso)
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** Format gaya Indonesia: 13.00 – 15.00 */
export function formatTime(time: string): string {
  return time.replace(':', '.')
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function durationInMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}

export interface OperatingHours {
  open: string
  close: string
  isClosed: boolean
}

/** Minggu tutup; Sabtu tutup lebih awal mengikuti jam operasional kampus. */
export function getOperatingHours(iso: string): OperatingHours {
  const day = parseISODate(iso).getDay()
  if (day === 0) return { open: '00:00', close: '00:00', isClosed: true }
  if (day === 6) return { open: SATURDAY_OPEN, close: SATURDAY_CLOSE, isClosed: false }
  return { open: DAY_START, close: WEEKDAY_CLOSE, isClosed: false }
}

/** Membagi jam operasional menjadi slot per jam. */
export function buildHourlySlots(hours: OperatingHours): { start: string; end: string }[] {
  if (hours.isClosed) return []
  const slots: { start: string; end: string }[] = []
  const close = timeToMinutes(hours.close)
  for (let cursor = timeToMinutes(hours.open); cursor < close; cursor += 60) {
    slots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(Math.min(cursor + 60, close)),
    })
  }
  return slots
}

/** Apakah tanggal + jam sudah lewat dari sekarang? Dipakai untuk BR-03. */
export function isPastDateTime(iso: string, time: string, now = new Date()): boolean {
  const date = parseISODate(iso)
  const [hours, minutes] = time.split(':').map(Number)
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return date.getTime() <= now.getTime()
}

export function isDateInPast(iso: string, now = new Date()): boolean {
  return iso < toISODate(now)
}
