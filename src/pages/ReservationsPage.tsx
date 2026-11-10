import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  MessageSquarePlus,
  ShieldCheck,
  Star,
  Undo2,
  User,
  Users,
} from 'lucide-react'
import type { Reservation, ReservationFeedback } from '../types'
import { ApiError } from '../types'
import { mockApi } from '../services/MockApiService'
import { buildings } from '../data/campus'
import { formatTimeRange, isPastDateTime, relativeDayLabel } from '../lib/date'
import { useApp } from '../context/AppContext'
import { PermitLetterModal } from '../components/letter/PermitLetterModal'
import { ReviewModal } from '../components/feedback/ReviewModal'

/**
 * Tugas 3 — Halaman "Reservasi Saya".
 * Conditional rendering per status (alur persetujuan Kemahasiswaan):
 *
 * ┌─────────────┬──────────────────┬────────────────────────────────────────────┐
 * │ Badge       │ Warna            | Aksi di kartu                              │
 * ├─────────────┼──────────────────┼────────────────────────────────────────────┤
 * │ Menunggu    │ kuning           │ tombol nonaktif "Menunggu Persetujuan..."  │
 * │ Ditolak     │ merah            │ alasan penolakan (mis. "Jadwal Penuh")     │
 * │ Disetujui   │ hijau            │ tombol utama "Lihat Surat Izin" (+ BR-03)  │
 * │ Selesai     │ abu-abu          │ tombol outline "Lapor Kendala"             │
 * └─────────────┴──────────────────┴────────────────────────────────────────────┘
 * 'dibatalkan' = pengajuan yang ditarik pengguna — tampil redup tanpa aksi.
 */
type StatusKey = 'menunggu' | 'disetujui' | 'ditolak' | 'selesai' | 'dibatalkan'
type FilterChoice = 'semua' | StatusKey

const statusLabel: Record<StatusKey, string> = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

/** Ikon & warna tone untuk stat card filter (luar & dalam lingkup 'semua'). */
const FILTER_META: Record<
  FilterChoice,
  { icon: typeof Hourglass; tone: 'navy' | 'amber' | 'green' | 'red' | 'slate' }
> = {
  semua: { icon: CalendarDays, tone: 'navy' },
  menunggu: { icon: Hourglass, tone: 'amber' },
  disetujui: { icon: CheckCircle2, tone: 'green' },
  ditolak: { icon: AlertTriangle, tone: 'red' },
  selesai: { icon: Clock, tone: 'slate' },
  dibatalkan: { icon: Ban, tone: 'slate' },
}

/** Status badge yang tampil = status data + kondisi jam saat ini. */
function deriveStatus(reservation: Reservation): StatusKey {
  switch (reservation.status) {
    case 'pending':
      return 'menunggu'
    case 'rejected':
      return 'ditolak'
    case 'cancelled':
      return 'dibatalkan'
    case 'completed':
      return 'selesai'
    case 'approved':
      // Pemakaian yang sudah berlalu dianggap selesai.
      return isPastDateTime(reservation.date, reservation.endTime) ? 'selesai' : 'disetujui'
  }
}

/** Kartu Disetujui yang sedang dipakai (untuk titik hijau berkedip di badge). */
function isOngoing(reservation: Reservation): boolean {
  return (
    reservation.status === 'approved' &&
    isPastDateTime(reservation.date, reservation.startTime) &&
    !isPastDateTime(reservation.date, reservation.endTime)
  )
}

/** BR-03 — pembatalan hanya sebelum waktu mulai dan hanya untuk yang disetujui. */
function canCancel(reservation: Reservation): boolean {
  return (
    reservation.status === 'approved' &&
    !isPastDateTime(reservation.date, reservation.startTime)
  )
}

