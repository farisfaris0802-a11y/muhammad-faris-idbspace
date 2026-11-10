import type { RoomAvailability, SlotStatus } from '../../types'

const slotLabel: Record<SlotStatus, string> = {
  available: 'kosong',
  booked: 'terisi',
  past: 'lewat',
  closed: 'tutup',
}

interface AvailabilityStripProps {
  availability?: RoomAvailability
  /** Menampilkan jam di bawah batang slot. */
  showAxis?: boolean
}

export function AvailabilityStrip({ availability, showAxis = false }: AvailabilityStripProps) {
  if (!availability) {
    return (
      <div className="avail-strip avail-strip--loading" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, index) => (
          <span key={index} className="avail-strip__slot avail-strip__slot--skeleton" />
        ))}
      </div>
    )
  }

  if (availability.isClosed) {
    return <p className="avail-strip__closed">Kampus tutup pada hari ini.</p>
  }

  const free = availability.slots.filter((slot) => slot.status === 'available').length

  return (
    <div className="avail-strip-wrap">
      <div
        className="avail-strip"
        role="img"
        aria-label={`Ketersediaan ${free} dari ${availability.slots.length} slot pada hari ini`}
      >
        {availability.slots.map((slot) => (
          <span
            key={slot.start}
            className={`avail-strip__slot avail-strip__slot--${slot.status}`}
            title={`${slot.start.replace(':', '.')}–${slot.end.replace(':', '.')} · ${slotLabel[slot.status]}`}
          />
        ))}
      </div>
      {showAxis && (
        <div className="avail-axis" aria-hidden="true">
          <span>{availability.openingTime.replace(':', '.')}</span>
          <span>{availability.closingTime.replace(':', '.')}</span>
        </div>
      )}
    </div>
  )
}
