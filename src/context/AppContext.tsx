import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type {
  Building,
  Reservation,
  ReservationFeedback,
  Room,
  RoomAvailability,
  SaveFeedbackInput,
  StudentProfile,
} from '../types'
import { ApiError } from '../types'
import { mockApi } from '../services/MockApiService'
import { demoAdmin, demoStudent } from '../data/seed'
import { todayISO } from '../lib/date'

export type ToastTone = 'success' | 'error' | 'info'

/* v2: profil demo baru (Muhammad Faris) — versi lama v1 tidak dibaca lagi agar
   profil demo bawaan selalu aktif, sementara hasil Edit Profil tetap bertahan. */
const PROFILE_KEY = 'idb-space.user.v2'

/** Profil pengguna bertahan lintas refresh (mock permanence). */
function loadInitialProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudentProfile>
      if (parsed.name && parsed.nim && parsed.prodi) {
        return {
          name: parsed.name,
          nim: parsed.nim,
          prodi: parsed.prodi,
          phone: parsed.phone ?? demoStudent.phone,
        }
      }
    }
  } catch {
    // abaikan dan pakai profil demo
  }
  return demoStudent
}

function persistProfile(profile: StudentProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    console.warn('[IDB Space] Gagal menyimpan profil ke localStorage.')
  }
}

/* Role Switcher — akun aktif bertahan lintas refresh (mahasiswa = default). */
export type UserRole = 'mahasiswa' | 'admin'

const ROLE_KEY = 'idb-space.role.v2'

function loadInitialRole(): UserRole {
  try {
    return localStorage.getItem(ROLE_KEY) === 'admin' ? 'admin' : 'mahasiswa'
  } catch {
    return 'mahasiswa'
  }
}

function persistRole(role: UserRole): void {
  try {
    localStorage.setItem(ROLE_KEY, role)
  } catch {
    console.warn('[IDB Space] Gagal menyimpan role ke localStorage.')
  }
}

/* Sesi login — halaman Login terpisah memguard seluruh aplikasi. */
const SESSION_KEY = 'idb-space.session.v1'

function loadInitialSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function persistSession(loggedIn: boolean): void {
  try {
    localStorage.setItem(SESSION_KEY, loggedIn ? '1' : '0')
  } catch {
    console.warn('[IDB Space] Gagal menyimpan sesi ke localStorage.')
  }
}

/* Foto profil per peran (data URL) — diunggah lewat FileReader di menu profil. */
const AVATAR_KEY = 'idb-space.avatars.v1'

export type AvatarMap = Record<UserRole, string | null>

const EMPTY_AVATARS: AvatarMap = { mahasiswa: null, admin: null }

function loadInitialAvatars(): AvatarMap {
  try {
    const raw = localStorage.getItem(AVATAR_KEY)
    if (!raw) return EMPTY_AVATARS
    const parsed = JSON.parse(raw) as Partial<AvatarMap>
    const normalize = (value: unknown): string | null =>
      typeof value === 'string' && value.startsWith('data:image/') ? value : null
    return {
      mahasiswa: normalize(parsed.mahasiswa),
      admin: normalize(parsed.admin),
    }
  } catch {
    return EMPTY_AVATARS
  }
}

export function persistAvatars(avatars: AvatarMap): void {
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(avatars))
  } catch {
    console.warn('[IDB Space] Gagal menyimpan foto profil ke localStorage (kuota penuh?).')
  }
}

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  message?: string
}

interface AppState {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  buildings: Building[]
  rooms: Room[]
  reservations: Reservation[]
  availabilities: RoomAvailability[]
  /** Ulasan & laporan kendala pasca-pemakaian (untuk dashboard admin). */
  feedback: ReservationFeedback[]
  /** Status Kontrol Ruangan: map roomId → true (ditutup maintenance, panel admin). */
  maintenance: Record<string, boolean>
  /** Sesi login — false = halaman apa pun ter-redirect ke /login. */
  session: boolean
  /** Foto profil aktif per peran (data URL) — null = pakai inisial. */
  avatars: AvatarMap
  /** Role akun aktif — menentukan hak akses UI (mahasiswa ⇄ admin). */
  role: UserRole
  /** Profil mahasiswa tersimpan — dipertahankan saat role berganti ke admin. */
  studentProfile: StudentProfile
  /** Profil akun aktif mengikuti role. */
  currentUser: StudentProfile
}