function sortReservations(a: Reservation, b: Reservation): number {
  return `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
}

// ── Opsi laporan kerusakan fasilitas (modal "Lapor Kendala") ───────────────
const KENDALA_OPTIONS = [
  'AC mati / tidak dingin',
  'Proyektor tidak menyala',
  'Sound system bermasalah',
  'Kursi atau meja rusak',
  'Kunci / akses ruangan bermasalah',
  'Lainnya (tulis di keterangan)',
]

export function ReservationsPage() {
  const {
    reservations,
    feedback,
    reloadReservations,
    notify,
    currentUser,
    status: appStatus,
    isAdmin,
  } = useApp()

  const [filter, setFilter] = useState<FilterChoice>('semua')
  // Admin langsung melihat seluruh pengajuan; mahasiswa default daftar miliknya.
  const [showAll, setShowAll] = useState(isAdmin)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [letterReservation, setLetterReservation] = useState<Reservation | null>(null)
  const [kendalaReservation, setKendalaReservation] = useState<Reservation | null>(null)
  const [reviewReservation, setReviewReservation] = useState<Reservation | null>(null)
  // Verifikasi admin (Switch Akun): approve langsung, reject lewat modal alasan.
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Reservation | null>(null)

  // Menyesuaikan lingkup daftar tiap kali role berganti (tanpa error).
  useEffect(() => {
    setShowAll(isAdmin)
    setArmedId(null)
    setApprovingId(null)
  }, [isAdmin])

  const scoped = useMemo(
    () =>
      showAll
        ? reservations
        : reservations.filter((item) => item.requesterNim === currentUser.nim),
    [reservations, showAll, currentUser.nim],
  )

  /** Ulasan per reservasi — dipakai kartu Selesai (tombol ubah / badge terkirim). */
  const feedbackByReservation = useMemo(() => {
    const map = new Map<string, ReservationFeedback>()
    for (const entry of feedback) map.set(entry.reservationId, entry)
    return map
  }, [feedback])

  const counts = useMemo(() => {
    const byStatus = new Map<FilterChoice, number>()
    for (const item of scoped) {
      const key = deriveStatus(item)
      byStatus.set(key, (byStatus.get(key) ?? 0) + 1)
      byStatus.set('semua', (byStatus.get('semua') ?? 0) + 1)
    }
    return byStatus
  }, [scoped])

  const choices = useMemo<FilterChoice[]>(() => {
    const base: FilterChoice[] = ['semua', 'menunggu', 'disetujui', 'ditolak', 'selesai']
    // Chip "Dibatalkan" hanya muncul bila ada reservasi yang pernah ditarik.
    return (counts.get('dibatalkan') ?? 0) > 0 ? [...base, 'dibatalkan'] : base
  }, [counts])

  const handleCancel = useCallback(async (reservation: Reservation) => {
    setCancellingId(reservation.id)
    try {
      await mockApi.cancelReservation(reservation.id)
      await reloadReservations()
      setArmedId(null)
      notify({
        tone: 'success',
        title: `Reservasi ${reservation.code} dibatalkan`,
        message: `${reservation.roomName} sudah dilepas dari jadwalmu.`,
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Gagal membatalkan reservasi. Coba lagi sebentar.'
      notify({ tone: 'error', title: 'Pembatalan digagalkan', message })
    } finally {
      setCancellingId(null)
    }
  }, [notify, reloadReservations])

  /** Admin Kemahasiswaan — setujui pengajuan yang menunggu. */
  const handleApprove = useCallback(
    async (reservation: Reservation) => {
      setApprovingId(reservation.id)
      try {
        await mockApi.approveReservation(reservation.id)
        await reloadReservations()
        notify({
          tone: 'success',
          title: `Pengajuan ${reservation.code} disetujui`,
          message: `${reservation.roomName} dikonfirmasi — pemohon kini bisa mencetak surat izin.`,
        })
      } catch (error) {
        notify({
          tone: 'error',
          title: 'Persetujuan digagalkan',
          message:
            error instanceof ApiError
              ? error.message
              : 'Terjadi kesalahan. Coba lagi sebentar.',
        })
      } finally {
        setApprovingId(null)
      }
    },
    [notify, reloadReservations],
  )

  const visible = useMemo(() => {
    const list = filter === 'semua' ? scoped : scoped.filter((item) => deriveStatus(item) === filter)
    // Pengajuan & pemakaian aktif dulu (paling dekat), riwayat menyusul (paling baru).
    const active = list.filter((item) =>
      ['menunggu', 'disetujui'].includes(deriveStatus(item)),
    )
    const history = list.filter((item) =>
      ['selesai', 'ditolak', 'dibatalkan'].includes(deriveStatus(item)),
    )
    return [...active.sort(sortReservations), ...history.sort(sortReservations).reverse()]
  }, [filter, scoped])

  return (
    <div className="page rsv-page">
      <div className="container page__inner">
        <div className="page-head">
          <Link className="back-link" to="/">
            <ArrowLeft size={15} aria-hidden="true" />
            Beranda
          </Link>
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Status reservasi
          </span>
          <h1 className="page-title">
            {isAdmin ? 'Verifikasi pengajuan reservasi.' : 'Semua reservasimu, dalam satu tempat.'}
          </h1>
          <p className="page-lead">
            {isAdmin ? (
              <>
                Tinjau pengajuan mahasiswa &amp; organisasi, lalu tekan <strong>Setujui</strong> atau{' '}
                <strong>Tolak</strong> pada kartu yang masih <strong>Menunggu</strong>. Keputusanmu
                langsung memperbarui status pemohon dan ketersediaan ruang.
              </>
            ) : (
              <>
                Pantau paparan statusnya: <strong>Menunggu</strong> persetujuan,
                <strong> Disetujui</strong>, <strong>Ditolak</strong> (beserta alasannya), atau
                sudah <strong>Selesai</strong>. Reservasi yang disetujui bisa dibatalkan
                selama belum melewati jam mulai (BR-03).
              </>
            )}
          </p>
        </div>

        <div className="rsv-toolbar">
          {/* Dashboard stat cards — sekaligus tombol filter status */}
          <div className="stat-cards" role="tablist" aria-label="Filter status reservasi">
            {choices.map((choice) => {
              const meta = FILTER_META[choice]
              const Icon = meta.icon
              const active = filter === choice
              return (
                <button
                  key={choice}
                  type="button"
                  className={`stat-card stat-card--${meta.tone}${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(choice)
                    setArmedId(null)
                  }}
                >
                  <span className="stat-card__icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="stat-card__label">
                    {choice === 'semua' ? 'Semua' : statusLabel[choice]}
                  </span>
                  <span className="stat-card__value">{counts.get(choice) ?? 0}</span>
                </button>
              )
            })}
          </div>

          {isAdmin ? (
            <span className="rsv-admin-tag">
              <ShieldCheck size={14} aria-hidden="true" />
              Mode tim Kemahasiswaan — semua pengajuan tampil
            </span>
          ) : (
            <label className="rsv-toggle">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(event) => {
                  setShowAll(event.target.checked)
                  setArmedId(null)
                }}
              />
              <span>Tampilkan reservasi mahasiswa &amp; organisasi lain</span>
            </label>
          )}
        </div>

        {appStatus === 'loading' ? (
          <div className="rsv-list rsv-list--loading" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rsv-card rsv-card--skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="search-empty">
            <h2>Belum ada reservasi di sini.</h2>
            <p>
              {filter === 'semua'
                ? isAdmin
                  ? 'Belum ada pengajuan masuk dengan status ini. Ruangan bisa dikelola di Panel Admin.'
                  : 'Kamu belum mengajukan peminjaman. Yuk mulai dari halaman Cari Ruang.'
                : 'Tidak ada reservasi dengan status ini. Coba filter lain.'}
            </p>
            {isAdmin ? (
              <Link className="btn btn--primary" to="/admin">
                Buka Panel Admin
              </Link>
            ) : (
              <Link className="btn btn--primary" to="/cari">
                Cari &amp; pesan ruangan
              </Link>
            )}
          </div>
        ) : (
          <ul className="rsv-list">
            {visible.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                showOwner={showAll}
                admin={isAdmin}
                verifying={approvingId === reservation.id}
                armed={armedId === reservation.id}
                cancelling={cancellingId === reservation.id}
                review={feedbackByReservation.get(reservation.id) ?? null}
                onOpenLetter={() => setLetterReservation(reservation)}
                onOpenKendala={() => setKendalaReservation(reservation)}
                onOpenReview={() => setReviewReservation(reservation)}
                onArm={() => setArmedId(reservation.id)}
                onDisarm={() => setArmedId(null)}
                onConfirm={() => void handleCancel(reservation)}
                onApprove={() => void handleApprove(reservation)}
                onReject={() => setRejectTarget(reservation)}
              />
            ))}
          </ul>
        )}

      </div>

      {letterReservation && (
        <PermitLetterModal
          reservation={letterReservation}
          currentUser={currentUser}
          onClose={() => setLetterReservation(null)}
        />
      )}

      {kendalaReservation && (
        <KendalaModal
          reservation={kendalaReservation}
          onClose={() => setKendalaReservation(null)}
        />
      )}

      {reviewReservation && (
        <ReviewModal
          reservation={reviewReservation}
          existing={feedbackByReservation.get(reviewReservation.id) ?? null}
          onClose={() => setReviewReservation(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal reservation={rejectTarget} onClose={() => setRejectTarget(null)} />
      )}
    </div>
  )
}

