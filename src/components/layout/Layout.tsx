import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { Toaster } from '../ui/Toaster'
import { useApp } from '../../context/AppContext'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export function Layout() {
  const { isLoggedIn } = useApp()

  // Kembalikan judul tab aplikasi (halaman Login mengubahnya menjadi "Masuk — …").
  useEffect(() => {
    document.title = 'IDB Space — Peminjaman Ruang IDB Bali'
  }, [])

  // Auth guard: tanpa sesi aktif, seluruh halaman memantulkan ke /login.
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
      <Toaster />
    </div>
  )
}