type Action =
  | { type: 'loading' }
  | {
      type: 'loaded'
      payload: Pick<
        AppState,
        'buildings' | 'rooms' | 'reservations' | 'availabilities' | 'maintenance' | 'feedback'
      >
    }
  | { type: 'sync'; reservations: Reservation[]; availabilities: RoomAvailability[] }
  | { type: 'feedback'; list: ReservationFeedback[] }
  | { type: 'maintenanceMap'; map: Record<string, boolean> }
  | { type: 'session'; loggedIn: boolean }
  | { type: 'avatar'; role: UserRole; dataUrl: string | null }
  | { type: 'profile'; patch: Partial<StudentProfile> }
  | { type: 'role'; role: UserRole }
  | { type: 'error'; message: string }

const initialRole = loadInitialRole()
const initialProfile = loadInitialProfile()

const initialState: AppState = {
  status: 'loading',
  error: null,
  buildings: [],
  rooms: [],
  reservations: [],
  availabilities: [],
  feedback: [],
  maintenance: {},
  session: loadInitialSession(),
  avatars: loadInitialAvatars(),
  role: initialRole,
  studentProfile: initialProfile,
  currentUser: initialRole === 'admin' ? demoAdmin : initialProfile,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading', error: null }
    case 'loaded':
      return { ...state, status: 'ready', error: null, ...action.payload }
    case 'sync':
      return {
        ...state,
        reservations: action.reservations,
        availabilities: action.availabilities,
      }
    case 'feedback':
      return { ...state, feedback: action.list }
    case 'maintenanceMap':
      return { ...state, maintenance: action.map }
    case 'session': {
      persistSession(action.loggedIn)
      return { ...state, session: action.loggedIn }
    }
    case 'avatar': {
      const avatars = { ...state.avatars, [action.role]: action.dataUrl }
      persistAvatars(avatars)
      return { ...state, avatars }
    }
    case 'profile': {
      const studentProfile = { ...state.studentProfile, ...action.patch }
      persistProfile(studentProfile)
      return {
        ...state,
        studentProfile,
        // Saat admin aktif, profil tersimpan berubah tanpa menyentuh tampilan admin.
        currentUser: state.role === 'admin' ? state.currentUser : studentProfile,
      }
    }
    case 'role': {
      persistRole(action.role)
      return {
        ...state,
        role: action.role,
        currentUser: action.role === 'admin' ? demoAdmin : state.studentProfile,
      }
    }
    case 'error':
      return { ...state, status: 'error', error: action.message }
    default:
      return state
  }
}

interface AppContextValue extends AppState {
  /** Reservasi hari ini per roomId. */
  availabilityByRoom: Record<string, RoomAvailability>
  toasts: Toast[]
  refresh: () => Promise<void>
  reloadReservations: () => Promise<void>
  notify: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  /** Ubah profil pengguna aktif (mis. dari modal Edit Profil). */
  updateUser: (profile: Partial<StudentProfile>) => void
  /** Ganti akun/peran (mahasiswa ⇄ admin) — seluruh UI langsung menyesuaikan. */
  switchRole: (role: UserRole) => void
  /** true saat akun tim Kemahasiswaan sedang aktif. */
  isAdmin: boolean
  /** Sesi login aktif (dari halaman Login). */
  isLoggedIn: boolean
  /** Masuk dari halaman Login: set sesi + role aktif sekaligus. */
  login: (role: UserRole) => void
  /** Keluar: sesi berakhir, role kembali ke mahasiswa (default). */
  logout: () => void
  /** Simpan/ganti foto profil untuk peran tertentu (null = hapus, pakai inisial). */
  setAvatar: (role: UserRole, dataUrl: string | null) => void
  /** Kirim/ubah ulasan & laporan kendala untuk reservasi selesai. */
  submitFeedback: (input: SaveFeedbackInput) => Promise<ReservationFeedback>
  /**
   * Tutup/buka ruangan (Status Kontrol Ruangan) — aksi panel admin.
   * Peta maintenance di seluruh aplikasi ikut diperbarui.
   */
  setRoomMaintenance: (roomId: string, underMaintenance: boolean) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [toasts, setToasts] = useReducer(
    (current: Toast[], action: { type: 'add'; toast: Toast } | { type: 'remove'; id: string }) => {
      if (action.type === 'add') return [...current.slice(-2), action.toast]
      return current.filter((toast) => toast.id !== action.id)
    },
    [],
  )
  const timers = useRef<Map<string, number>>(new Map())

