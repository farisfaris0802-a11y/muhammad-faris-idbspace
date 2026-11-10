import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import type { Reservation, StudentProfile } from '../../types'
import { buildings } from '../../data/campus'
import { formatDateLong } from '../../lib/date'

/**
 * Modal "Surat Izin Penggunaan Ruangan" — meniru kertas A4
 * berbasis Surat Dispensasi Kemahasiswaan IDB Bali.
 * Diberi Tailwind CSS (lewat letter.css, di-scoped pada fitur ini)
 * dan sebisa mungkin satu layar = satu lembar A4 (794×1123 px @96dpi).
 */

interface PermitLetterModalProps {
  reservation: Reservation
  currentUser: StudentProfile
  onClose: () => void
}

/**
 * Placeholder QR Code pass — grid modul 21×21 deterministik dari kode reservasi
 * (visual QR asli; validasi diarahkan ke petugas keamanan).
 */
function QrPass({ seed }: { seed: string }) {
  const { rects, size } = useMemo(() => {
    // PRNG sederhana (LCG) — pola sama untuk kode yang sama.
    let state = 0x811c9dc5
    for (const ch of seed) {
      state ^= ch.charCodeAt(0)
      state = Math.imul(state, 16777619) >>> 0
    }
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 2 ** 32
    }

    const modules: { x: number; y: number }[] = []
    const size = 21
    const inFinder = (x: number, y: number) =>
      (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (inFinder(x, y)) continue
        if (next() < 0.44) modules.push({ x, y })
      }
    }

    const rect = (x: number, y: number) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111827" />
    )
    const finder = (baseX: number, baseY: number) => (
      <Fragment key={`finder-${baseX}-${baseY}`}>
        <rect x={baseX} y={baseY} width={7} height={7} fill="#111827" />
        <rect x={baseX + 1} y={baseY + 1} width={5} height={5} fill="#ffffff" />
        <rect x={baseX + 2} y={baseY + 2} width={3} height={3} fill="#111827" />
      </Fragment>
    )

    return {
      rects: [
        finder(0, 0),
        finder(size - 7, 0),
        finder(0, size - 7),
        ...modules.map((module) => rect(module.x, module.y)),
      ],
      size,
    }
  }, [seed])

  return (
    <div className="flex items-start gap-3" aria-label="QR Code pass reservasi">
      <div className="rounded-md border-2 border-black bg-white p-[5px] leading-none">
        <svg width={76} height={76} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
          {rects}
        </svg>
      </div>
      <div className="space-y-[2px] pt-[2px] font-letter text-[10.5px] leading-snug text-[#334155]">
        <p className="text-[11px] font-bold text-black">Pass Reservasi {seed}</p>
        <p className="font-semibold">Scan validasi keamanan</p>
        <p>Tunjukkan surat ini kepada bagian keamanan saat memasuki ruangan.</p>
      </div>
    </div>
  )
}

