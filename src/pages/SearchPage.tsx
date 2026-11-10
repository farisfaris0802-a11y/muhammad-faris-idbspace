import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, MapPin, Search, ShieldCheck, Users, Wrench, X } from 'lucide-react'
import type { BuildingId, Room, RoomCategory } from '../types'
import { buildings, roomCategoryLabel, rooms } from '../data/campus'
import { useApp } from '../context/AppContext'

type BuildingChoice = BuildingId | 'semua'
/** 'lainnya' mengelompokkan kategori di luar pill utama (ruang rapat & aula). */
type QuickCategory = 'semua' | RoomCategory | 'lainnya'

/** Estimasi kapasitas gaya "20–30 orang" (floor 70% ± dibulatkan ke kelipatan 5). */
const capacityRange = (capacity: number): string => {
  const min = Math.max(6, Math.round((capacity * 0.7) / 5) * 5)
  return min >= capacity ? `${capacity} orang` : `${min}–${capacity} orang`
}

/** Pill kategori di Search & Filter Bar (sesuai opsi yang diminta). */
const CATEGORY_PILLS: ReadonlyArray<{ id: QuickCategory; label: string }> = [
  { id: 'semua', label: 'Semua' },
  { id: 'class', label: 'Ruang Kelas' },
  { id: 'lab', label: 'Laboratorium' },
  { id: 'studio', label: 'Studio' },
  { id: 'lainnya', label: 'Lainnya' },
]

