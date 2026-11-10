import { useCallback, useEffect, useState } from 'react'
import { MessageSquareText, Send, Star } from 'lucide-react'
import type { Reservation, ReservationFeedback } from '../../types'
import { ApiError } from '../../types'
import { useApp } from '../../context/AppContext'

const RATING_LABEL: Record<number, string> = {
  1: 'Sangat buruk',
  2: 'Kurang',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat baik',
}

interface ReviewModalProps {
  reservation: Reservation
  /** Ulasan yang sudah ada → mode ubah (prefill). */
  existing: ReservationFeedback | null
  onClose: () => void
}

/**
 * Modal "Beri Ulasan/Lapor Kendala" untuk reservasi berstatus Selesai.
 * Rating bintang 1–5 bersifat opsional; isi ulasan wajib (min. 5 karakter).
 */
export function ReviewModal({ reservation, existing, onClose }: ReviewModalProps) {
  const { submitFeedback, notify } = useApp()
  const [message, setMessage] = useState(existing?.message ?? '')
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, submitting])

  const valid = message.trim().length >= 5

  const handleSubmit = useCallback(async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        reservationId: reservation.id,
        rating: rating >= 1 ? rating : null,
        message,
      })
      notify({
        tone: 'success',
        title: existing ? 'Ulasan diperbarui' : 'Ulasan terkirim',
        message: `Terima kasih! Masukanmu untuk ${reservation.roomName} sudah masuk ke tim Kemahasiswaan.`,
      })
      onClose()
    } catch (caught) {
      const text =
        caught instanceof ApiError
          ? caught.message
          : 'Terjadi kesalahan saat mengirim ulasan. Coba lagi.'
      setError(text)
    } finally {
      setSubmitting(false)
    }
  }, [valid, submitting, submitFeedback, reservation, rating, message, notify, existing, onClose])

  const activeStar = hover || rating

  return (
    <div
      className="user-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div
        className="user-modal review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
      >
        <div className="user-modal__head">
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Ulasan pasca-pemakaian
          </span>
          <h2 id="review-title">
            {existing ? 'Ubah ulasan' : 'Bagaimana pengalamanmu?'}
          </h2>
          <p className="review-sub">
            {reservation.roomName} · {reservation.roomCode} ·{' '}
            {reservation.startTime.replace(':', '.')}–
            {reservation.endTime.replace(':', '.')}
          </p>
        </div>

        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="review-field">
            <span className="review-label">
              Rating ruangan <em>opsional</em>
            </span>
            <div
              className="review-stars"
              role="radiogroup"
              aria-label="Rating ruangan, opsional"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} bintang — ${RATING_LABEL[value]}`}
                  className={`review-star${value <= activeStar ? ' is-on' : ''}`}
                  onMouseEnter={() => setHover(value)}
                  onFocus={() => setHover(value)}
                  onBlur={() => setHover(0)}
                  onClick={() => setRating((current) => (current === value ? 0 : value))}
                >
                  <Star size={26} aria-hidden="true" />
                </button>
              ))}
              <span className="review-stars__label" aria-live="polite">
                {rating > 0 ? RATING_LABEL[rating] : 'Belum diberi rating'}
              </span>
            </div>
          </div>

          <label className="review-field">
            <span className="review-label">Keluhan / saran</span>
            <textarea
              className={`input review-textarea${error ? ' is-invalid' : ''}`}
              rows={4}
              maxLength={400}
              placeholder="Contoh: AC di Lab Komputer kurang dingin, proyektor buram saat presentasi."
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                setError(null)
              }}
              required
              autoFocus
            />
            <span className="review-meta">
              <span>Minimal 5 karakter — ceritakan kendala fasilitas atau apresiasi ruangan.</span>
              <span className="review-count">{message.length}/400</span>
            </span>
          </label>

          {error && (
            <p className="review-error" role="alert">
              {error}
            </p>
          )}

          <div className="user-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn btn--primary" disabled={!valid || submitting}>
              {submitting ? (
                'Mengirim…'
              ) : (
                <>
                  <Send size={15} aria-hidden="true" />
                  {existing ? 'Simpan Ulasan' : 'Kirim Ulasan'}
                </>
              )}
            </button>
          </div>
        </form>

        <p className="review-privacy">
          <MessageSquareText size={13} aria-hidden="true" />
          Ulasan tampil di tab <strong>Kritik &amp; Saran</strong> panel admin — identitasmu
          ikut tercantum agar tindak lanjut lebih cepat.
        </p>
      </div>
    </div>
  )
}
