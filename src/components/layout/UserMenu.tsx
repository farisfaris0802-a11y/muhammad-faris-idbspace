import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, LogOut, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import type { StudentProfile } from '../../types'
import { useApp, type UserRole } from '../../context/AppContext'
import { mockApi } from '../../services/MockApiService'
import { demoAdmin, demoStudent } from '../../data/seed'
import { AVATAR_ACCEPT, readAvatarFile } from '../../lib/avatar'

/** Inisial avatar: buang partikel nama Bali (Ni, I, Ida Bagus, dst.). */
function initialsOf(name: string): string {
  const stripped = name.replace(/^(I|Ida|Ni|Ida Bagus|Ni Luh|I Gede|I Wayan)\s+/i, '').trim()
  const words = stripped.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
}

/** Nama pendek untuk chip header (mahasiswa = panggilan, admin = dua kata depan). */
function chipName(profile: StudentProfile, role: UserRole): string {
  if (role === 'admin') {
    return (
      profile.name
        .split(/[,\s]+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(' ') || 'Admin'
    )
  }
  return profile.name.split(' ').slice(-1)[0]
}

/** Wajah avatar: foto bila ada, selain itu inisial nama. */
function AvatarFace({
  name,
  photo,
  className,
}: {
  name: string
  photo: string | null
  className: string
}) {
  return (
    <span className={className} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initialsOf(name)}
    </span>
  )
}

/** Daftar akun tetap pada switcher — selalu menampilkan kedua peran. */
const ACCOUNTS: { role: UserRole; profile: StudentProfile }[] = [
  { role: 'mahasiswa', profile: demoStudent },
  { role: 'admin', profile: demoAdmin },
]

const ROLE_LABEL: Record<UserRole, string> = {
  mahasiswa: 'Mahasiswa',
  admin: 'Admin',
}

