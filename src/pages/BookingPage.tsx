import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Users,
} from 'lucide-react'
import type { RoomAvailability } from '../types'
import { ApiError } from '../types'
import { mockApi } from '../services/MockApiService'
import { buildings, findRoom } from '../data/campus'
import {
  durationInMinutes,
  formatDateLong,
  getOperatingHours,
  isPastDateTime,
  minutesToTime,
  timeToMinutes,
  relativeDayLabel,
  todayISO,
} from '../lib/date'
import { useApp } from '../context/AppContext'
import { AvailabilityStrip } from '../components/ui/AvailabilityStrip'

/** BR-02 — delay jaringan palsu (≈2–3 detik digabung latency mock service). */
const MIN_SUBMIT_MS = 1800

interface TimeOption {
  value: string
  label: string
  disabled: boolean
}

/** Opsi jam 30-menit sesuai jam operasional pada tanggal terpilih. */
function buildTimeOptions(date: string, availability?: RoomAvailability): TimeOption[] {
  const hours = getOperatingHours(date)
  if (hours.isClosed) return []

  const booked = new Set(
    availability?.slots.filter((slot) => slot.status === 'booked').map((slot) => slot.start) ?? [],
  )
  const isToday = date === todayISO()
  const options: TimeOption[] = []
  for (let cursor = timeToMinutes(hours.open); cursor <= timeToMinutes(hours.close); cursor += 30) {
    const value = minutesToTime(cursor)
    const label = `${value.replace(':', '.')}${cursor === timeToMinutes(hours.close) ? ' (tutup)' : ''}`
    const disabled =
      booked.has(value) || (isToday && isPastDateTime(date, value))
    options.push({ value, label, disabled })
  }
  return options
}

