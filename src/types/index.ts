/**
 * Tipe data bersama untuk seluruh aplikasi.
 * Nanti, saat backend asli tersedia, kontrak ini bisa dipakai ulang
 * tanpa mengubah komponen UI.
 */

export type BuildingId = 'A' | 'C'

export type RoomCategory = 'studio' | 'lab' | 'class' | 'meeting' | 'hall'

export interface Building {
  id: BuildingId
  name: string
  shortName: string
  address: string
  /** Deskripsi singkat yang tampil di beranda. */
  blurb: string
}

export interface Room {
  id: string
  code: string
  name: string
  buildingId: BuildingId
  floor: string
  capacity: number
  category: RoomCategory
  /** Fasilitas yang relevan untuk peminjaman. */
  facilities: string[]
  description: string
  /** Foto ruangan asli dari situs resmi IDB Bali (di-serve dari /images/fasilitas). */
  imageUrl: string
  /** Posisi fokus foto opsional, mis. "50% 78%", untuk variasi crop antar kartu. */
  imagePosition?: string
  /**
   * Status Kontrol Ruangan (panel admin): true = ditutup untuk maintenance,
   * otomatis terkunci dan tidak bisa dipilih mahasiswa saat reservasi.
   */
  underMaintenance?: boolean
}

/**
 * Alur persetujuan peminjaman ruang:
 * pengajuan mahasiswa ('pending') ditinjau staf kemahasiswaan → 'approved' atau
 * 'rejected' (dengan alasan). Setelah pemakaian berakhir → 'completed'.
 * 'cancelled' = pengajuan/reservasi yang ditarik pengguna sebelum jam mulai.
 */
export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'

/** Laporan kerusakan fasilitas yang dikirim dari halaman Reservasi Saya. */
export interface ReservationIssueReport {
  options: string[]
  note: string
  reportedAt: string
}

export interface Reservation {
  id: string
  /** Kode yang ditunjukkan ke pengguna, mis. IDB-A-7F3K. */
  code: string
  roomId: string
  roomName: string
  roomCode: string
  buildingId: BuildingId
  /** Format ISO date: YYYY-MM-DD */
  date: string
  /** Format 24 jam: HH:mm */
  startTime: string
  endTime: string
  purpose: string
  attendeeCount: number
  requesterName: string
  requesterNim: string
  requesterPhone: string
  status: ReservationStatus
  /** Alasan penolakan dari staf kemahasiswaan (hanya untuk status 'rejected'). */
  rejectionReason?: string
  /** Laporan kendala fasilitas setelah pemakaian (status 'completed'). */
  issueReport?: ReservationIssueReport
  createdAt: string
  cancelledAt?: string
}

/** Profil mahasiswa yang sedang memakai aplikasi (mock: bisa diedit di UI). */
export interface StudentProfile {
  name: string
  nim: string
  prodi: string
  phone: string
}

/** Ulasan & laporan kendala pasca-pemakaian (satu per reservasi, bisa diubah). */
export interface ReservationFeedback {
  reservationId: string
  /** 1–5 bintang; null = tidak memberi rating (opsional). */
  rating: number | null
  message: string
  /** Snapshot ruangan & jadwal — agar dashboard admin tetap terbaca. */
  roomName: string
  roomCode: string
  date: string
  startTime: string
  endTime: string
  /** Snapshot identitas pengirim. */
  reviewerName: string
  reviewerNim: string
  createdAt: string
  updatedAt?: string
}

/** Payload kirim/ubah ulasan dari halaman Reservasi Saya. */
export interface SaveFeedbackInput {
  reservationId: string
  rating: number | null
  message: string
}

export type SlotStatus = 'available' | 'booked' | 'past' | 'closed'

export interface AvailabilitySlot {
  start: string
  end: string
  status: SlotStatus
}

export interface RoomAvailability {
  roomId: string
  date: string
  slots: AvailabilitySlot[]
  openingTime: string
  closingTime: string
  isClosed: boolean
}

export interface CreateReservationInput {
  roomId: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  attendeeCount: number
  requesterName: string
  requesterNim: string
  requesterPhone: string
}

export type ApiErrorCode =
  | 'SLOT_TAKEN'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_UNDER_MAINTENANCE'
  | 'INVALID_TIME_RANGE'
  | 'OUTSIDE_OPERATING_HOURS'
  | 'PAST_DATE'
  | 'CAPACITY_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'RESERVATION_NOT_FOUND'
  | 'CANCEL_NOT_ALLOWED'
  | 'REPORT_NOT_ALLOWED'
  | 'FEEDBACK_NOT_ALLOWED'
  | 'INVALID_FEEDBACK'

/** Error terstruktur supaya UI bisa menampilkan pesan yang ramah. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly details?: Record<string, unknown>

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

export interface CampusProfile {
  institution: string
  tagline: string
  phone: string
  email: string
  website: string
  city: string
  establishedYear: number
}