  const load = useCallback(async () => {
    dispatch({ type: 'loading' })
    try {
      const date = todayISO()
      const [buildings, rooms, reservations, availabilities, maintenance, feedback] =
        await Promise.all([
          mockApi.getBuildings(),
          mockApi.getRooms(),
          mockApi.getReservations(),
          mockApi.getAvailabilities(date),
          mockApi.getRoomMaintenance(),
          mockApi.getFeedback(),
        ])
      dispatch({
        type: 'loaded',
        payload: { buildings, rooms, reservations, availabilities, maintenance, feedback },
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Gagal memuat data kampus. Silakan muat ulang halaman.'
      dispatch({ type: 'error', message })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reloadReservations = useCallback(async () => {
    const [reservations, availabilities] = await Promise.all([
      mockApi.getReservations(),
      mockApi.getAvailabilities(todayISO()),
    ])
    dispatch({ type: 'sync', reservations, availabilities })
  }, [])

  const updateUser = useCallback((patch: Partial<StudentProfile>) => {
    dispatch({ type: 'profile', patch })
  }, [])

  const switchRole = useCallback((role: UserRole) => {
    dispatch({ type: 'role', role })
  }, [])

  const setRoomMaintenance = useCallback(async (roomId: string, underMaintenance: boolean) => {
    await mockApi.setRoomMaintenance(roomId, underMaintenance)
    const map = await mockApi.getRoomMaintenance()
    dispatch({ type: 'maintenanceMap', map })
  }, [])

  /** Halaman Login: aktifkan sesi sekaligus pindah peran. */
  const login = useCallback(
    (loginRole: UserRole) => {
      dispatch({ type: 'session', loggedIn: true })
      if (state.role !== loginRole) {
        dispatch({ type: 'role', role: loginRole })
      }
    },
    [state.role],
  )

  /** Tombol Keluar: sesi berakhir → guard memantulkan ke /login. */
  const logout = useCallback(() => {
    dispatch({ type: 'session', loggedIn: false })
    dispatch({ type: 'role', role: 'mahasiswa' })
  }, [])

  const setAvatar = useCallback((targetRole: UserRole, dataUrl: string | null) => {
    dispatch({ type: 'avatar', role: targetRole, dataUrl })
  }, [])

  /** Simpan ulasan pasca-pemakaian lalu segarkan daftar di dashboard admin. */
  const submitFeedback = useCallback(async (input: SaveFeedbackInput) => {
    const saved = await mockApi.saveFeedback(input)
    dispatch({ type: 'feedback', list: await mockApi.getFeedback() })
    return saved
  }, [])

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts({ type: 'remove', id })
  }, [])

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      setToasts({ type: 'add', toast: { ...toast, id } })
      const timer = window.setTimeout(() => {
        setToasts({ type: 'remove', id })
        timers.current.delete(id)
      }, 6000)
      timers.current.set(id, timer)
    },
    [],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((timer) => window.clearTimeout(timer))
      map.clear()
    }
  }, [])

  const availabilityByRoom = useMemo(
    () =>
      Object.fromEntries(
        state.availabilities.map((availability) => [availability.roomId, availability]),
      ),
    [state.availabilities],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      availabilityByRoom,
      toasts,
      refresh: load,
      reloadReservations,
      notify,
      dismissToast,
      updateUser,
      switchRole,
      setRoomMaintenance,
      isLoggedIn: state.session,
      login,
      logout,
      setAvatar,
      submitFeedback,
      isAdmin: state.role === 'admin',
    }),
    [
      state,
      availabilityByRoom,
      toasts,
      load,
      reloadReservations,
      notify,
      dismissToast,
      updateUser,
      switchRole,
      setRoomMaintenance,
      login,
      logout,
      setAvatar,
      submitFeedback,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp harus dipakai di dalam <AppProvider>')
  return context
}
