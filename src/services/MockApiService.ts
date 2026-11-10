import type {
  AvailabilitySlot,
  Building,
  CreateReservationInput,
  Reservation,
  ReservationFeedback,
  ReservationStatus,
  Room,
  RoomAvailability,
  SaveFeedbackInput,
} from '../types'
import { ApiError } from '../types'
import { buildings, findRoom, rooms } from '../data/campus'
import { createSeedFeedback, createSeedReservations } from '../data/seed'
import {
  addDaysISO,
  buildHourlySlots,
  getOperatingHours,
  isDateInPast,
  isPastDateTime,
  parseISODate,
  timeToMinutes,
  todayISO,
} from '../lib/date'

/**
 * MockApiService
 * ─────────────────────────────────────────────────────────────────────────
 * Mensimulasikan backend di sisi browser.
 *  • Semua method async memakai `setTimeout` untuk meniru latency jaringan.
 *  • Reservasi disimpan di localStorage agar bertahan saat halaman di-refresh.
 *  • `SLOT_TAKEN` disimulasikan secara acak (lihat .env.example) DAN bisa
 *    dipicu manual lewat `simulateSlotTakenOnce()` untuk keperluan demo/QA.
 *
 * Ketika backend asli siap, cukup ganti isi method dengan `fetch()` —
 * bentuk data dan error sudah mengikuti kontrak types/index.ts.
 */

/* v2: seed dibuat ulang dengan identitas demo baru (NIM 246120940052). */
const STORAGE_KEY = 'idb-space.reservations.v2'
/** Overlay Status Kontrol Ruangan (panel admin): roomId → true (maintenance). */
const MAINTENANCE_KEY = 'idb-space.room-maintenance.v1'
/** Ulasan & laporan kendala pasca-pemakaian — satu entri per reservasi. */
const FEEDBACK_KEY = 'idb-space.feedback.v1'

const env = import.meta.env
const LATENCY_MIN = Number(env.VITE_MOCK_LATENCY_MIN ?? 650)
const LATENCY_MAX = Number(env.VITE_MOCK_LATENCY_MAX ?? 1400)
const SLOT_TAKEN_RATE = Number(env.VITE_MOCK_SLOT_TAKEN_RATE ?? 0.15)

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

/** Data lama memakai 'confirmed' — dipetikan ke status baru saat dimuat. */
function normalizeStatus(value: string): ReservationStatus {
  if (value === 'confirmed') return 'approved'
  if (
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'completed' ||
    value === 'cancelled'
  ) {
    return value
  }
  return 'approved'
}

const wait = (ms = randomBetween(LATENCY_MIN, LATENCY_MAX)) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Dua rentang waktu bertabrakan? Perbandingan string HH:mm aman. */
const rangesOverlap = (startA: string, endA: string, startB: string, endB: string) =>
  startA < endB && startB < endA

interface PhantomBooking {
  roomId: string
  date: string
  startTime: string
  endTime: string
}

class MockApiService {
  private reservations: Reservation[] = []
  private phantomBookings: PhantomBooking[] = []
  /** Status Kontrol Ruangan — map roomId → true (ditutup maintenance), persist. */
  private maintenance: Record<string, boolean> = {}
  /** Ulasan pasca-pemakaian (localStorage), urut terbaru di depan. */
  private feedback: ReservationFeedback[] = []

  constructor() {
    this.reservations = this.loadReservations()
    this.maintenance = this.loadMaintenance()
    this.feedback = this.loadFeedback()
    if (!env.VITE_API_KEY) {
      console.info(
        '[IDB Space] VITE_API_KEY belum diisi — mock API tetap berjalan dalam mode simulasi.',
      )
    }
  }

  // ── Status Kontrol Ruangan (maintenance) ──────────────────────────────────