export function UserMenu() {
  const {
    currentUser,
    role,
    switchRole,
    updateUser,
    notify,
    reloadReservations,
    logout,
    avatars,
    setAvatar,
  } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatarPhoto = avatars[role]

  /** Unggah foto profil aktif (FileReader + crop di lib/avatar). */
  const handleAvatarFile = async (file: File | null) => {
    if (!file) return
    setAvatarBusy(true)
    try {
      const dataUrl = await readAvatarFile(file)
      setAvatar(role, dataUrl)
      notify({
        tone: 'success',
        title: 'Foto profil diperbarui',
        message: 'Foto baru langsung tampil di navbar.',
      })
    } catch (error) {
      notify({
        tone: 'error',
        title: 'Foto gagal diunggah',
        message: error instanceof Error ? error.message : 'Coba lagi dengan berkas lain.',
      })
    } finally {
      setAvatarBusy(false)
    }
  }

  /** Hapus foto → avatar kembali ke inisial berwarna. */
  const handleAvatarReset = (targetRole: UserRole = role) => {
    setAvatar(targetRole, null)
    notify({
      tone: 'info',
      title: 'Foto profil dihapus',
      message: 'Avatar kembali memakai inisial nama.',
    })
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [modalOpen, role])

  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const handleDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleDown)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleDown)
    }
  }, [menuOpen])

  /** Pindah akun: role tersimpan di context + localStorage, UI langsung menyesuaikan. */
  const handleSwitch = (target: UserRole) => {
    setMenuOpen(false)
    if (target === role) return
    switchRole(target)
    notify({
      tone: 'success',
      title: target === 'admin' ? 'Kini masuk sebagai Admin' : 'Kini masuk sebagai Mahasiswa',
      message:
        target === 'admin'
          ? `${demoAdmin.name} — aksi Setujui/Tolak aktif di halaman Reservasi.`
          : `${demoStudent.name} — akun mahasiswa aktif kembali.`,
    })
  }

  // Sesi controll oleh guard Layout: tanpa sesi, seluruh halaman ter-redirect
  // ke halaman Login — komponen ini selalu dirender dalam sesi aktif.

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className={`user-chip ${menuOpen ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={`${currentUser.name} · ${currentUser.nim}`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <AvatarFace
          name={currentUser.name}
          photo={avatarPhoto}
          className={`user-chip__avatar user-chip__avatar--${role}${avatarPhoto ? ' has-photo' : ''}`}
        />
        <span className="user-chip__meta">
          <span className="user-chip__name-row">
            <strong>{chipName(currentUser, role)}</strong>
            <em className={`role-pill role-pill--${role}`}>{ROLE_LABEL[role]}</em>
          </span>
          <span>{currentUser.prodi}</span>
        </span>
      </button>

      {/* Input berkas tersembunyi — dipicu dari menu "Unggah/Ganti Foto Profil". */}
      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="avatar-file-input"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          event.target.value = ''
          void handleAvatarFile(file)
        }}
      />

      {menuOpen && (
        <div className="user-menu__dropdown" role="menu" aria-label="Menu profil">
          <div className="user-menu__head">
            <AvatarFace
              name={currentUser.name}
              photo={avatarPhoto}
              className={`user-menu__avatar user-menu__avatar--${role}${avatarPhoto ? ' has-photo' : ''}`}
            />
            <div className="user-menu__id">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.nim}</span>
              <span>{currentUser.prodi}</span>
              <em className={`role-pill role-pill--${role}`}>{ROLE_LABEL[role]}</em>
            </div>
          </div>

          {/* Switch Akun / Ganti Peran */}
          <div className="user-menu__switch" role="group" aria-label="Ganti akun / peran">
            <p className="user-menu__switch-label">Ganti akun / peran</p>
            {ACCOUNTS.map((account) => {
              const active = role === account.role
              return (
                <button
                  key={account.role}
                  type="button"
                  role="menuitem"
                  className={`acct${active ? ' is-active' : ''}${account.role === 'admin' ? ' acct--admin' : ''}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => handleSwitch(account.role)}
                >
                  <AvatarFace
                    name={account.profile.name}
                    photo={avatars[account.role]}
                    className={`acct__avatar${account.role === 'admin' ? ' acct__avatar--admin' : ''}${avatars[account.role] ? ' has-photo' : ''}`}
                  />
                  <span className="acct__info">
                    <strong>{account.profile.name}</strong>
                    <span>
                      {account.profile.prodi} · {ROLE_LABEL[account.role]}
                    </span>
                  </span>
                  {active && <Check size={15} aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            disabled={avatarBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={15} aria-hidden="true" />
            {avatarBusy ? 'Memproses foto…' : avatarPhoto ? 'Ganti Foto Profil' : 'Unggah Foto Profil'}
          </button>
          {avatarPhoto && (
            <button
              type="button"
              className="user-menu__item"
              role="menuitem"
              onClick={() => handleAvatarReset()}
            >
              <Trash2 size={15} aria-hidden="true" />
              Hapus Foto Profil
            </button>
          )}

          {role === 'mahasiswa' && (
            <button
              type="button"
              className="user-menu__item"
              role="menuitem"
              onClick={() => setModalOpen(true)}
            >
              <Pencil size={15} aria-hidden="true" />
              Edit Profil
            </button>
          )}
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              // Tandai "baru keluar" agar halaman Login menampilkan notis.
              try {
                sessionStorage.setItem('idb-space.just-logged-out', '1')
              } catch {
                // abaikan
              }
              // Akhiri sesi → guard Layout memantulkan ke halaman Login.
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Keluar (Logout)
          </button>
          <p className="user-menu__foot">
            <ShieldCheck size={13} aria-hidden="true" />
            Perubahan profil tersimpan otomatis.
          </p>
        </div>
      )}

      {modalOpen && (
        <EditProfileModal
          profile={currentUser}
          avatar={avatarPhoto}
          onAvatarChange={(dataUrl) => {
            setAvatar(role, dataUrl)
            notify(
              dataUrl
                ? {
                    tone: 'success',
                    title: 'Foto profil diperbarui',
                    message: 'Foto baru langsung tampil di navbar.',
                  }
                : {
                    tone: 'info',
                    title: 'Foto profil dihapus',
                    message: 'Avatar kembali memakai inisial nama.',
                  },
            )
          }}
          onClose={() => setModalOpen(false)}
          onSave={(patch) => {
            const oldNim = currentUser.nim
            updateUser(patch)
            if (patch.nim && patch.nim !== oldNim) {
              // Bawa reservasi milik NIM lama ke NIM baru agar daftar tetap muncul.
              void mockApi
                .migrateOwnership(oldNim, {
                  requesterName: patch.name ?? currentUser.name,
                  requesterNim: patch.nim,
                  requesterPhone: currentUser.phone,
                })
                .then(() => reloadReservations())
            }
            notify({
              tone: 'success',
              title: 'Profil diperbarui',
              message: 'Nama, NIM, dan program studi sudah tampil di header.',
            })
          }}
        />
      )}
    </div>
  )
}

