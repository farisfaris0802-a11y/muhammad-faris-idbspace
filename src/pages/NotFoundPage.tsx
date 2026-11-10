import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="page page--center">
      <div className="container">
        <span className="eyebrow">404</span>
        <h1 className="page-title">Ruang ini tidak ada di denah.</h1>
        <p className="page-lead">
          Alamat yang kamu buka tidak ditemukan. Mari kembali ke beranda dan cari ruang yang
          tersedia.
        </p>
        <Link className="btn btn--primary" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke beranda
        </Link>
      </div>
    </div>
  )
}
