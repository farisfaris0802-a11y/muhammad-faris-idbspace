import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  LogIn,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

/** Kredensial demo (mockup) — ditampilkan di tombol pintasan & form prefilled. */
export const DEMO_ACCOUNTS = {
  mahasiswa: { email: 'm.faris@idbbali.ac.id', password: 'faris.2026' },
  admin: { email: 'kemahasiswaan@idbbali.ac.id', password: 'idb.admin' },
}

export function LoginPage() {
  const { login, isLoggedIn } = useApp()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Tombol demo memberi efek "mengisi form" dulu, lalu masuk. */
  const [demoFilling, setDemoFilling] = useState<'mahasiswa' | 'admin' | null>(null)
  /** Tujuan nav setelah sesi aktif — dirender sebagai <Navigate> agar deterministik. */
  const [goTo, setGoTo] = useState<string | null>(null)
  /**
   * Notis "kamu telah keluar" — dikirim via sessionStorage oleh tombol Keluar
   * (karena Navigate dari guard Layout menimpa location.state).
   */
  const [loggedOutNotice] = useState(() => {
    try {
      return sessionStorage.getItem('idb-space.just-logged-out') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    // Flag sekali-pakai: bersihkan setelah dibaca (penghapus di sini, bukan di
    // initializer, agar aman dari double-invoke StrictMode).
    if (loggedOutNotice) {
      try {
        sessionStorage.removeItem('idb-space.just-logged-out')
      } catch {
        // abaikan
      }
    }
    document.title = 'Masuk — IDB Space'
  }, [loggedOutNotice])

  /** Sudah dipasang dan ter-set sesi? langsung ke beranda. */
  const cameFromLogout = Boolean((location.state as { loggedOut?: boolean } | null)?.loggedOut)
  if (goTo) {
    return <Navigate to={goTo} replace />
  }
  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }

  /** Masuk manual: role ditentukan dari pola email (memo: admin/kemahasiswaan). */
  const handleSignIn = (event: React.FormEvent) => {
    event.preventDefault()
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Masukkan email kampus yang valid (mis. nama@idbbali.ac.id).')
      return
    }
    if (password.trim().length < 4) {
      setError('Password minimal 4 karakter.')
      return
    }
    setError(null)
    const isStaff = /admin|kemahasiswaan|kmhs|staf/.test(email.toLowerCase())
    login(isStaff ? 'admin' : 'mahasiswa')
    setGoTo(isStaff ? '/admin' : '/reservasi')
  }

  /** Quick Login: isi form sekejap, lalu langsung ke halaman masing-masing. */
  const handleDemoLogin = (role: 'mahasiswa' | 'admin') => {
    setDemoFilling(role)
    const account = DEMO_ACCOUNTS[role]
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
    setTimeout(() => {
      login(role)
      setGoTo(role === 'admin' ? '/admin' : '/reservasi')
    }, 550)
  }

  return (
    <div className="login">
      {/* ── Kolom kiri: visual gerbang kampus (eksklusif halaman Login) ── */}
      <aside className="login__visual">
        <img
          className="login__img"
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5g9f_pZ_bPH9tKLF68l43lq60Gm2Q6FcM4DhOBdTlMNifn-_dMW-KG09g&s=10"
          alt="Gerbang kampus IDB Bali"
        />
        <div className="login__scrim" aria-hidden="true" />
        <div className="login__visual-inner">
          <span className="login__visual-kicker">
            <span className="login__visual-dot" aria-hidden="true" />
            Portal Resmi Akademik
          </span>
          <h1 className="login__heading">
            Masuk untuk mengelola ruang kampus dengan <em>kendali penuh.</em>
          </h1>
          <p className="login__visual-lead">
            Satu pintu gerbang terpadu bagi civitas akademika Institut Desain &amp; Bisnis
            Bali untuk mengakses hak akses mahasiswa atau panel kontrol kemahasiswaan.
          </p>
          <ul className="login__visual-points">
            <li>🔒 Enkripsi sesi login aman &amp; terintegrasi</li>
            <li>⚡ Akses multi-role instan (Mahasiswa &amp; Admin)</li>
            <li>📋 Validasi surat izin otomatis berbasis digital</li>
          </ul>
          <p className="login__visual-foot">
            © 2026 Institut Desain &amp; Bisnis Bali · Dukungan Tim Kemahasiswaan
          </p>
        </div>
      </aside>

      {/* ── Kolom kanan: form login ── */}
      <main className="login__panel">
        <div className="login__card">
          <div className="login__brand">
            <img
              className="login__brand-logo"
              src="/images/idb-bali-mark.png"
              alt="Logo resmi IDB Bali"
              width={34}
              height={34}
            />
            <span className="login__brand-name">IDB SPACE</span>
          </div>
          <h2 className="login__title">Masuk ke akun kampus.</h2>
          <p className="login__subtitle">
            Gunakan email kampus (…<strong>@idbbali.ac.id</strong>) untuk melanjutkan.
          </p>

          {(loggedOutNotice || cameFromLogout) && (
            <p className="login__notice" role="status">
              <ShieldCheck size={15} aria-hidden="true" />
              Kamu telah keluar. Silakan masuk kembali.
            </p>
          )}

          <form className="login__form" onSubmit={handleSignIn} noValidate>
            <label className="login__field">
              <span className="login__field-label">Email Kampus</span>
              <input
                className={`input login__input${error && !/\S+@\S+\.\S+/.test(email) ? ' is-invalid' : ''}`}
                type="email"
                placeholder="nama@idbbali.ac.id"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
                required
              />
            </label>

            <label className="login__field">
              <span className="login__field-label">Password</span>
              <span className="login__password-wrap">
                <input
                  className="input login__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  required
                />
                <button
                  type="button"
                  className="login__eye"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {error && (
              <p className="login__error" role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                {error}
              </p>
            )}

            <button className="btn btn--primary login__submit" type="submit">
              <LogIn size={16} aria-hidden="true" />
              Masuk (Sign In)
            </button>
          </form>

          {/* ── Demo Quick Login ── */}
          <div className="login__divider" role="separator">
            <span>Atau masuk cepat untuk presentasi demo</span>
          </div>

          <div className="login__demo" role="group" aria-label="Demo quick login">
            <button
              type="button"
              className="demo-btn demo-btn--student"
              disabled={demoFilling !== null}
              onClick={() => handleDemoLogin('mahasiswa')}
            >
              <span className="demo-btn__icon" aria-hidden="true">
                <GraduationCap size={18} />
              </span>
              <span className="demo-btn__text">
                <strong>Masuk sebagai Mahasiswa (Faris)</strong>
                <span>Bisnis Digital · dashboard reservasi</span>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="demo-btn demo-btn--admin"
              disabled={demoFilling !== null}
              onClick={() => handleDemoLogin('admin')}
            >
              <span className="demo-btn__icon demo-btn__icon--admin" aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <span className="demo-btn__text">
                <strong>Masuk sebagai Admin Kemahasiswaan</strong>
                <span>panel verifikasi &amp; status ruangan</span>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="login__hint">
            <Sparkles size={13} aria-hidden="true" />
            Akun demo otomatis terisi — cukup tekan tombol pintas di atas.
          </p>
        </div>
      </main>
    </div>
  )
}
