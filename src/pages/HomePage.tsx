import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CalendarDays, Check, Clock, MapPin, Sparkles, Tag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  buildings as fallbackBuildings,
  campus,
  rooms as fallbackRooms,
} from '../data/campus'
import type { BuildingId } from '../types'
import { todayISO } from '../lib/date'
import { RoomCard } from '../components/ui/RoomCard'

export function HomePage() {
  const { buildings, rooms, availabilityByRoom } = useApp()
  const navigate = useNavigate()
  const [date, setDate] = useState(todayISO())
  const [buildingChoice, setBuildingChoice] = useState<BuildingId | 'semua'>('A')
  const heroRef = useRef<HTMLElement | null>(null)
  const parallaxRef = useRef<HTMLDivElement | null>(null)

  const buildingList = buildings.length > 0 ? buildings : fallbackBuildings
  const roomList = rooms.length > 0 ? rooms : fallbackRooms
  const today = todayISO()

  /** Ruangan favorit: hanya 3 data pertama dari API ruangan. */
  const featuredRooms = useMemo(() => roomList.slice(0, 3), [roomList])

  const totalRooms = roomList.length
  const categoryCount = new Set(roomList.map((room) => room.category)).size

  /**
   * Parallax lembut: lapisan foto bergeser lebih lambat daripada konten.
   * Pergeseran dibatasi agar crop tetap tipis dan gedung tidak keluar frame.
   */
  useEffect(() => {
    const hero = heroRef.current
    const layer = parallaxRef.current
    if (!hero || !layer) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0

    const update = () => {
      frame = 0
      const rect = hero.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const scrolled = Math.min(Math.max(-rect.top, 0), rect.height)
      layer.style.transform = `translate3d(0, ${(scrolled * 0.06).toFixed(2)}px, 0)`
    }

    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams({ tanggal: date })
    if (buildingChoice !== 'semua') params.set('gedung', buildingChoice)
    navigate(`/cari?${params.toString()}`)
  }

  return (
    <>
      <section className="hero hero--photo" ref={heroRef}>
        <div
          className="hero__media"
          role="img"
          aria-label="Gedung Institut Desain & Bisnis Bali"
        >
          <div className="hero__media-inner" ref={parallaxRef}>
            <div className="hero__media-img" />
          </div>
        </div>
        <div className="hero__scrim" aria-hidden="true" />
        <div className="hero__grain" aria-hidden="true" />

        <div className="container hero__inner">
          <div className="hero__copy">
            <span className="hero__kicker">
              <span className="hero__kicker-dot" aria-hidden="true" />
              Sistem Peminjaman Ruang <em>IDB Bali</em>
            </span>
            <h1 className="hero__title">
              Ruang yang tepat
              <br />
              untuk setiap <em>ide.</em>
            </h1>
            <p className="hero__lead">
              Studio, laboratorium, ruang kelas, sampai aula — cek ketersediaannya di dua
              gedung IDB Bali, lalu ajukan reservasi tanpa perlu antre di front office.
            </p>

            <div className="hero__actions">
              <Link className="btn btn--primary" to="/cari">
                Cari ruang kosong
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="btn btn--ghost" to="/reservasi">
                <CalendarDays size={16} aria-hidden="true" />
                Reservasi saya
              </Link>
            </div>

            <ul className="hero__points">
              <li>
                <span className="hero__check" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
                Slot per jam
              </li>
              <li>
                <span className="hero__check" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
                Konfirmasi cepat
              </li>
              <li>
                <span className="hero__check" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
                Batal sebelum mulai
              </li>
            </ul>
          </div>

          <p className="hero__stamp">
            <Sparkles size={13} aria-hidden="true" />
            Est. {campus.establishedYear} · {campus.city}
          </p>
        </div>
      </section>

      {/* Floating stat cards — menimpa tepi bawah hero (SaaS landing style) */}
      <section className="container stats-float" aria-label="Ringkasan sistem">
        <div className="stats-card stats-card--blue">
          <span className="stats-card__icon stats-card__icon--blue" aria-hidden="true">
            <Building2 size={20} strokeWidth={2.5} />
          </span>
          <strong>{totalRooms}</strong>
          <span className="stats-card__label">Ruang terdaftar</span>
        </div>
        <div className="stats-card stats-card--orange">
          <span className="stats-card__icon stats-card__icon--orange" aria-hidden="true">
            <MapPin size={20} strokeWidth={2.5} />
          </span>
          <strong>{buildingList.length}</strong>
          <span className="stats-card__label">Gedung kampus</span>
        </div>
        <div className="stats-card stats-card--green">
          <span className="stats-card__icon stats-card__icon--green" aria-hidden="true">
            <Clock size={20} strokeWidth={2.5} />
          </span>
          <strong>07.00–21.00</strong>
          <span className="stats-card__label">Jam peminjaman · WITA</span>
        </div>
        <div className="stats-card stats-card--purple">
          <span className="stats-card__icon stats-card__icon--purple" aria-hidden="true">
            <Tag size={20} strokeWidth={2.5} />
          </span>
          <strong>{categoryCount}</strong>
          <span className="stats-card__label">Jenis ruang</span>
        </div>
      </section>

      <div className="container hero-search">
        <form className="quick-search quick-search--glass" onSubmit={handleSearch}>
          <div className="quick-search__intro">
            <span className="quick-search__label">Mulai dari sini</span>
            <strong>Kapan kamu butuh ruang?</strong>
          </div>
          <label className="field field--inline">
            <span className="field__label">Tanggal</span>
            <input
              className="input"
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label className="field field--inline">
            <span className="field__label">Gedung</span>
            <select
              className="input input--select"
              value={buildingChoice}
              onChange={(event) =>
                setBuildingChoice(event.target.value as BuildingId | 'semua')
              }
            >
              <option value="semua">Semua gedung</option>
              {buildingList.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn--primary quick-search__submit" type="submit">
            Cek ketersediaan
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
      </div>

      <section className="section how-section" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head section-head--center">
            <div>
              <span className="eyebrow">Cara kerja</span>
              <h2 className="section-title" id="how-title">
                Reservasi ruang tak pernah semudah ini.
              </h2>
            </div>
          </div>

          <ol className="how-grid">
            <li className="how-step">
              <img
                className="how-card__img"
                src="https://www.idbbali.ac.id/wp-content/uploads/2022/12/gedung-idb-baru.jpg"
                alt="Gedung IDB Bali"
                loading="lazy"
                onError={(event) => {
                  const img = event.currentTarget
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1'
                    img.src = '/images/idb-bali-building-hd.jpg'
                  }
                }}
              />
              <div className="how-card__scr" aria-hidden="true" />
              <div className="how-card__content">
                <h3>1. Cari &amp; Pilih</h3>
                <p>Lihat ketersediaan studio atau lab secara real-time.</p>
              </div>
            </li>
            <li className="how-step">
              <img
                className="how-card__img"
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJvT5YW2eNpKvBZ4247RugNPhw9i858Rzeccrm7mklRg2M36inJIyVu-xa&s=10"
                alt="Pengajuan reservasi ruangan"
                loading="lazy"
                onError={(event) => {
                  const img = event.currentTarget
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1'
                    img.src = '/images/fasilitas/ruang-kelas.jpg'
                  }
                }}
              />
              <div className="how-card__scr" aria-hidden="true" />
              <div className="how-card__content">
                <h3>2. Ajukan Reservasi</h3>
                <p>Pilih jadwal yang kosong dan isi detail keperluanmu.</p>
              </div>
            </li>
            <li className="how-step">
              <img
                className="how-card__img"
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbdQkKzXvXIfdbqDkXCsSyCZ0jnWwvWkEL1I9bUj8mnCqDBs76_oUcSDP7&s=10"
                alt="Surat izin resmi dari Kemahasiswaan"
                loading="lazy"
                onError={(event) => {
                  const img = event.currentTarget
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1'
                    img.src = '/images/fasilitas/lab-komputer.jpg'
                  }
                }}
              />
              <div className="how-card__scr" aria-hidden="true" />
              <div className="how-card__content">
                <h3>3. Cetak Surat Izin</h3>
                <p>Dapatkan bukti persetujuan resmi dari Kemahasiswaan.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="section featured-section" aria-labelledby="featured-title">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Favorit mahasiswa</span>
              <h2 className="section-title" id="featured-title">
                Ruangan Paling Sering Dipesan
              </h2>
              <p className="section-lead">
                Tiga ruang yang paling ramai dipakai — lihat ketersediaannya hari ini, lalu
                langsung bicara di halaman Cari Ruang.
              </p>
            </div>
          </div>

          <div className="room-grid room-grid--featured">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} room={room} availability={availabilityByRoom[room.id]} />
            ))}
          </div>

          <div className="featured-cta">
            <Link className="btn btn--ghost" to="/cari">
              Lihat Semua Ruangan
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
