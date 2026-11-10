import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ToastTone } from '../../context/AppContext'

const toneIcon: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

export function Toaster() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone]
        return (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <Icon className="toast__icon" size={19} aria-hidden="true" />
            <div className="toast__body">
              <strong>{toast.title}</strong>
              {toast.message && <p>{toast.message}</p>}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Tutup notifikasi"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
