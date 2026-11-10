import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface NextPhasePageProps {
  phase: string
  icon: LucideIcon
  title: string
  description: string
  features: string[]
  note?: ReactNode
  secondaryLink?: { to: string; label: string }
}

export function NextPhasePage({
  phase,
  icon: Icon,
  title,
  description,
  features,
  note,
  secondaryLink = { to: '/cari', label: 'Lihat rencana pencarian' },
}: NextPhasePageProps) {
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
            {phase}
          </span>
          <h1 className="page-title">{title}</h1>
          <p className="page-lead">{description}</p>
        </div>

        <div className="phase-card">
          <div className="phase-card__icon" aria-hidden="true">
            <Icon size={24} />
          </div>
          <div className="phase-card__body">
            <span className="phase-tag">Sedang disiapkan</span>
            <h2>Halaman ini dikerjakan pada {phase}.</h2>
            <p>
              Tugas 1 fokus pada fondasi aplikasi: setup, navigasi, beranda, dan layanan mock
              API. Agar review tetap bertahap, formulir dan daftar reservasi belum diaktifkan
              di sini.
            </p>
            <ul className="phase-list">
              {features.map((feature) => (
                <li key={feature}>
                  <span className="phase-list__dot" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            {note && <div className="phase-note">{note}</div>}
            <div className="phase-actions">
              <Link className="btn btn--primary" to="/">
                <ArrowLeft size={16} aria-hidden="true" />
                Kembali ke beranda
              </Link>
              <Link className="link-arrow" to={secondaryLink.to}>
                {secondaryLink.label}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
