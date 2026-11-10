/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Placeholder kunci API untuk mock API / backend sungguhan. */
  readonly VITE_API_KEY?: string
  /** Base URL backend (belum dipakai pada fase mockup). */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MOCK_LATENCY_MIN?: string
  readonly VITE_MOCK_LATENCY_MAX?: string
  readonly VITE_MOCK_SLOT_TAKEN_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
