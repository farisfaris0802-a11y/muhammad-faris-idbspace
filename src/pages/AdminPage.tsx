import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Hourglass,
  LayoutDashboard,
  MessageSquare,
  Printer,
  ShieldCheck,
  Star,
  TrendingUp,
  User,
  Wrench,
} from 'lucide-react'
import type { Reservation, ReservationFeedback, Room } from '../types'
import { buildings } from '../data/campus'
import { useApp } from '../context/AppContext'
import { addDaysISO, formatDateLong, todayISO } from '../lib/date'

/* ── Util laporan ──────────────────────────────────────────────────────────── */

/** Escape sel CSV (kutip ganda) — delimiter `;` agar Excel locale id langsung rapi. */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** Escape teks untuk tabel HTML laporan PDF. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Label status berbahasa untuk laporan (paralel dengan halaman Reservasi Saya). */
function statusLabelId(status: Reservation['status']): string {
  const map: Record<Reservation['status'], string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  }
  return map[status]
}

/** Kata kunci keluhan fasilitas — ulasan bernada kendala diberi border merah. */
const ISSUE_PATTERN =
  /(rusak|mati|bocor|buram|berisik|kotor|error|gagal|pecah|lepas|bau|tidak (bisa|berfungsi|menyala|dingin)|kurang dingin)/i

function isIssueFeedback(entry: ReservationFeedback): boolean {
  // Rating rendah = kendala. Rating tinggi hanya kendala bila memuat kata keras
  // (agar pujian seperti "sudah lebih dingin" tidak salah ditandai).
  if (entry.rating !== null && entry.rating <= 3) return true
  return ISSUE_PATTERN.test(entry.message)
}

/** Deret bintang kecil untuk kartu ulasan admin. */
function FeedbackStars({ rating }: { rating: number | null }) {
  return (
    <span
      className="feedback-card__stars"
      aria-label={rating ? `Rating ${rating} dari 5` : 'Tanpa rating'}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={13}
          aria-hidden="true"
          className={rating && value <= rating ? 'is-on' : ''}
        />
      ))}
    </span>
  )
}

/** Format waktu unggah ulasan (tanggal + jam lokal). */
function feedbackTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Baris nilai CSV untuk satu reservasi. */
function reservationRow(reservation: Reservation): (string | number)[] {
  const building = buildings.find((item) => item.id === reservation.buildingId)
  return [
    reservation.code,
    reservation.date,
    reservation.startTime.replace(':', '.'),
    reservation.endTime.replace(':', '.'),
    reservation.roomName,
    reservation.roomCode,
    building?.shortName ?? reservation.buildingId,
    reservation.requesterName,
    reservation.requesterNim,
    statusLabelId(reservation.status),
    reservation.rejectionReason ?? '—',
    reservation.purpose,
    reservation.attendeeCount,
  ]
}

const CSV_HEADER = [
  'Kode',
  'Tanggal',
  'Mulai',
  'Selesai',
  'Ruangan',
  'Kode Ruang',
  'Gedung',
  'Pemohon',
  'NIM',
  'Status',
  'Alasan Penolakan',
  'Keperluan',
  'Jumlah Peserta',
] as const