export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser, maintenance, isAdmin } = useApp()
  const roomParam = params.get('ruang')
  /** Nama panggilan untuk sapaan hero (kata terakhir nama lengkap). */
  const greetingName = currentUser.name.split(' ').slice(-1)[0]

  const initialBuilding = params.get('gedung') as BuildingChoice | null
  const initialsRoom = rooms.find((room) => room.id === roomParam)
  const [buildingChoice, setBuildingChoice] = useState<BuildingChoice>(
    initialBuilding ?? initialsRoom?.buildingId ?? 'semua',
  )
  /** State filter kategori untuk Search & Filter Bar di atas grid. */
  const [selectedCategory, setSelectedCategory] = useState<QuickCategory>('semua')
  /** State teks pencarian nama ruangan (case-insensitive). */
  const [searchQuery, setSearchQuery] = useState('')
  /** Kartu ruangan yang sedang dibuka di Room Details Modal. */
  const [detailRoom, setDetailRoom] = useState<Room | null>(null)

  const filteredRooms = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    return rooms.filter((room) => {
      if (buildingChoice !== 'semua' && room.buildingId !== buildingChoice) return false
      if (selectedCategory === 'lainnya') {
        if (room.category !== 'meeting' && room.category !== 'hall') return false
      } else if (selectedCategory !== 'semua' && room.category !== selectedCategory) {
        return false
      }
      if (needle && !`${room.name} ${room.code}`.toLowerCase().includes(needle)) {
        return false
      }
      return true
    })
  }, [buildingChoice, selectedCategory, searchQuery])

  const resultLabel =
    buildingChoice === 'semua'
      ? 'Semua gedung'
      : buildings.find((building) => building.id === buildingChoice)?.name

  return (
    <div className="page search-page">
      <div className="container page__inner">
        <div className="page-head">
          <Link className="back-link" to="/">
            <ArrowLeft size={15} aria-hidden="true" />
            Beranda
          </Link>

          {/* Hero banner — sapaan + judul utama di atas gradien navy */}
          <section className="search-hero">
            <svg
              className="search-hero__ornament"
              viewBox="0 0 280 220"
              preserveAspectRatio="xMaxYMid slice"
              aria-hidden="true"
            >
              <circle cx="225" cy="30" r="72" fill="rgba(94, 168, 216, 0.16)" />
              <circle
                cx="258"
                cy="150"
                r="96"
                fill="rgba(255, 255, 255, 0.05)"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.5"
              />
              <circle cx="168" cy="184" r="42" fill="rgba(242, 101, 34, 0.22)" />
              <path d="M150 220 L280 84 L280 220 Z" fill="rgba(255, 255, 255, 0.05)" />
              <circle cx="120" cy="40" r="3" fill="rgba(255, 255, 255, 0.25)" />
              <circle cx="86" cy="92" r="2.5" fill="rgba(255, 255, 255, 0.2)" />
              <circle cx="196" cy="118" r="2.5" fill="rgba(255, 255, 255, 0.25)" />
            </svg>
            <CalendarPlus
              size={132}
              className="search-hero__ghost"
              strokeWidth={1.2}
              aria-hidden="true"
            />
            <p className="search-hero__greeting">
              Halo, <strong>{greetingName}</strong>! <span aria-hidden="true">👋</span>
            </p>
            <h1 className="search-hero__title">Mau pinjam ruang apa hari ini?</h1>
            <p className="search-hero__sub">
              {rooms.length} ruang siap pinjam di {buildings.length} gedung — pilih satu,
              cek fasilitasnya, lalu kirim pengajuan reservasi tanpa perlu antre di front
              office.
            </p>
          </section>
        </div>

        <div className="search-filters" role="group" aria-label="Filter gedung">
          <div className="filter-tabs" role="tablist" aria-label="Filter gedung">
            {(['semua', 'A', 'C'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                className={`filter-tab${buildingChoice === choice ? ' is-active' : ''}`}
                aria-pressed={buildingChoice === choice}
                onClick={() => setBuildingChoice(choice)}
              >
                <span className="filter-tab__letter">{choice === 'semua' ? '✦' : choice}</span>
                <span className="filter-tab__label">
                  {choice === 'semua' ? 'Semua gedung' : `Gedung ${choice}`}
                  <small>
                    {choice === 'semua'
                      ? `${rooms.length} ruang`
                      : `${rooms.filter((room) => room.buildingId === choice).length} ruang`}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Bar — tepat di atas grid daftar ruangan. */}
        <div className="search-bar" role="search" aria-label="Pencarian & filter kategori">
          <label className="search-bar__field">
            <Search size={17} aria-hidden="true" />
            <input
              className="search-bar__input"
              type="search"
              placeholder="Cari nama ruangan... (misal: Studio Pola)"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Cari nama ruangan"
            />
          </label>

          <div className="search-bar__pills" role="group" aria-label="Filter kategori ruangan">
            {CATEGORY_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                className={`cat-pill${selectedCategory === pill.id ? ' is-active' : ''}`}
                aria-pressed={selectedCategory === pill.id}
                onClick={() => setSelectedCategory(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <p className="search-result-count" role="status">
          {filteredRooms.length} ruang ditemukan · {resultLabel}
          {params.get('tanggal') && (
            <span> · untuk tanggal {params.get('tanggal')}</span>
          )}
        </p>

        {filteredRooms.length === 0 ? (
          <div className="search-empty">
            <h2>Maaf, ruangan yang kamu cari belum tersedia.</h2>
            <p>Coba ubah kata kunci atau pilih kategori dan gedung yang lain.</p>
          </div>
        ) : (
          <ul className="room-grid">
            {filteredRooms.map((room) => (
              <SearchRoomCard
                key={room.id}
                room={room}
                highlighted={room.id === roomParam}
                locked={Boolean(maintenance[room.id])}
                adminMode={isAdmin}
                onOpenDetails={() => setDetailRoom(room)}
              />
            ))}
          </ul>
        )}
      </div>

      {detailRoom && (
        <RoomDetailsModal
          room={detailRoom}
          prevented={Boolean(maintenance[detailRoom.id])}
          adminMode={isAdmin}
          onClose={() => setDetailRoom(null)}
          onContinue={() => {
            // Ruangan ditutup (Status Kontrol Ruangan) tidak boleh dipesan.
            if (maintenance[detailRoom.id]) return
            // Role-based access: mengajukan reservasi hanya untuk mahasiswa.
            if (isAdmin) return
            const targetId = detailRoom.id
            setDetailRoom(null)
            // Lanjut ke formulir reservasi dengan konteks ruangan terbawa.
            navigate(`/reservasi/baru?ruang=${targetId}`)
          }}
        />
      )}
    </div>
  )
}

interface SearchRoomCardProps {
  room: Room
  highlighted?: boolean
  /** true saat admin menutup ruangan (maintenance) — kartu tampil terkunci. */
  locked?: boolean
  /** Role-based access: mode admin melihat CTA detail, bukan CTA pesan. */
  adminMode?: boolean
  onOpenDetails: () => void
}

function SearchRoomCard({
  room,
  highlighted = false,
  locked = false,
  adminMode = false,
  onOpenDetails,
}: SearchRoomCardProps) {
  const building = buildings.find((building) => building.id === room.buildingId)
  const category = roomCategoryLabel[room.category]

  return (
    <li className={`find-card${highlighted ? ' find-card--highlight' : ''}`}>
      <button
        type="button"
        className="find-card__media"
        onClick={onOpenDetails}
        aria-label={`Lihat detail ${room.name} (${room.code})`}
      >
        <img
          className="find-card__img"
          src={room.imageUrl}
          alt={`Foto ${room.name} IDB Bali`}
          style={room.imagePosition ? { objectPosition: room.imagePosition } : undefined}
        />
        <span className="find-card__badge">{building?.name}</span>
        <span className="find-card__code">{room.code}</span>
        {locked && (
          <span className="find-card__maintenance">
            <Wrench size={12} aria-hidden="true" />
            Maintenance
          </span>
        )}
      </button>

      <div className="find-card__body">
        <span className="find-card__category">{category}</span>
        <h2 className="find-card__name">{room.name}</h2>
        <p className="find-card__desc">{room.description}</p>

        <ul className="find-card__meta" aria-label="Detail ruangan">
          <li>
            <MapPin size={15} aria-hidden="true" />
            {/* Lokasi: gedung + lantai */}
            {building?.name} · {room.floor}
          </li>
          <li>
            <Users size={15} aria-hidden="true" />
            {/* Estimasi kapasitas */}
            {capacityRange(room.capacity)}
          </li>
        </ul>

        <button
          type="button"
          className="find-card__cta btn btn--primary"
          onClick={onOpenDetails}
          disabled={locked}
          aria-label={`Detail & pesan ruangan ${room.name} (${room.code})`}
        >
          {locked ? (
            <>
              <Wrench size={16} aria-hidden="true" />
              Maintenance
            </>
          ) : adminMode ? (
            <>
              <Search size={16} aria-hidden="true" />
              Lihat Detail
            </>
          ) : (
            <>
              <CalendarPlus size={16} aria-hidden="true" />
              Pesan Ruangan
            </>
          )}
        </button>
      </div>
    </li>
  )
}

/** Emoji ikon fasilitas — cocokkan kata kunci nama fasilitas ruangan. */
function facilityEmoji(facility: string): string {
  const mappings: ReadonlyArray<[RegExp, string]> = [
    [/proyektor|proyeksi/i, '📽️'],
    [/\bac\b/i, '❄️'],
    [/wifi|jaringan|internet|\blan\b/i, '📶'],
    [/\bpc\b|imac|komputer|laptop/i, '🖥️'],
    [/adobe|creative|software|aplikasi/i, '🎨'],
    [/sound|audio|speaker/i, '🔊'],
    [/kamera|mirrorless|foto/i, '📷'],
    [/softbox|lighting|backdrop|cahaya/i, '💡'],
    [/whiteboard|papan|cetak/i, '📋'],
    [/manekin|jahit|busana|pola|mode/i, '✂️'],
    [/meja|kursi/i, '🪑'],
    [/printer|plotter|cetak/i, '🖨️'],
    [/panggung|mikrofon/i, '🎤'],
    [/bahan|material|kain/i, '🧵'],
  ]
  for (const [pattern, emoji] of mappings) {
    if (pattern.test(facility)) return emoji
  }
  return '📦'
}

interface RoomDetailsModalProps {
  room: Room
  prevented?: boolean
  /** Role-based access: admin tidak diminta mengajukan reservasi. */
  adminMode?: boolean
  onClose: () => void
  /** Lanjut: tutup modal lalu buka formulir reservasi ruangan terkait. */
  onContinue: () => void
}

/**
 * Room Details Modal halaman Cari Ruang — preview fasilitas & deskripsi
 * sebelum pengguna diarahkan ke formulir reservasi.
 */
function RoomDetailsModal({
  room,
  prevented = false,
  adminMode = false,
  onClose,
  onContinue,
}: RoomDetailsModalProps) {
  const building = buildings.find((item) => item.id === room.buildingId)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      className="room-detail-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="room-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-detail-title"
      >
        {/* Header: foto ruangan lebar (aspect-video), ujung mengikuti radius modal */}
        <div className="room-detail__media">
          <img
            src={room.imageUrl}
            alt={`Foto ${room.name} IDB Bali`}
            style={room.imagePosition ? { objectPosition: room.imagePosition } : undefined}
          />
          <button
            type="button"
            className="room-detail__close"
            onClick={onClose}
            aria-label="Tutup detail ruangan"
            autoFocus
          >
            <X size={17} />
          </button>
        </div>

        <div className="room-detail__body">
          <span className="room-detail__eyebrow">
            {roomCategoryLabel[room.category]} · {room.code}
          </span>
          <h3 id="room-detail-title" className="room-detail__name">
            {room.name}
          </h3>

          <div className="room-detail__meta">
            <span className="room-detail__badge">
              <Users size={14} aria-hidden="true" />
              Kapasitas: {room.capacity} orang
            </span>
            <span className="room-detail__badge">
              <MapPin size={14} aria-hidden="true" />
              {building?.name} · {room.floor}
            </span>
            {prevented && (
              <span className="room-detail__badge room-detail__badge--warn">
                <Wrench size={14} aria-hidden="true" />
                Maintenance
              </span>
            )}
          </div>

          <div className="room-detail__section">
            <h4 className="room-detail__section-title">Fasilitas Ruangan</h4>
            <ul className="room-detail__amenities" aria-label="Daftar fasilitas">
              {room.facilities.map((facility) => (
                <li key={facility} className="room-detail__amenity">
                  <span aria-hidden="true">{facilityEmoji(facility)}</span>
                  {facility}
                </li>
              ))}
            </ul>
          </div>

          <div className="room-detail__section">
            <h4 className="room-detail__section-title">Deskripsi</h4>
            <p className="room-detail__desc">{room.description}</p>
            <p className="room-detail__desc">
              Ruangan ini cocok digunakan untuk kegiatan perkuliahan, presentasi tugas
              akhir, atau rapat kepanitiaan mahasiswa IDB Bali.
            </p>
          </div>

          <div className="room-detail__actions">
            {adminMode && !prevented && (
              <p className="room-detail__notice room-detail__notice--admin" role="status">
                <ShieldCheck size={15} aria-hidden="true" />
                Mode Admin — ajukan reservasi hanya mahasiswa. Kelola pengajuan &amp; status
                ruangan di Panel Admin.
              </p>
            )}
            {prevented && (
              <p className="room-detail__notice" role="status">
                <Wrench size={15} aria-hidden="true" />
                Ruangan ini sedang ditutup untuk maintenance — belum bisa direservasi.
              </p>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Kembali
            </button>
            {!adminMode && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={onContinue}
                disabled={prevented}
              >
                <CalendarPlus size={16} aria-hidden="true" />
                {prevented ? 'Tidak Tersedia' : 'Lanjutkan Reservasi'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