  private loadMaintenance(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(MAINTENANCE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const map: Record<string, boolean> = {}
        for (const [id, value] of Object.entries(parsed)) {
          if (typeof value === 'boolean') map[id] = value
        }
        return map
      }
    } catch {
      // abaikan — mulai dari peta kosong
    }
    return {}
  }

  private persistMaintenance(): void {
    try {
      localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(this.maintenance))
    } catch {
      console.warn('[IDB Space] Gagal menyimpan status maintenance ruangan.')
    }
  }

  /** Peta status per ruangan: true = ditutup untuk maintenance. */
  async getRoomMaintenance(): Promise<Record<string, boolean>> {
    await wait(200)
    return { ...this.maintenance }
  }

  /**
   * Tutup/buka ruangan (aksi panel admin). Ruangan yang ditutup otomatis
   * terkunci: `createReservation` menolak pengajuan untuk ruangan tersebut.
   */
  async setRoomMaintenance(roomId: string, underMaintenance: boolean): Promise<Room> {
    await wait(260)
    const room = findRoom(roomId)
    if (!room) throw new ApiError('ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.')

    if (underMaintenance) {
      this.maintenance = { ...this.maintenance, [roomId]: true }
    } else {
      const next = { ...this.maintenance }
      delete next[roomId]
      this.maintenance = next
    }
    this.persistMaintenance()
    return { ...room, underMaintenance }
  }

  // ── Data master ──────────────────────────────────────────────────────────

  async getBuildings(): Promise<Building[]> {
    await wait(240)
    return buildings
  }

  async getRooms(filters?: {
    buildingId?: Building['id']
    category?: Room['category']
    minCapacity?: number
    search?: string
  }): Promise<Room[]> {
    await wait(320)
    let result = [...rooms]
    // Gabungkan overlay maintenance agar semua konsumen langsung melihatnya.
    if (Object.keys(this.maintenance).length > 0) {
      result = result.map((room) =>
        this.maintenance[room.id] ? { ...room, underMaintenance: true } : room,
      )
    }
    if (filters?.buildingId) {
      result = result.filter((room) => room.buildingId === filters.buildingId)
    }
    if (filters?.category) {
      result = result.filter((room) => room.category === filters.category)
    }
    if (filters?.minCapacity) {
      result = result.filter((room) => room.capacity >= filters.minCapacity!)
    }
    if (filters?.search?.trim()) {
      const query = filters.search.toLowerCase()
      result = result.filter(
        (room) =>
          room.name.toLowerCase().includes(query) ||
          room.code.toLowerCase().includes(query) ||
          room.facilities.some((facility) => facility.toLowerCase().includes(query)),
      )
    }
    return result
  }

  async getRoom(roomId: string): Promise<Room> {
    await wait(220)
    const room = findRoom(roomId)
    if (!room) throw new ApiError('ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.')
    return room
  }

  // ── Ketersediaan ─────────────────────────────────────────────────────────

  async getAvailability(roomId: string, date: string = todayISO()): Promise<RoomAvailability> {
    await wait(260)
    const room = findRoom(roomId)
    if (!room) throw new ApiError('ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.')
    return this.computeAvailability(room, date)
  }

  /** Versi batch untuk beranda / hasil pencarian. */
  async getAvailabilities(date: string = todayISO()): Promise<RoomAvailability[]> {
    await wait(420)
    return rooms.map((room) => this.computeAvailability(room, date))
  }

  private computeAvailability(room: Room, date: string): RoomAvailability {
    const hours = getOperatingHours(date)
    const hourly = buildHourlySlots(hours)
    const confirmed = this.reservations.filter(
      (reservation) =>
        reservation.roomId === room.id &&
        reservation.date === date &&
        reservation.status === 'approved', // hanya pengajuan yang sudah disetujui yang mengunci slot
    )

    const slots: AvailabilitySlot[] = hourly.map((slot) => {
      const isBooked = confirmed.some((reservation) =>
        rangesOverlap(slot.start, slot.end, reservation.startTime, reservation.endTime),
      )
      if (isBooked) return { ...slot, status: 'booked' }
      if (isPastDateTime(date, slot.start)) return { ...slot, status: 'past' }
      return { ...slot, status: 'available' }
    })

    return {
      roomId: room.id,
      date,
      slots,
      openingTime: hours.open,
      closingTime: hours.close,
      isClosed: hours.isClosed,
    }
  }

  // ── Reservasi ────────────────────────────────────────────────────────────

  async getReservations(requesterNim?: string): Promise<Reservation[]> {
    await wait(360)
    const list = requesterNim
      ? this.reservations.filter((reservation) => reservation.requesterNim === requesterNim)
      : [...this.reservations]
    return list.sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    )
  }

  async getReservation(id: string): Promise<Reservation> {
    await wait(240)
    const found = this.reservations.find((reservation) => reservation.id === id)
    if (!found) throw new ApiError('RESERVATION_NOT_FOUND', 'Reservasi tidak ditemukan.')
    return found
  }

  async createReservation(input: CreateReservationInput): Promise<Reservation> {
    await wait()

    const room = findRoom(input.roomId)
    if (!room) throw new ApiError('ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.')

    // Status Kontrol Ruangan — admin menutup ruangan? pengajuan langsung ditolak.
    if (this.maintenance[input.roomId]) {
      throw new ApiError(
        'ROOM_UNDER_MAINTENANCE',
        `${room.name} sedang ditutup untuk maintenance. Silakan pilih ruangan lain.`,
      )
    }

    // BR-01 — validasi utama tetap di service, bukan hanya di UI.
    if (timeToMinutes(input.startTime) >= timeToMinutes(input.endTime)) {
      throw new ApiError(
        'INVALID_TIME_RANGE',
        'Waktu selesai harus lebih lambat daripada waktu mulai.',
      )
    }

    if (isDateInPast(input.date)) {
      throw new ApiError('PAST_DATE', 'Tanggal yang dipilih sudah lewat.')
    }

    const hours = getOperatingHours(input.date)
    if (hours.isClosed) {
      throw new ApiError(
        'OUTSIDE_OPERATING_HOURS',
        'Kampus tutup pada hari tersebut. Silakan pilih hari lain.',
      )
    }
    if (
      timeToMinutes(input.startTime) < timeToMinutes(hours.open) ||
      timeToMinutes(input.endTime) > timeToMinutes(hours.close)
    ) {
      throw new ApiError(
        'OUTSIDE_OPERATING_HOURS',
        `Jam peminjaman di luar jam operasional (${hours.open}–${hours.close}).`,
      )
    }

    if (isPastDateTime(input.date, input.startTime)) {
      throw new ApiError('PAST_DATE', 'Waktu mulai yang dipilih sudah lewat.')
    }

    if (input.attendeeCount > room.capacity) {
      throw new ApiError(
        'CAPACITY_EXCEEDED',
        `Kapasitas ${room.name} maksimal ${room.capacity} orang.`,
      )
    }

    // Simulasi: slot bisa "direbut" pengguna lain tepat sebelum submit.
    const conflicting = this.reservations.find(
      (reservation) =>
        reservation.roomId === input.roomId &&
        reservation.date === input.date &&
        reservation.status === 'approved' &&
        rangesOverlap(
          input.startTime,
          input.endTime,
          reservation.startTime,
          reservation.endTime,
        ),
    )
    const phantomConflict = this.phantomBookings.find(
      (booking) =>
        booking.roomId === input.roomId &&
        booking.date === input.date &&
        rangesOverlap(input.startTime, input.endTime, booking.startTime, booking.endTime),
    )
    const randomRace = Math.random() < SLOT_TAKEN_RATE

    if (conflicting || phantomConflict || randomRace) {
      throw new ApiError(
        'SLOT_TAKEN',
        'Maaf, ruangan baru saja dipesan orang lain untuk slot ini. Silakan pilih slot lain.',
        {
          roomId: input.roomId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          suggestedAlternative: this.suggestAlternative(input),
        },
      )
    }

    const reservation: Reservation = {
      id: `rsv-${Date.now()}-${randomBetween(100, 999)}`,
      code: this.createCode(room, input.date),
      roomId: room.id,
      roomName: room.name,
      roomCode: room.code,
      buildingId: room.buildingId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose.trim(),
      attendeeCount: input.attendeeCount,
      requesterName: input.requesterName.trim(),
      requesterNim: input.requesterNim.trim(),
      requesterPhone: input.requesterPhone.trim(),
      // Pengajuan baru masuk antrean persetujuan Kemahasiswaan (Tugas 3).
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    this.reservations = [...this.reservations, reservation]
    this.persist()
    return reservation
  }

  async cancelReservation(id: string): Promise<Reservation> {
    await wait(randomBetween(500, 1000))
    const index = this.reservations.findIndex((reservation) => reservation.id === id)
    if (index === -1) {
      throw new ApiError('RESERVATION_NOT_FOUND', 'Reservasi tidak ditemukan.')
    }

    const reservation = this.reservations[index]
    if (reservation.status === 'cancelled') {
      throw new ApiError('CANCEL_NOT_ALLOWED', 'Reservasi ini sudah dibatalkan.')
    }
    if (reservation.status === 'rejected') {
      throw new ApiError(
        'CANCEL_NOT_ALLOWED',
        'Pengajuan ini sudah ditolak, tidak dapat dibatalkan.',
      )
    }
    if (reservation.status === 'completed') {
      throw new ApiError(
        'CANCEL_NOT_ALLOWED',
        'Pemakaian sudah selesai — gunakan Lapor Kendala bila ada masalah.',
      )
    }

    // BR-03 — pembatalan hanya boleh sebelum waktu mulai.
    if (isPastDateTime(reservation.date, reservation.startTime)) {
      throw new ApiError(
        'CANCEL_NOT_ALLOWED',
        'Waktu pemakaian sudah dimulai, reservasi tidak dapat dibatalkan.',
      )
    }

    const updated: Reservation = {
      ...reservation,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    }
    this.reservations = this.reservations.map((item, itemIndex) =>
      itemIndex === index ? updated : item,
    )
    this.persist()
    return updated
  }

  // ── Persetujuan & laporan kendala (Tugas 3) ───────────────────────────────

  /**
   * Simulasi persetujuan oleh staf kemahasiswaan — dipakai untuk demo lewat
   * console: `mockApi.approveReservation('rsv-seed-1005')`.
   */
  async approveReservation(id: string): Promise<Reservation> {
    await wait(randomBetween(300, 700))
    const index = this.reservations.findIndex((reservation) => reservation.id === id)
    if (index === -1) {
      throw new ApiError('RESERVATION_NOT_FOUND', 'Reservasi tidak ditemukan.')
    }

    const reservation = this.reservations[index]
    if (reservation.status !== 'pending') {
      throw new ApiError(
        'CANCEL_NOT_ALLOWED',
        'Reservasi tidak sedang menunggu persetujuan.',
      )
    }

    const updated: Reservation = { ...reservation, status: 'approved' }
    this.reservations = this.reservations.map((item, itemIndex) =>
      itemIndex === index ? updated : item,
    )
    this.persist()
    return updated
  }

  /** Simulasi penolakan oleh staf kemahasiswaan (mis. "Jadwal Penuh"). */
  async rejectReservation(id: string, reason = 'Jadwal Penuh'): Promise<Reservation> {
    await wait(randomBetween(300, 700))
    const index = this.reservations.findIndex((reservation) => reservation.id === id)
    if (index === -1) {
      throw new ApiError('RESERVATION_NOT_FOUND', 'Reservasi tidak ditemukan.')
    }

    const reservation = this.reservations[index]
    if (reservation.status !== 'pending') {
      throw new ApiError(
        'CANCEL_NOT_ALLOWED',
        'Reservasi tidak sedang menunggu persetujuan.',
      )
    }

    const updated: Reservation = {
      ...reservation,
      status: 'rejected',
      rejectionReason: reason.trim() || 'Jadwal Penuh',
    }
    this.reservations = this.reservations.map((item, itemIndex) =>
      itemIndex === index ? updated : item,
    )
    this.persist()
    return updated
  }

  /**
   * Lapor kendala fasilitas untuk pemakaian yang sudah selesai
   * (dipicu tombol "Lapor Kendala" pada halaman Reservasi Saya).
   */
  async reportFacilityIssue(
    id: string,
    options: string[],
    note = '',
  ): Promise<Reservation> {
    await wait(randomBetween(450, 900))
    const index = this.reservations.findIndex((reservation) => reservation.id === id)
    if (index === -1) {
      throw new ApiError('RESERVATION_NOT_FOUND', 'Reservasi tidak ditemukan.')
    }

    const reservation = this.reservations[index]
    if (reservation.status !== 'completed') {
      throw new ApiError(
        'REPORT_NOT_ALLOWED',
        'Laporan kendala hanya bisa dikirim untuk pemakaian yang sudah selesai.',
      )
    }

    const updated: Reservation = {
      ...reservation,
      issueReport: {
        options: options.filter((option) => option.trim().length > 0),
        note: note.trim(),
        reportedAt: new Date().toISOString(),
      },
    }
    this.reservations = this.reservations.map((item, itemIndex) =>
      itemIndex === index ? updated : item,
    )
    this.persist()
    return updated
  }

  // ── Ulasan & Laporan Kendala (pasca-pemakaian) ────────────────────────────

  /** Daftar ulasan untuk dashboard admin (terbaru lebih dulu). */
  async getFeedback(): Promise<ReservationFeedback[]> {
    await wait(280)
    return [...this.feedback].sort((a, b) =>
      (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
    )
  }

  /**
   * Simpan/ubah ulasan untuk reservasi berstatus selesai.
   * Satu reservasi hanya menyimpan satu ulasan (upsert berdasarkan reservationId).
   */
  async saveFeedback(input: SaveFeedbackInput): Promise<ReservationFeedback> {
    await wait(randomBetween(450, 900))
    const reservation = this.reservations.find((item) => item.id === input.reservationId)
    if (!reservation) {
      throw new ApiError('RESERVATION_NOT_FOUND', 'Reservasi tidak ditemukan.')
    }
    if (reservation.status !== 'completed') {
      throw new ApiError(
        'FEEDBACK_NOT_ALLOWED',
        'Ulasan hanya bisa dikirim untuk pemakaian yang sudah selesai.',
      )
    }

    const message = input.message.trim()
    if (message.length < 5) {
      throw new ApiError('INVALID_FEEDBACK', 'Tulis ulasan minimal 5 karakter.')
    }

    const rating =
      typeof input.rating === 'number' && input.rating >= 1 && input.rating <= 5
        ? Math.round(input.rating)
        : null
    const existing = this.feedback.find(
      (item) => item.reservationId === reservation.id,
    )
    const now = new Date().toISOString()
    const entry: ReservationFeedback = {
      reservationId: reservation.id,
      rating,
      message,
      roomName: reservation.roomName,
      roomCode: reservation.roomCode,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      reviewerName: reservation.requesterName,
      reviewerNim: reservation.requesterNim,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    this.feedback = existing
      ? this.feedback.map((item) =>
          item.reservationId === reservation.id ? entry : item,
        )
      : [entry, ...this.feedback]
    this.persistFeedback()
    return entry
  }

  // ── Alat bantu simulasi & pengujian ──────────────────────────────────────

  /** Memaksa satu transaksi berikutnya gagal dengan error SLOT_TAKEN. */
  simulateSlotTakenOnce(booking?: Partial<PhantomBooking>): void {
    this.phantomBookings.push({
      roomId: booking?.roomId ?? 'a-studio-foto',
      date: booking?.date ?? addDaysISO(todayISO(), 1),
      startTime: booking?.startTime ?? '10:00',
      endTime: booking?.endTime ?? '12:00',
    })
  }

  /** Mengembalikan data awal (menghapus reservasi buatan pengguna). */
  async resetMockData(): Promise<void> {
    await wait(300)
    this.reservations = createSeedReservations()
    this.phantomBookings = []
    this.feedback = createSeedFeedback()
    this.persist()
    this.persistFeedback()
  }

  /**
   * Memigrasi kepemilikan reservasi ketika profil pengguna berubah NIM —
   * supaya daftar "Reservasi saya" tetap mengikuti mahasiswa setelah edit profil.
   */
  async migrateOwnership(
    oldNim: string,
    patch: { requesterName: string; requesterNim: string; requesterPhone?: string },
  ): Promise<number> {
    await wait(240)
    let affected = 0
    this.reservations = this.reservations.map((reservation) => {
      if (reservation.requesterNim !== oldNim) return reservation
      affected += 1
      return {
        ...reservation,
        requesterName: patch.requesterName.trim(),
        requesterNim: patch.requesterNim.trim(),
        ...(patch.requesterPhone ? { requesterPhone: patch.requesterPhone } : {}),
      }
    })
    if (affected > 0) this.persist()
    return affected
  }

  private suggestAlternative(input: CreateReservationInput): string | null {
    const sameDay = this.reservations.filter(
      (reservation) =>
        reservation.roomId === input.roomId &&
        reservation.date === input.date &&
        reservation.status === 'approved',
    )
    const hours = getOperatingHours(input.date)
    const candidate = buildHourlySlots(hours).find((slot) => {
      const free = !sameDay.some((reservation) =>
        rangesOverlap(slot.start, slot.end, reservation.startTime, reservation.endTime),
      )
      return free && !isPastDateTime(input.date, slot.start)
    })
    return candidate ? `${candidate.start}–${candidate.end}` : null
  }

  private createCode(room: Room, date: string): string {
    const day = parseISODate(date).getDate().toString().padStart(2, '0')
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `IDB-${room.buildingId}-${day}${suffix}`
  }

  private loadReservations(): Reservation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const seed = createSeedReservations()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
        return seed
      }
      const parsed = JSON.parse(raw) as Reservation[]
      if (!Array.isArray(parsed)) throw new Error('Format data tidak valid')
      return parsed.map((entry) => ({ ...entry, status: normalizeStatus(entry.status) }))
    } catch {
      return createSeedReservations()
    }
  }

  /** Ulasan tersimpan; saat pertama dibuka, isi dengan contoh demo. */
  private loadFeedback(): ReservationFeedback[] {
    try {
      const raw = localStorage.getItem(FEEDBACK_KEY)
      if (!raw) {
        const seed = createSeedFeedback()
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(seed))
        return seed
      }
      const parsed = JSON.parse(raw) as ReservationFeedback[]
      if (!Array.isArray(parsed)) throw new Error('Format data tidak valid')
      return parsed.filter(
        (entry) => entry && typeof entry.reservationId === 'string' && typeof entry.message === 'string',
      )
    } catch {
      return createSeedFeedback()
    }
  }

  private persistFeedback(): void {
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(this.feedback))
    } catch {
      console.warn('[IDB Space] Gagal menyimpan ulasan ke localStorage.')
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reservations))
    } catch {
      console.warn('[IDB Space] Gagal menyimpan reservasi ke localStorage.')
    }
  }
}

export const mockApi = new MockApiService()
