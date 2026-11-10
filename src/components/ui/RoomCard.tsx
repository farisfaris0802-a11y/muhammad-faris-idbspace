import { Link } from 'react-router-dom'
import { ArrowUpRight, Layers, Users } from 'lucide-react'
import type { Room, RoomAvailability } from '../../types'
import { roomCategoryLabel } from '../../data/campus'
import { AvailabilityStrip } from './AvailabilityStrip'

interface RoomCardProps {
  room: Room
  availability?: RoomAvailability
}

function availabilityLabel(availability?: RoomAvailability) {
  if (!availability) return { text: 'Memuat jadwal…', tone: 'loading' }
  if (availability.isClosed) return { text: 'Tutup hari ini', tone: 'closed' }
  const free = availability.slots.filter((slot) => slot.status === 'available').length
  if (free > 0) return { text: `${free} slot kosong`, tone: 'free' }
  if (availability.slots.some((slot) => slot.status === 'booked')) {
    return { text: 'Penuh hari ini', tone: 'full' }
  }
  return { text: 'Tidak ada slot', tone: 'closed' }
}

export function RoomCard({ room, availability }: RoomCardProps) {
  const label = availabilityLabel(availability)
  const visibleFacilities = room.facilities.slice(0, 3)
  const extraFacilities = room.facilities.length - visibleFacilities.length

  return (
    <Link className="room-card room-card--photo" to={`/cari?ruang=${room.id}`}>
      {/* Header foto: thumbnail di atas konten (seperti kartu listing) */}
      <div className="room-card__media">
        <img
          className="room-card__img"
          src={room.imageUrl}
          alt={`Foto ${room.name} IDB Bali`}
          style={room.imagePosition ? { objectPosition: room.imagePosition } : undefined}
          loading="lazy"
        />
        <span className="room-card__code">{room.code}</span>
      </div>

      <div className="room-card__content">
        <div className="room-card__top">
          <span className="room-card__category">{roomCategoryLabel[room.category]}</span>
          <span className="room-card__go" aria-hidden="true">
            <ArrowUpRight size={16} />
          </span>
        </div>

        <h3 className="room-card__name">{room.name}</h3>
        <p className="room-card__desc">{room.description}</p>

        <div className="room-card__meta">
          <span>
            <Users size={15} aria-hidden="true" />
            {room.capacity} orang
          </span>
          <span>
            <Layers size={15} aria-hidden="true" />
            {room.floor}
          </span>
          <span className="room-card__building">Gedung {room.buildingId}</span>
        </div>

        <ul className="room-card__tags" aria-label="Fasilitas utama">
          {visibleFacilities.map((facility) => (
            <li key={facility}>{facility}</li>
          ))}
          {extraFacilities > 0 && <li>+{extraFacilities}</li>}
        </ul>

        <div className="room-card__availability">
          <div className="room-card__avail-head">
            <span className="room-card__avail-title">Hari ini</span>
            <span className={`free-badge free-badge--${label.tone}`}>
              <span className="free-badge__dot" aria-hidden="true" />
              {label.text}
            </span>
          </div>
          <AvailabilityStrip availability={availability} />
        </div>
      </div>
    </Link>
  )
}