/** Daftar program studi resmi IDB Bali (dipakai dropdown Edit Profil). */
const PRODI_OPTIONS: { group: string; items: string[] }[] = [
  {
    group: 'Program Sarjana (S1)',
    items: [
      'Arsitektur',
      'Desain Komunikasi Visual (DKV)',
      'Desain Interior',
      'Desain Mode',
      'Bisnis Digital',
      'Manajemen Bisnis',
      'Sistem dan Teknologi Informasi Bisnis',
    ],
  },
  {
    group: 'Program Magister (S2)',
    items: ['Magister Desain (M.Ds.)', 'Magister Bisnis Digital (M.Bns.)'],
  },
]

interface EditProfileModalProps {
  profile: StudentProfile
  avatar: string | null
  onAvatarChange: (dataUrl: string | null) => void
  onClose: () => void
  onSave: (patch: Partial<StudentProfile>) => void
}

function EditProfileModal({ profile, avatar, onAvatarChange, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name)
  const [prodi, setProdi] = useState(
    // Jaga-jaga jika data lama memuat prodi di luar daftar resmi.
    PRODI_OPTIONS.some((group) => group.items.includes(profile.prodi)) ? profile.prodi : 'Desain Interior',
  )
  const [nim, setNim] = useState(profile.nim)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  /** Unggah dari dalam modal: FileReader → crop 256px → simpan di context. */
  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      onAvatarChange(await readAvatarFile(file))
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : 'Foto gagal diproses. Coba berkas lain.',
      )
    } finally {
      setAvatarBusy(false)
    }
  }

  useEffect(() => {
    nameRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const valid =
    name.trim().length >= 3 &&
    prodi.trim().length >= 3 &&
    /^[\dA-Za-z./-]{4,20}$/.test(nim.trim())

  return (
    <div
      className="user-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="user-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <div className="user-modal__head">
          <span className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            Profil pengguna
          </span>
          <h2 id="edit-profile-title">Edit data dirimu</h2>
        </div>

        <form
          className="user-modal__form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!valid) return
            onSave({
              name: name.trim(),
              prodi: prodi.trim(),
              nim: nim.trim(),
            })
            onClose()
          }}
        >
          {/* Editor foto profil — FileReader, tersimpan otomatis di localStorage */}
          <div className="avatar-editor">
            <span className="avatar-editor__preview">
              {avatar ? <img src={avatar} alt="Pratinjau foto profil" /> : initialsOf(name)}
            </span>
            <div className="avatar-editor__actions">
              <div className="avatar-editor__buttons">
                <button
                  type="button"
                  className="btn btn--ghost avatar-editor__btn"
                  disabled={avatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={14} aria-hidden="true" />
                  {avatarBusy ? 'Memproses…' : avatar ? 'Ganti Foto' : 'Unggah Foto'}
                </button>
                {avatar && (
                  <button
                    type="button"
                    className="btn btn--ghost avatar-editor__btn"
                    onClick={() => {
                      setAvatarError(null)
                      onAvatarChange(null)
                    }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Hapus
                  </button>
                )}
              </div>
              <p className="avatar-editor__hint">
                JPG, PNG, atau WebP — maks. 5 MB. Foto otomatis dipotong bulat.
              </p>
              {avatarError && (
                <p className="avatar-editor__error" role="alert">
                  {avatarError}
                </p>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="avatar-file-input"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleAvatarPick}
            />
          </div>

          <label className="field">
            <span className="field__label">Nama lengkap</span>
            <input
              className="input"
              ref={nameRef}
              type="text"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Program studi</span>
            <select
              className="input input--select"
              value={prodi}
              onChange={(event) => setProdi(event.target.value)}
              required
            >
              {PRODI_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">NIM (Nomor Induk Mahasiswa)</span>
            <input
              className="input"
              type="text"
              inputMode="text"
              value={nim}
              minLength={4}
              maxLength={20}
              pattern="[\dA-Za-z./-]+"
              onChange={(event) => setNim(event.target.value)}
              required
            />
            <span className="field__hint">
              Angka atau kombinasi angka-huruf, 4–20 karakter (mis. 2210123045).
            </span>
          </label>

          <div className="user-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Batal
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={
                !valid ||
                (name.trim() === profile.name &&
                  prodi.trim() === profile.prodi &&
                  nim.trim() === profile.nim)
              }
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