// ── Kartu reservasi (conditional rendering per status) ─────────────────────

interface ReservationCardProps {
  reservation: Reservation
  showOwner: boolean
  /** Mode verifikasi admin (Switch Akun) — aksi Setujui/Tolak pada kartu Menunggu. */
  admin?: boolean
  verifying?: boolean
  armed: boolean
  cancelling: boolean
  /** Ulasan yang sudah tersimpan untuk reservasi ini (null = belum). */
  review: ReservationFeedback | null
  onOpenLetter: () => void
  onOpenKendala: () => void
  onOpenReview: () => void
  onArm: () => void
  onDisarm: () => void
  onConfirm: () => void
  onApprove: () => void
  onReject: () => void
}

function ReservationCard({
  reservation,
  showOwner,
  admin = false,
  verifying = false,
  armed,
  cancelling,
  review,
  onOpenLetter,
  onOpenKendala,
  onOpenReview,
  onArm,
  onDisarm,
  onConfirm,
  onApprove,
  onReject,
}: ReservationCardProps) {
  const status = deriveStatus(reservation)
  const ongoing = isOngoing(reservation)
  const cancellable = canCancel(reservation)
  const building = buildings.find((item) => item.id === reservation.buildingId)

  return (
    <li className={`rsv-card rsv-card--${status}${armed ? ' rsv-card--armed' : ''}`}>
      <div className="rsv-card__main">
        <div className="rsv-card__head">
          <code className="rsv-card__code">{reservation.code}</code>
          <span className={`rsv-pill rsv-pill--${status}`}>
            {ongoing && status === 'disetujui' && (
              <span className="rsv-pill__live" aria-hidden="true" />
            )}
            {statusLabel[status]}
          </span>
        </div>

        <div className="rsv-card__body">
          <h3 className="rsv-card__room">
            {reservation.roomName}
            <span className="rsv-card__room-code">{reservation.roomCode}</span>
          </h3>
          <p className={`rsv-card__purpose${status === 'dibatalkan' ? ' rsv-card__purpose--line' : ''}`}>
            {reservation.purpose}
          </p>

          <ul className="rsv-card__meta" aria-label="Detail reservasi">
            <li>
              <CalendarDays size={15} aria-hidden="true" />
              {relativeDayLabel(reservation.date)} ·{' '}
              {formatTimeRange(reservation.startTime, reservation.endTime)} WITA
            </li>
            <li>
              <Users size={15} aria-hidden="true" />
              {reservation.attendeeCount} orang · {building?.name}
            </li>
            {showOwner && (
              <li>
                <User size={15} aria-hidden="true" />
                {reservation.requesterName} ({reservation.requesterNim})
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="rsv-card__side">
        {/* Menunggu — mahasiswa: tombol nonaktif | admin: aksi verifikasi */}
        {status === 'menunggu' &&
          (admin ? (
            <div className="rsv-verify">
              <button
                type="button"
                className="rsv-verify__ok"
                disabled={verifying}
                onClick={onApprove}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                {verifying ? 'Memproses...' : 'Setujui'}
              </button>
              <button
                type="button"
                className="rsv-verify__no"
                disabled={verifying}
                onClick={onReject}
              >
                <Ban size={15} aria-hidden="true" />
                Tolak
              </button>
            </div>
          ) : (
            <button type="button" className="rsv-wait" disabled>
              <Hourglass size={15} aria-hidden="true" />
              Menunggu Persetujuan...
            </button>
          ))}

        {/* Ditolak — alasan ditampilkan */}
        {status === 'ditolak' && (
          <div className="rsv-reject" role="status">
            <Ban size={15} aria-hidden="true" />
            <p>
              {reservation.rejectionReason ?? 'Jadwal Penuh.'}
              {admin ? ' Dikembalikan ke pemohon untuk diajukan ulang.' : ' Ajukan ulang di slot lain, ya.'}
            </p>
          </div>
        )}

        {/* Disetujui — tombol utama Surat Izin (+ pembatalan BR-03) — aksi pemilik */}
        {status === 'disetujui' && !admin && (
          <button type="button" className="rsv-letter" onClick={onOpenLetter}>
            <FileText size={15} aria-hidden="true" />
            Lihat Surat Izin
          </button>
        )}
        {status === 'disetujui' && cancellable && !admin && !armed && (
          <>
            <button
              type="button"
              className="rsv-cancel"
              disabled={cancelling}
              onClick={onArm}
            >
              <AlertTriangle size={15} aria-hidden="true" />
              Batalkan
            </button>
            <p className="rsv-cancel-hint">
              <Clock size={13} aria-hidden="true" />
              Bisa dibatalkan sampai {reservation.startTime.replace(':', '.')} (BR-03)
            </p>
          </>
        )}
        {status === 'disetujui' && ongoing && (
          <p className="rsv-lock-note">
            <AlertTriangle size={14} aria-hidden="true" />
            Sudah dimulai — tidak bisa dibatalkan (BR-03)
          </p>
        )}

        {/* Selesai — ulasan pasca-pemakaian + lapor kerusakan fasilitas */}
        {status === 'selesai' && !admin && (
          <div className="rsv-postrev">
            {review ? (
              <div className="rsv-review-done">
                <span className="rsv-review-done__stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={13}
                      className={review.rating && value <= review.rating ? 'is-on' : ''}
                    />
                  ))}
                </span>
                <span className="rsv-review-done__text">
                  Ulasan terkirim{review.rating ? ` · ${review.rating}/5` : ''}
                </span>
                <button type="button" className="rsv-review-edit" onClick={onOpenReview}>
                  Ubah
                </button>
              </div>
            ) : (
              <button type="button" className="rsv-review" onClick={onOpenReview}>
                <MessageSquarePlus size={15} aria-hidden="true" />
                Beri Ulasan/Lapor Kendala
              </button>
            )}

            {reservation.issueReport ? (
              <span className="rsv-reported">
                <CheckCircle2 size={14} aria-hidden="true" />
                Kerusakan dilaporkan
              </span>
            ) : (
              <button type="button" className="rsv-kendala" onClick={onOpenKendala}>
                <AlertTriangle size={14} aria-hidden="true" />
                Lapor Kerusakan Fasilitas
              </button>
            )}
          </div>
        )}

        {/* Dibatalkan — tanpa aksi */}
        {status === 'dibatalkan' && (
          <p className="rsv-lock-note rsv-lock-note--muted">Sudah dibatalkan.</p>
        )}

        {armed && cancellable && !admin && (
          <div className="rsv-confirm" role="alertdialog" aria-label="Konfirmasi pembatalan">
            <p>
              Batalkan reservasi <strong>{reservation.code}</strong>? Slot langsung dilepas
              untuk mahasiswa lain.
            </p>
            <div className="rsv-confirm__actions">
              <button
                type="button"
                className="rsv-confirm__yes"
                disabled={cancelling}
                onClick={onConfirm}
              >
                {cancelling ? (
                  <>
                    <Hourglass className="spin" size={14} aria-hidden="true" />
                    Memproses...
                  </>
                ) : (
                  'Ya, batalkan'
                )}
              </button>
              <button type="button" className="rsv-confirm__no" onClick={onDisarm} disabled={cancelling}>
                <Undo2 size={13} aria-hidden="true" />
                Kembali
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

// ── Modal admin "Tolak Pengajuan" (alasan penolakan) ────────────────────────

const REJECT_PRESETS = [
  'Jadwal bentrok dengan kuliah umum',
  'Jadwal penuh',
  'Bentrok dengan kegiatan kampus',
  'Berkas persyaratan belum lengkap',
]

interface RejectModalProps {
  reservation: Reservation
  onClose: () => void
}

function RejectModal({ reservation, onClose }: RejectModalProps) {
  const { notify, reloadReservations } = useApp()
  const [reason, setReason] = useState(REJECT_PRESETS[0])
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !rejecting) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, rejecting])

  const handleSubmit = useCallback(async () => {
    if (rejecting) return
    setRejecting(true)
    try {
      const trimmed = reason.trim() || 'Jadwal penuh'
      await mockApi.rejectReservation(reservation.id, trimmed)
      await reloadReservations()
      notify({
        tone: 'info',
        title: `Pengajuan ${reservation.code} ditolak`,
        message: `${reservation.roomName} — alasan: ${trimmed}. Pemohon melihatnya di kartu Ditolak.`,
      })
      onClose()
    } catch (error) {
      notify({
        tone: 'error',
        title: 'Penolakan digagalkan',
        message:
          error instanceof ApiError
            ? error.message
            : 'Terjadi kesalahan. Coba lagi sebentar.',
      })
    } finally {
      setRejecting(false)
    }
  }, [reason, rejecting, reservation, notify, reloadReservations, onClose])

  return (
    <div
      className="user-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !rejecting) onClose()
      }}
    >
      <div
        className="user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
      >
        <div className="user-modal__head">
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Verifikasi kemahasiswaan
          </span>
          <h2 id="reject-title">Tolak {reservation.code}?</h2>
          <p className="kendala-sub">
            {reservation.requesterName} · {reservation.roomName} —{' '}
            {relativeDayLabel(reservation.date)} {formatTimeRange(reservation.startTime, reservation.endTime)} WITA
          </p>
        </div>

        <div className="reject-chips" role="group" aria-label="Alasan cepat">
          {REJECT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`reject-chip${reason === preset ? ' is-checked' : ''}`}
              onClick={() => setReason(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <label className="field">
          <span className="field__label">Alasan (tampil di kartu pemohon)</span>
          <textarea
            className="input kendala-note"
            rows={3}
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        <div className="user-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={rejecting}>
            Batal
          </button>
          <button
            type="button"
            className="reject-confirm"
            disabled={rejecting}
            onClick={() => void handleSubmit()}
          >
            {rejecting ? (
              <>
                <Hourglass className="spin" size={16} aria-hidden="true" />
                Memproses...
              </>
            ) : (
              <>
                <Ban size={16} aria-hidden="true" />
                Tolak Pengajuan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal "Lapor Kendala" (laporan kerusakan fasilitas) ────────────────────

interface KendalaModalProps {
  reservation: Reservation
  onClose: () => void
}

function KendalaModal({ reservation, onClose }: KendalaModalProps) {
  const { notify, reloadReservations } = useApp()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [note, setNote] = useState('')
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !reporting) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, reporting])

  const toggleOption = (option: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return next
    })
  }

  const valid = selected.size > 0 || note.trim().length >= 5

  const handleSubmit = useCallback(async () => {
    if (!valid || reporting) return
    setReporting(true)
    try {
      await mockApi.reportFacilityIssue(reservation.id, [...selected], note)
      await reloadReservations()
      notify({
        tone: 'success',
        title: 'Kendala terkirim',
        message: `Laporan untuk ${reservation.roomName} diteruskan ke bagian sarana kampus.`,
      })
      onClose()
    } catch (error) {
      notify({
        tone: 'error',
        title: 'Gagal mengirim laporan',
        message:
          error instanceof ApiError
            ? error.message
            : 'Terjadi kesalahan. Coba lagi sebentar.',
      })
    } finally {
      setReporting(false)
    }
  }, [valid, reporting, reservation, selected, note, notify, reloadReservations, onClose])

  return (
    <div
      className="user-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !reporting) onClose()
      }}
    >
      {/* Container utama: ≈ max-w-2xl, tinggi maks 90vh, isi bisa di-scroll. */}
      <div
        className="user-modal kendala-modal max-w-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kendala-title"
      >
        <div className="user-modal__head">
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Lapor kendala fasilitas
          </span>
          <h2 id="kendala-title">Ada masalah di {reservation.roomName}?</h2>
          <p className="kendala-sub">
            Laporan membantu petugas sarana memperbaiki ruangan sebelum dipakai
            pengguna berikutnya.
          </p>
        </div>

        <div className="kendala-list" role="group" aria-label="Pilih jenis kerusakan">
          {KENDALA_OPTIONS.map((option) => {
            const checked = selected.has(option)
            return (
              <label key={option} className={`kendala-option${checked ? ' is-checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOption(option)}
                />
                <span>{option}</span>
              </label>
            )
          })}
        </div>

        <label className="field">
          <span className="field__label">Keterangan tambahan (opsional)</span>
          <textarea
            className="input kendala-note"
            rows={3}
            maxLength={300}
            placeholder="Contoh: AC kirana sisi kanan mati total sejak jam 10."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="user-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={reporting}>
            Kembali
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!valid || reporting}
            onClick={() => void handleSubmit()}
          >
            {reporting ? (
              <>
                <Hourglass className="spin" size={16} aria-hidden="true" />
                Mengirim...
              </>
            ) : (
              <>
                <AlertTriangle size={16} aria-hidden="true" />
                Kirim Laporan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