export function AdminPage() {
  const { reservations, rooms, maintenance, setRoomMaintenance, isAdmin, notify, feedback } =
    useApp()

  const [exportOpen, setExportOpen] = useState(false)
  /** Ruangan yang sedang berpindah status — matikan switch saat proses. */
  const [busyRoom, setBusyRoom] = useState<string | null>(null)
  /** Tab dashboard admin: ringkasan operasional atau ulasan mahasiswa. */
  const [tab, setTab] = useState<'ringkasan' | 'kritik'>('ringkasan')

  const now = new Date()
  const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(now)
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  /** Rekap bulan berjalan — basis Export Laporan. */
  const monthReservations = useMemo(
    () => reservations.filter((reservation) => reservation.date.startsWith(ym)),
    [reservations, ym],
  )

  /** Pasangan [statistik angka, kanal warna tone] untuk strip ringkasan. */
  const stats = useMemo(
    () => [
      { icon: TrendingUp, tone: 'navy', label: 'Total pengajuan', value: reservations.length },
      {
        icon: Hourglass,
        tone: 'amber',
        label: 'Menunggu verifikasi',
        value: reservations.filter((item) => item.status === 'pending').length,
      },
      {
        icon: CheckCircle2,
        tone: 'green',
        label: `Disetujui bulan ${monthLabel.split(' ')[0]}`,
        value: monthReservations.filter((item) => item.status === 'approved').length,
      },
      {
        icon: Wrench,
        tone: 'red',
        label: 'Ruang ditutup',
        value: Object.keys(maintenance).length,
      },
    ],
    [reservations, monthReservations, maintenance, monthLabel],
  )

  /** Indikator Beban Ruangan: 4 ruangan tersibuk 7 hari terakhir. */
  const weekUtilization = useMemo(() => {
    const cutoff = addDaysISO(todayISO(), -6)
    const counts = new Map<string, { name: string; code: string; n: number }>()
    for (const reservation of reservations) {
      if (reservation.date < cutoff) continue
      if (reservation.status === 'cancelled' || reservation.status === 'rejected') continue
      const entry = counts.get(reservation.roomId) ?? {
        name: reservation.roomName,
        code: reservation.roomCode,
        n: 0,
      }
      entry.n += 1
      counts.set(reservation.roomId, entry)
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 4)
  }, [reservations])
  const utilMax = weekUtilization[0]?.n ?? 1

  /** Ringkasan ulasan: total, rata-rata rating, dan jumlah kendala. */
  const feedbackSummary = useMemo(() => {
    const rated = feedback.filter((entry) => entry.rating !== null)
    const sum = rated.reduce((total, entry) => total + (entry.rating ?? 0), 0)
    return {
      total: feedback.length,
      issues: feedback.filter(isIssueFeedback).length,
      average: rated.length ? (sum / rated.length).toFixed(1) : '—',
      ratedCount: rated.length,
    }
  }, [feedback])

  /** Export Laporan → Excel (CSV). */
  const handleExportCsv = useCallback(() => {
    setExportOpen(false)
    const rows = monthReservations.length ? monthReservations : reservations
    const lines = [CSV_HEADER.map(csvCell).join(';')]
    for (const reservation of rows) {
      lines.push(reservationRow(reservation).map(csvCell).join(';'))
    }
    const csv = `\ufeff${lines.join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download =
      monthReservations.length > 0
        ? `laporan-peminjaman-${ym}.csv`
        : 'laporan-peminjaman-semua.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    notify({
      tone: 'success',
      title: 'Laporan Excel terunduh',
      message: `${rows.length} baris rekap peminjaman siap dibuka di Excel.`,
    })
  }, [monthReservations, reservations, ym, notify])

  /** Export Laporan → PDF (via dialog cetak browser, tanpa dependensi). */
  const handleExportPdf = useCallback(() => {
    setExportOpen(false)
    const rows = monthReservations.length ? monthReservations : reservations
    const windowRef = window.open('', 'idb-print', 'width=940,height=780')
    if (!windowRef) {
      notify({
        tone: 'error',
        title: 'Gagal membuka laporan PDF',
        message: 'Popup diblokir browser. Izinkan popup untuk halaman ini lalu coba lagi.',
      })
      return
    }
    const bodyRows = rows
      .map(
        (reservation) => `<tr>
          <td><strong>${esc(reservation.code)}</strong></td>
          <td>${esc(formatDateLong(reservation.date))}</td>
          <td>${esc(reservation.startTime)}–${esc(reservation.endTime)}</td>
          <td>${esc(reservation.roomName)} (${esc(reservation.roomCode)})</td>
          <td>${esc(reservation.requesterName)}<br><small>${esc(reservation.requesterNim)}</small></td>
          <td>${esc(statusLabelId(reservation.status))}</td>
          <td>${esc(reservation.rejectionReason ?? '')}</td>
          <td>${esc(reservation.purpose)}</td>
        </tr>`,
      )
      .join('')
    windowRef.document.write(
      `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Laporan Peminjaman Ruang IDB Bali</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 36px; }
  .kop { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #f26522; padding-bottom: 14px; }
  .kop__logo { width: 52px; height: 52px; border-radius: 12px; background: #0b2a5b; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: .8rem; letter-spacing: .04em; }
  .kop b { display: block; font-size: 1.05rem; color: #0b2a5b; }
  .kop small { color: #6b7280; }
  h1 { font-size: 1rem; margin: 20px 0 4px; color: #111827; }
  .meta { font-size: .78rem; color: #6b7280; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: .7rem; }
  th { background: #0b2a5b; color: #fff; text-align: left; padding: 8px 8px; }
  td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  footer { margin-top: 22px; font-size: .68rem; color: #9ca3af; display: flex; justify-content: space-between; }
</style></head><body>
<div class="kop">
  <div class="kop__logo">IDB</div>
  <div><b>Institut Digital Business Bali</b><small>Unit Kemahasiswaan — Rekapitulasi Peminjaman Ruang</small></div>
</div>
<h1>Laporan Bulanan Peminjaman Ruang — ${esc(monthLabel)}</h1>
<p class="meta">Total ${rows.length} pengajuan${monthReservations.length ? '' : ' (belum ada data bulan ini — seluruh riwayat disertakan)'} · dicetak ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<table><thead><tr>
  <th>Kode</th><th>Tanggal</th><th>Waktu</th><th>Ruangan</th><th>Pemohon</th><th>Status</th><th>Alasan Penolakan</th><th>Keperluan</th>
</tr></thead><tbody>${bodyRows}</tbody></table>
<footer><span>Dicetak dari Panel Admin Kemahasiswaan IDB Space</span><span>Institut Digital Business Bali</span></footer>
</body></html>`,
    )
    windowRef.document.close()
    windowRef.focus()
    windowRef.print()
  }, [monthReservations, reservations, monthLabel, notify])

  /** Status Kontrol Ruangan: toggle aktiv/maintenance satu ruangan. */
  const handleToggle = useCallback(
    async (room: Room, closed: boolean) => {
      setBusyRoom(room.id)
      try {
        await setRoomMaintenance(room.id, closed)
        notify({
          tone: closed ? 'info' : 'success',
          title: closed ? `${room.name} ditutup` : `${room.name} kembali aktif`,
          message: closed
            ? `${room.code} terkunci — mahasiswa tidak dapat mengajukan reservasi ruangan ini.`
            : `${room.code} bisa direservasi mahasiswa lagi.`,
        })
      } finally {
        setBusyRoom(null)
      }
    },
    [setRoomMaintenance, notify],
  )

  // Guard: panel khusus admin — akses mahasiswa langsung dipantulkan ke beranda
  // (link nav "Panel Admin" juga hanya dirender untuk admin).
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page">
      <div className="container page__inner">
        <div className="page-head">
          <Link className="back-link" to="/">
            <ArrowLeft size={15} aria-hidden="true" />
            Beranda
          </Link>
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Tim Kemahasiswaan IDB Bali
          </span>
          <h1 className="page-title">Panel Admin Kemahasiswaan.</h1>
          <p className="page-lead">
            Kendali penuh peminjaman ruang: status ruangan, beban utilitas minggu ini, dan
            rekap laporan bulanan dalam satu halaman.
          </p>
        </div>

        {/* Toolbar utama: Export Laporan + indikator mode */}
        <div className="admin-toolbar">
          <div className="export-wrap">
            <button
              type="button"
              className="btn btn--primary"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((open) => !open)}
            >
              <Download size={16} aria-hidden="true" />
              Export Laporan (Excel/PDF)
            </button>
            {exportOpen && (
              <div className="export-menu" role="menu" aria-label="Pilih format laporan">
                <button
                  type="button"
                  className="export-menu__item"
                  role="menuitem"
                  onClick={handleExportCsv}
                >
                  <FileSpreadsheet size={15} aria-hidden="true" />
                  Excel (CSV) — rekap {monthReservations.length > 0 ? `bulan ${monthLabel}` : 'semua data'}
                </button>
                <button
                  type="button"
                  className="export-menu__item"
                  role="menuitem"
                  onClick={handleExportPdf}
                >
                  <Printer size={15} aria-hidden="true" />
                  PDF — kop resmi + tabel, siap cetak
                </button>
                <p className="export-menu__foot">
                  {monthReservations.length} reservasi bulan {monthLabel} ·
                  {' '}{monthReservations.filter((item) => item.status === 'pending').length} menunggu
                </p>
              </div>
            )}
          </div>
          <span className="rsv-admin-tag">
            <ShieldCheck size={14} aria-hidden="true" />
            Mode tim Kemahasiswaan
          </span>
        </div>

        {/* Tab dashboard: ringkasan operasional ⇄ ulasan mahasiswa */}
        <nav className="admin-tabs" role="tablist" aria-label="Menu dashboard admin">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ringkasan'}
            className={`admin-tab${tab === 'ringkasan' ? ' is-active' : ''}`}
            onClick={() => setTab('ringkasan')}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Ringkasan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'kritik'}
            className={`admin-tab${tab === 'kritik' ? ' is-active' : ''}`}
            onClick={() => setTab('kritik')}
          >
            <MessageSquare size={16} aria-hidden="true" />
            Kritik &amp; Saran
            {feedback.length > 0 && (
              <span className="admin-tab__count" aria-label={`${feedback.length} ulasan`}>
                {feedback.length}
              </span>
            )}
          </button>
        </nav>

        {tab === 'kritik' ? (
          <section className="admin-section feedback-section">
            <h2 className="admin-h2">
              <MessageSquare size={18} aria-hidden="true" />
              Kritik &amp; Saran Mahasiswa
            </h2>
            <p className="admin-sub">
              Ulasan pasca-pemakaian dari reservasi berstatus <strong>Selesai</strong> — tampil
              terbaru lebih dulu, lengkap dengan identitas pengirim.
            </p>

            <div className="feedback-summary">
              <div className="feedback-summary__item">
                <span>Total ulasan</span>
                <strong>{feedbackSummary.total}</strong>
              </div>
              <div className="feedback-summary__item">
                <span>Rata-rata rating</span>
                <strong>
                  <Star size={15} aria-hidden="true" className="feedback-summary__star" />
                  {feedbackSummary.average}
                  <em>{feedbackSummary.ratedCount} rating</em>
                </strong>
              </div>
              <div className="feedback-summary__item feedback-summary__item--issue">
                <span>Kendala fasilitas</span>
                <strong>{feedbackSummary.issues}</strong>
              </div>
            </div>

            {feedback.length === 0 ? (
              <div className="feedback-empty">
                <MessageSquare size={28} aria-hidden="true" />
                <h3>Belum ada ulasan masuk.</h3>
                <p>
                  Mahasiswa dapat menekan <strong>Beri Ulasan/Lapor Kendala</strong> pada kartu
                  reservasi berstatus Selesai di halaman Reservasi Saya.
                </p>
              </div>
            ) : (
              <div className="feedback-list">
                {feedback.map((entry) => {
                  const issue = isIssueFeedback(entry)
                  return (
                    <article
                      key={entry.reservationId}
                      className={`feedback-card${issue ? ' feedback-card--issue' : ''}`}
                    >
                      <header className="feedback-card__head">
                        <div className="feedback-card__room">
                          <strong>{entry.roomName}</strong>
                          <span>
                            {entry.roomCode} · {formatDateLong(entry.date)}
                          </span>
                          <span>
                            {entry.startTime.replace(':', '.')}–
                            {entry.endTime.replace(':', '.')}
                          </span>
                        </div>
                        <span
                          className={`feedback-tone${issue ? ' feedback-tone--issue' : ' feedback-tone--positive'}`}
                        >
                          {issue ? (
                            <>
                              <AlertTriangle size={12} aria-hidden="true" />
                              Kendala fasilitas
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} aria-hidden="true" />
                              Apresiasi / saran
                            </>
                          )}
                        </span>
                      </header>

                      <p className="feedback-card__message">“{entry.message}”</p>

                      <footer className="feedback-card__foot">
                        <span className="feedback-card__person">
                          <User size={13} aria-hidden="true" />
                          <strong>{entry.reviewerName}</strong>
                          <em>{entry.reviewerNim}</em>
                        </span>
                        <span className="feedback-card__meta">
                          <FeedbackStars rating={entry.rating} />
                          <span className="feedback-card__time">
                            {feedbackTimestamp(entry.createdAt)}
                          </span>
                        </span>
                      </footer>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Ringkasan angka */}
        <div className="admin-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={`stat-card stat-card--${stat.tone}`}>
              <span className="stat-card__icon" aria-hidden="true">
                <stat.icon size={20} />
              </span>
              <span className="stat-card__label">{stat.label}</span>
              <span className="stat-card__value">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Indikator Beban Ruangan */}
        <section className="admin-section">
          <h2 className="admin-h2">
            <TrendingUp size={18} aria-hidden="true" />
            Beban Ruangan Minggu Ini
          </h2>
          <p className="admin-sub">
            Ruangan paling sering dipinjam 7 hari terakhir (pengajuan aktif &amp; selesai).
          </p>
          {weekUtilization.length === 0 ? (
            <p className="util-empty">Belum ada aktivitas peminjaman minggu ini.</p>
          ) : (
            <div className="util-grid">
              {weekUtilization.map((item, index) => (
                <div key={item.code} className="util-card">
                  <span className="util-card__rank" aria-hidden="true">
                    #{index + 1}
                  </span>
                  <div className="util-card__head">
                    <strong>{item.name}</strong>
                    <span className="util-card__code">{item.code}</span>
                  </div>
                  <div
                    className="util-card__bar"
                    role="img"
                    aria-label={`${item.name}: ${item.n} pengajuan minggu ini`}
                  >
                    <span style={{ width: `${Math.round((item.n / utilMax) * 100)}%` }} />
                  </div>
                  <span className="util-card__count">{item.n} pengajuan minggu ini</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Status Kontrol Ruangan */}
        <section className="admin-section">
          <h2 className="admin-h2">
            <Wrench size={18} aria-hidden="true" />
            Status Kontrol Ruangan
          </h2>
          <p className="admin-sub">
            Geser switch untuk menutup ruangan — mahasiswa tidak dapat memilihnya selama
            maintenance.
          </p>
          <ul className="admin-rooms">
            {rooms.map((room) => {
              const closed = Boolean(maintenance[room.id])
              const building = buildings.find((item) => item.id === room.buildingId)
              return (
                <li key={room.id} className={`admin-room${closed ? ' admin-room--closed' : ''}`}>
                  <img
                    className="admin-room__thumb"
                    src={room.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                  <div className="admin-room__info">
                    <strong>{room.name}</strong>
                    <span>
                      {room.code} · {building?.name} · {room.floor} · {room.capacity} orang
                    </span>
                  </div>
                  <span className="admin-room__state">{closed ? 'Maintenance' : 'Aktif'}</span>
                  <label
                    className="switch"
                    aria-label={
                      closed
                        ? `Buka kembali ${room.name}`
                        : `Tutup ${room.name} untuk maintenance`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={closed}
                      disabled={busyRoom === room.id}
                      onChange={(event) => {
                        void handleToggle(room, event.target.checked)
                      }}
                    />
                    <span className="switch__track">
                      <span className="switch__thumb" />
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
          </>
        )}
      </div>
    </div>
  )
}
