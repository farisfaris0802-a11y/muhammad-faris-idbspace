import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UserMenu } from './UserMenu'

const navigation = [
  { to: '/', label: 'Beranda' },
  { to: '/cari', label: 'Cari Ruang' },
  { to: '/reservasi', label: 'Reservasi Saya' },
]

export function SiteHeader() {
  const { currentUser, isAdmin } = useApp()
  // Panel Admin hanya muncul saat akun tim Kemahasiswaan aktif.
  const navItems = isAdmin ? [...navigation, { to: '/admin', label: 'Panel Admin' }] : navigation
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" to="/" aria-label="IDB Bali — beranda IDB Space">
          <img
            className="brand__mark-img"
            src="/images/idb-bali-mark.png"
            alt=""
            width={42}
            height={42}
          />
          <span className="brand__text">
            <img
              className="brand__wordmark"
              src="/images/idb-bali-wordmark.png"
              alt="IDB Bali"
              width={143}
              height={26}
            />
            <span className="brand__sub">Institut Desain &amp; Bisnis Bali</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <UserMenu />
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-nav" id="mobile-nav">
          <div className="container">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `mobile-nav__link${isActive ? ' is-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <p className="mobile-nav__foot">
              {currentUser.name} · {currentUser.nim}
            </p>
          </div>
        </div>
      )}
    </header>
  )
}