export function BookingPage() {
  const [params] = useSearchParams()
  const room = findRoom(params.get('ruang') ?? '')
  const { notify, reloadReservations, currentUser, maintenance, isAdmin } = useApp()

  const [date, setDate] = useState(() => {
    const paramDate = params.get('tanggal')
    return paramDate && !Number.isNaN(Date.parse(paramDate)) ? paramDate : todayISO()
  })
  const [availability, setAvailability] = useState<RoomAvailability | undefined>()

  const initialStart = params.get('mulai') ?? ''
  const initialEnd = params.get('selesai') ?? ''
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)
  const [purpose, setPurpose] = useState('')
  /** Jumlah peserta — '' saat field dikosongkan, angka tanpa nol di depan saat terisi. */
  const [attendeeCount, setAttendeeCount] = useState<number | ''>(2)

  const [submitting, setSubmitting] = useState(false)
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<{
    message: string
    suggestion?: string | null
  } | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  // Muat ketersediaan ruang untuk tanggal terpilih.
  useEffect(() => {
    if (!room) return
    let cancelled = false
    void mockApi.getAvailability(room.id, date).then((data) => {
      if (!cancelled) setAvailability(data)
    })
    return () => {
      cancelled = true
    }
  }, [room, date])

  const building = room ? buildings.find((item) => item.id === room.buildingId) : undefined
  const hours = getOperatingHours(date)
  const startOptions = useMemo(() => buildTimeOptions(date), [date])
  const endOptions = useMemo(() => buildTimeOptions(date), [date])

  const resetTimeDefaults = useCallback(
    (nextDate: string, nextAvailability?: RoomAvailability) => {
      const nextHours = getOperatingHours(nextDate)
      const nextOptions = buildTimeOptions(nextDate, nextAvailability)
      const closeValue = minutesToTime(timeToMinutes(nextHours.close))
      const freeStart = nextOptions.find(
        (option) => !option.disabled && option.value !== closeValue,
      )
      if (freeStart) {
        // End: pilihan pertama setelah start yang masih boleh dipakai (BR-01 aman).
        const freeEnd =
          nextOptions.find(
            (option) => option.value > freeStart.value && !option.disabled,
          )?.value ?? freeStart.value
        setStartTime(freeStart.value)
        setEndTime(freeEnd)
      } else {
        setStartTime(nextHours.open)
        setEndTime(nextHours.open)
      }
    },
    [],
  )

  useEffect(() => {
    // Saat tanggal berubah, usulkan slot kosong pertama dari data availability.
    resetTimeDefaults(date, availability)
  }, [date, availability, resetTimeDefaults])

  // ── Validasi client-side ─────────────────────────────────────────────────
  const bothTimeSelected = Boolean(startTime && endTime)

  /** BR-01 — jam mulai harus lebih awal dari jam selesai. */
  const timeRangeError =
    bothTimeSelected && timeToMinutes(startTime) >= timeToMinutes(endTime)
      ? 'Waktu mulai harus lebih awal daripada waktu selesai.'
      : null

  /** Di luar jam operasional (mis. memilih jam sebelum 07.00 / setelah 21.00). */
  const hoursError = (() => {
    if (!bothTimeSelected || hours.isClosed) return null
    if (timeToMinutes(startTime) < timeToMinutes(hours.open))
      return `Jam peminjaman dimulai ${hours.open.replace(':', '.')} WITA.`
    if (timeToMinutes(endTime) > timeToMinutes(hours.close))
      return `Jam peminjaman berakhir ${hours.close.replace(':', '.')} WITA.`
    return null
  })()

  /** Tabrakan dengan slot yang sudah terisi (preview dari mock availability). */
  const overlapError = (() => {
    if (!bothTimeSelected || !availability || timeRangeError || hoursError) return null
    const clash = availability.slots.some(
      (slot) =>
        slot.status === 'booked' &&
        slot.start < endTime &&
        startTime < slot.end,
    )
    return clash ? 'Rentang ini bertabrakan dengan jadwal yang sudah terisi.' : null
  })()

  const capacityError =
    typeof attendeeCount === 'number' && attendeeCount > (room?.capacity ?? 999)
      ? `Jumlah peserta melebihi kapasitas ruang (maksimal ${room?.capacity} orang).`
      : null

  const dateClosedError = hours.isClosed ? 'Kampus tutup pada tanggal ini.' : null

  const firstError = timeRangeError ?? hoursError ?? overlapError ?? capacityError ?? dateClosedError

  const canSubmit = Boolean(
    room &&
      bothTimeSelected &&
      purpose.trim().length >= 3 &&
      typeof attendeeCount === 'number' &&
      attendeeCount >= 1 &&
      !firstError &&
      !submitting,
  )

  // ── Submit (BR-02) ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!room || submitting) return // BR-02: tolak klik kedua saat sedang mengirim.
      // Validasi jumlah peserta + narrow TS: di bawah sini attendeeCount pasti number.
      if (typeof attendeeCount !== 'number' || attendeeCount < 1) return

      setSubmitError(null)
      setSubmitting(true)

      const startedAt = Date.now()
      try {
        const [reservation] = await Promise.all([
          mockApi.createReservation({
            roomId: room.id,
            date,
            startTime,
            endTime,
            purpose,
            attendeeCount,
            requesterName: currentUser.name,
            requesterNim: currentUser.nim,
            requesterPhone: currentUser.phone,
          }),
          // Simulasi jaringan: minimal 2–3 detik sesuai spesifikasi mockup.
          new Promise<void>((resolve) => {
            timerRef.current = window.setTimeout(resolve, MIN_SUBMIT_MS)
          }),
        ])

        await reloadReservations()
        setConfirmedCode(reservation.code)
        notify({
          tone: 'success',
          title: `Reservasi ${reservation.code} dibuat`,
          message: `${reservation.roomName} · ${relativeDayLabel(reservation.date)} ${reservation.startTime.replace(':', '.')}–${reservation.endTime.replace(':', '.')} WITA`,
        })
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Terjadi kesalahan jaringan. Coba sekali lagi, ya.'
        const suggestion =
          error instanceof ApiError && error.details
            ? (error.details.suggestedAlternative as string | null) ?? null
            : null
        setSubmitError({ message, suggestion })
        notify({ tone: 'error', title: 'Reservasi gagal', message })
      } finally {
        const elapsed = Date.now() - startedAt
        const remaining = Math.max(0, MIN_SUBMIT_MS + 400 - elapsed)
        window.setTimeout(() => {
          setSubmitting(false)
        }, remaining)
      }
    },
    [attendeeCount, currentUser, date, endTime, notify, purpose, reloadReservations, room, startTime, submitting],
  )

  // ── Role-based access: formulir reservasi hanya untuk mahasiswa ───────────
  // Admin tidak mengajukan reservasi — tugas verifikasi & pengelolaan ruangan.
  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  // ── Halaman tanpa ruangan terpilih ──────────────────────────────────────
  if (!room) {
    return (
      <div className="page">
        <div className="container page__inner booking-page">
          <div className="page-head">
            <Link className="back-link" to="/cari">
              <ArrowLeft size={15} aria-hidden="true" />
              Kembali ke pencarian
            </Link>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Reservasi ruang
            </span>
            <h1 className="page-title">Pilih ruangnya dulu, ya.</h1>
            <p className="page-lead">
              Belum ada ruangan yang dipilih. Buka halaman Cari Ruang, lalu tekan tombol
              “Pesan Ruangan” untuk mengisi formulir reservasi.
            </p>
            <Link className="btn btn--primary" to="/cari">
              Buka Cari Ruang
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Panel sukses ──────────────────────────────────────────────────────────
  if (confirmedCode) {
    return (
      <div className="page">
        <div className="container page__inner booking-page">
          <div className="page-head">
            <Link className="back-link" to="/cari">
              <ArrowLeft size={15} aria-hidden="true" />
              Kembali ke pencarian
            </Link>
          </div>
          <div className="success-panel">
            <span className="success-panel__icon" aria-hidden="true">
              <CheckCircle2 size={44} />
            </span>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Pengajuan terkirim
            </span>
            <h1 className="page-title">Yeay, pengajuanmu masuk antrean!</h1>
            <p className="page-lead">
              Simpan kode reservasimu. Statusnya <strong>Menunggu Persetujuan</strong> —
              setujui/tolak ditinjau oleh Bagian Kemahasiswaan sebelum ruangan dipakai.
            </p>
            <div className="success-panel__code-row">
              <code className="success-panel__code">{confirmedCode}</code>
              <span className="success-panel__detail">
                {room.name} · {formatDateLong(date)} ·{' '}
                {startTime.replace(':', '.')}–{endTime.replace(':', '.')} WITA
              </span>
            </div>
            <div className="success-panel__actions">
              <Link className="btn btn--primary" to="/reservasi">
                Lihat reservasi saya
              </Link>
              <Link className="btn btn--ghost" to="/cari">
              Pesan ruangan lain
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Status Kontrol Ruangan: admin menutup ruangan ini ─────────────────────
  if (maintenance[room.id]) {
    return (
      <div className="page">
        <div className="container page__inner booking-page">
          <div className="page-head">
            <Link className="back-link" to="/cari">
              <ArrowLeft size={15} aria-hidden="true" />
              Kembali ke pencarian
            </Link>
            <span className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Sedang maintenance
            </span>
            <h1 className="page-title">{room.name} ditutup sementara.</h1>
            <p className="page-lead">
              Tim Kemahasiswaan sedang menutup {room.code} untuk pemeliharaan. Silakan pilih
              ruangan lain yang masih aktif.
            </p>
            <Link className="btn btn--primary" to="/cari">
              Lihat Ruangan Lain
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Halaman formulir lengkap ─────────────────────────────────────────────
  return (
    <div className="page">
      <div className="container page__inner booking-page">
        <div className="page-head">
          <Link className="back-link" to="/cari">
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali ke pencarian
          </Link>
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Reservasi ruang
          </span>
          <h1 className="page-title">Pesan {room.name}.</h1>
          <p className="page-lead">
            Isi rentang waktu dan keperluanmu. Jam peminjaman mengikuti jam operasional
            kampus: <strong>07.00 WITA – 21.00 WITA</strong> (Senin–Jumat).
          </p>
        </div>

        <div className="booking-layout">
          <form className="booking-form" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <div className="error-banner" role="alert">
                <AlertTriangle size={17} aria-hidden="true" />
                <div>
                  <strong>Gagal memesan ruangan</strong>
                  <p>{submitError.message}</p>
                  {submitError.suggestion && (
                    <p>
                      Slot kosong terdekat pada tanggal ini:{' '}
                      <strong>{submitError.suggestion}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="form-row">
              <label className="field">
                <span className="field__label">Tanggal peminjaman</span>
                <input
                  className="input"
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(event) => {
                    const next = event.target.value
                    if (next && next >= todayISO()) {
                      setDate(next)
                    }
                  }}
                  required
                />
                <span className="field__hint">{relativeDayLabel(date)}</span>
              </label>

              {dateClosedError ? (
                <div className="form-row__notice" role="alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  {dateClosedError} Silakan pilih hari lain.
                </div>
              ) : (
                <>
                  <div className="form-row form-row--pair">
                    <label className="field">
                      <span className="field__label">Waktu mulai</span>
                      <select
                        className="input input--select"
                        value={startTime}
                        onChange={(event) => {
                          setStartTime(event.target.value)
                        }}
                        required
                      >
                        <option value="" disabled>
                          Pilih jam…
                        </option>
                        {startOptions.map((option) => (
                          <option
                            key={`s-${option.value}`}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span className="field__label">Waktu selesai</span>
                      <select
                        className="input input--select"
                        value={endTime}
                        onChange={(event) => {
                          setEndTime(event.target.value)
                        }}
                        required
                      >
                        <option value="" disabled>
                          Pilih jam…
                        </option>
                        {endOptions.map((option) => (
                          <option
                            key={`e-${option.value}`}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {timeRangeError && <p className="field-error">{timeRangeError}</p>}
                  {!timeRangeError && hoursError && <p className="field-error">{hoursError}</p>}
                  {!timeRangeError && !hoursError && overlapError && (
                    <p className="field-error">{overlapError}</p>
                  )}
                  {bothTimeSelected && !firstError && (
                    <p className="field-hint-inline">
                      <Clock size={14} aria-hidden="true" />
                      Durasi {durationInMinutes(startTime, endTime)} menit ·{' '}
                      {startTime.replace(':', '.')}–{endTime.replace(':', '.')} WITA
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="form-row">
              <label className="field">
                <span className="field__label">Keperluan</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Contoh: Asistensi projek studio blok 3"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  maxLength={120}
                  required
                />
              </label>

              <label className="field field--narrow">
                <span className="field__label">Jumlah peserta</span>
                <input
                  className="input"
                  /* type="text" + inputMode numeric: pada type="number", React/Chrome
                     kerap menyimpan & menampilkan string berawalan nol ("05"). Sanitasi
                     manual di bawah menjamin nilainya selalu bersih. */
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="1"
                  value={attendeeCount}
                  onChange={(event) => {
                    // Tampung digit saja, lalu Number() memangkas nol di depan:
                    // "05" → 5, "089" → 89. Kosong → '' (bukan 0 mengganjal).
                    const digits = event.target.value.replace(/\D/g, '')
                    setAttendeeCount(digits === '' ? '' : Number(digits))
                  }}
                  required
                />
                {capacityError && <span className="field-error">{capacityError}</span>}
              </label>
            </div>

            <div className="submit-row">
              <button
                type="submit"
                className="btn btn--primary btn--full submit-row__btn"
                disabled={!canSubmit}
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <Hourglass className="spin" size={17} aria-hidden="true" />
                    Memproses...
                  </>
                ) : (
                  'Konfirmasi Reservasi'
                )}
              </button>
              <p className="submit-row__hint">
                Pemesan: <strong>{currentUser.name}</strong> ({currentUser.nim})
              </p>
            </div>
          </form>

          <aside className="booking-side">
            <div className="booking-side__card">
              <img
                className="booking-side__img"
                src={room.imageUrl}
                alt={`Foto ${room.name}`}
                style={room.imagePosition ? { objectPosition: room.imagePosition } : undefined}
              />
              <div className="booking-side__body">
                <div className="booking-side__chip-row">
                  <span className="booking-side__code">{room.code}</span>
                  <span className="booking-side__building">{building?.name}</span>
                </div>
                <h2 className="booking-side__name">{room.name}</h2>
                <ul className="booking-side__meta">
                  <li>
                    <MapPin size={15} aria-hidden="true" />
                    {building?.name} · {room.floor}
                  </li>
                  <li>
                    <Users size={15} aria-hidden="true" />
                    Kapasitas {room.capacity} orang
                  </li>
                </ul>
                <div className="booking-side__avail">
                  <span className="booking-side__avail-label">
                    Jadwal {relativeDayLabel(date)}:
                  </span>
                  <AvailabilityStrip availability={availability} showAxis />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