export function PermitLetterModal({ reservation, currentUser, onClose }: PermitLetterModalProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  /** Scale-to-fit: pada layar sempit (<794px) kertas A4 diperkecil dengan CSS zoom. */
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const updateZoom = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const width = wrap.clientWidth
      setZoom(width < 794 ? width / 794 : 1)
    }
    updateZoom()
    window.addEventListener('resize', updateZoom)
    return () => window.removeEventListener('resize', updateZoom)
  }, [])

  useEffect(() => {
    document.body.classList.add('printing-letter')
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.classList.remove('printing-letter')
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const building = buildings.find((item) => item.id === reservation.buildingId)

  return createPortal(
    <div
      className="letter-overlay fixed inset-0 z-[120] grid place-items-start justify-center overflow-y-auto bg-[rgba(4,12,26,0.62)] p-4 backdrop-blur-[6px] sm:place-items-center sm:p-7"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="letter-print-root relative">
        {/* Tombol cetak — melayang di luar area kertas */}
        <div className="no-print sticky top-0 z-20 mb-3 flex items-center justify-end gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#f26522] px-5 py-2.5 font-display text-sm font-bold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-[#d95315] active:translate-y-0"
            onClick={() => window.print()}
          >
            <Printer size={16} aria-hidden="true" />
            Cetak Surat
          </button>
          <button
            type="button"
            aria-label="Tutup surat"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 transition hover:bg-white/30"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Kertas A4 (dicocokkan lebar kontainer; di-zoom saat layar sempit) ── */}
        <div ref={wrapRef} className="mx-auto w-full max-w-[794px]">
          <div
            id="letter-paper"
            className="letter-paper relative mx-auto flex w-full flex-col overflow-hidden bg-white font-letter text-[#111827] shadow-2xl shadow-black/50"
            style={{ minHeight: '1123px', zoom }}
          >
          {/* Aksen lengkung biru muda di pojok kanan atas */}
          <div className="pointer-events-none absolute right-0 top-0 h-[120px] w-[220px]" aria-hidden="true">
            <svg viewBox="0 0 220 120" className="h-full w-full" preserveAspectRatio="none">
              <path d="M220,0 L90,0 C150,10 200,45 220,95 Z" fill="#5ea8d8" />
              <path d="M220,0 L130,0 C175,12 205,38 220,60 Z" fill="#2d6bb1" opacity="0.85" />
            </svg>
          </div>

          {/* ── Kop surat ─────────────────────────────────────────────── */}
          <header className="mx-[54px] flex items-center gap-5 border-b-2 border-[#0b3b7a] pt-8 pb-4">
            <img
              src="/images/idb-bali-mark.png"
              alt="Logo IDB Bali"
              className="h-[64px] w-[64px] shrink-0 object-contain"
            />
            <div className="h-[64px] w-px shrink-0 bg-[#9db6cf]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-letter text-[17px] font-bold leading-tight text-[#0b1f3a]">
                Institut Desain &amp; Bisnis Bali
              </p>
              <div className="mt-1 space-y-0.5 font-letter text-[10.5px] leading-snug text-[#334155]">
                <p>Jl. Tukad Batanghari No. 29, Panjer, Denpasar - Bali</p>
                <p>Telp. : 0361-8955648, Email : info@idbbali.ac.id</p>
                <p>Website : www.idbbali.ac.id</p>
              </div>
            </div>
          </header>

          {/* ── Isi surat ─────────────────────────────────────────────── */}
          <main className="flex flex-1 flex-col px-[54px] pt-7 pb-[120px]">
            <h2 className="text-center font-letter text-[15.5px] font-bold uppercase tracking-[0.02em] text-black underline decoration-1 underline-offset-4">
              Surat Izin Penggunaan Ruangan
            </h2>

            {/* Tabel informasi utama */}
            <table className="mt-5 w-full table-fixed border-collapse border-2 border-black font-letter text-[12.5px]">
              <tbody>
                <tr>
                  <td className="w-[130px] border-2 border-black px-2 py-[5px] font-bold">
                    Hari/Tanggal
                  </td>
                  <td className="border-2 border-black px-2 py-[5px]">
                    {formatDateLong(new Date().toISOString().slice(0, 10))}
                  </td>
                </tr>
                <tr>
                  <td className="border-2 border-black px-2 py-[5px] font-bold">Kepada</td>
                  <td className="border-2 border-black px-2 py-[5px] font-bold">
                    Bapak/Ibu Dosen / Bagian Keamanan (Satpam)
                  </td>
                </tr>
                <tr>
                  <td className="border-2 border-black px-2 py-[5px] font-bold">Dari</td>
                  <td className="border-2 border-black px-2 py-[5px]">Kepala Bagian Kemahasiswaan</td>
                </tr>
                <tr>
                  <td className="border-2 border-black px-2 py-[5px] font-bold">Perihal</td>
                  <td className="border-2 border-black px-2 py-[5px] italic">
                    Izin Penggunaan Ruangan
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Pembuka */}
            <div className="mt-5 font-letter text-[13px] leading-[1.65] text-black">
              <p>Dengan hormat,</p>
              <p className="text-justify indent-[38px]">
                Sehubungan dengan pengajuan peminjaman fasilitas kampus, dengan ini kami
                memberikan izin penggunaan ruangan:
              </p>
            </div>

            {/* Rincian peminjaman */}
            <div className="ml-[86px] mt-4 grid w-[340px] grid-cols-[92px_16px_1fr] gap-y-[7px] font-letter text-[12.5px] text-black">
              <span className="font-bold">Ruangan</span>
              <span>:</span>
              <span>
                {reservation.roomName} ({reservation.roomCode}) — {building?.name}
                {building ? `, ${building.address}` : ''}
              </span>
              <span className="font-bold">Hari/Tanggal</span>
              <span>:</span>
              <span>{formatDateLong(reservation.date)}</span>
              <span className="font-bold">Waktu</span>
              <span>:</span>
              <span>
                {reservation.startTime.replace(':', '.')}-{reservation.endTime.replace(':', '.')} WITA
              </span>
              <span className="font-bold">Keperluan</span>
              <span>:</span>
              <span className="italic">{reservation.purpose}</span>
            </div>


            {/* Data mahasiswa */}
            <p className="mt-5 font-letter text-[13px] text-black">
              Adapun data mahasiswa penanggung jawab adalah sebagai berikut:
            </p>
            <table className="mt-3 w-full border-collapse border-2 border-black font-letter text-[12.5px]">
              <thead>
                <tr className="bg-[#f4f7fb]">
                  <th className="border-2 border-black px-2 py-[5px] text-center font-bold text-black">
                    Nama
                  </th>
                  <th className="border-2 border-black px-2 py-[5px] text-center font-bold text-black">
                    NIM
                  </th>
                  <th className="border-2 border-black px-2 py-[5px] text-center font-bold text-black">
                    Prodi
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-2 border-black px-2 py-[6px] text-center">{currentUser.name}</td>
                  <td className="border-2 border-black px-2 py-[6px] text-center">{currentUser.nim}</td>
                  <td className="border-2 border-black px-2 py-[6px] text-center">{currentUser.prodi}</td>
                </tr>
              </tbody>
            </table>

            {/* Penutup */}
            <p className="mr-2 mt-5 font-letter text-[13px] leading-[1.65] text-black">
              Demikian informasi ini kami sampaikan, atas perhatian dan permakluman Bapak/Ibu,
              kami ucapkan terima kasih.
            </p>

            {/* QR Code pass — pojok kiri bawah */}
            <div className="mt-[18px]">
              <QrPass seed={reservation.code} />
            </div>

            {/* Tanda tangan asli pejabat (scan resmi) */}
            <div className="mt-auto px-[6px] pt-10">
              <img
                src="/ttd-asli.jpg"
                alt="Tanda tangan Koordinator Bidang Kemahasiswaan dan Kepala Bagian Kemahasiswaan IDB Bali"
                className="mx-auto mt-8 w-full max-w-lg"
                draggable={false}
              />
            </div>
          </main>

          {/* ── Footer bar (absolute di dasar kertas) ──────────────────── */}
          <footer className="absolute bottom-0 left-0 right-0">
            <div className="flex items-stretch pl-4">
              <div className="flex flex-1 items-center bg-[#0b2a5b] px-5 py-[7px]">
                <span className="font-letter text-[12px] italic text-white/90">
                  Empowering People To Be Creative.
                </span>
              </div>
              <div className="flex items-center justify-center bg-[#f26522] px-4 py-[7px]">
                <span className="font-letter text-[12px] font-semibold text-white">
                  www.idbbali.ac.id
                </span>
              </div>
            </div>
          </footer>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

