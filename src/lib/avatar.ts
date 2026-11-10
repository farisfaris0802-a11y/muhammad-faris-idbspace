/**
 * Pemroses foto profil (mock, tanpa backend).
 *
 * Alur: berkas → FileReader (data URL) → crop tengah + resize di canvas
 * → data URL JPEG kecil (~256px) yang aman disimpan di localStorage.
 */
const MAX_FILE_BYTES = 5 * 1024 * 1024
const OUTPUT_SIZE = 256

export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

export function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Format berkas harus gambar (JPG, PNG, atau WebP).'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'Ukuran foto maksimal 5 MB. Pilih berkas yang lebih kecil.'
  }
  return null
}

/** Baca berkas foto → data URL siap pakai sebagai avatar. */
export async function readAvatarFile(file: File): Promise<string> {
  const invalid = validateAvatarFile(file)
  if (invalid) throw new Error(invalid)

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca berkas foto.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })

  // Crop cover ke tengah agar foto portrait/landscape tetap rapi di lingkaran.
  try {
    const image = await loadImage(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const context = canvas.getContext('2d')
    if (!context) return dataUrl
    const scale = Math.max(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height)
    const width = image.width * scale
    const height = image.height * scale
    context.drawImage(
      image,
      (OUTPUT_SIZE - width) / 2,
      (OUTPUT_SIZE - height) / 2,
      width,
      height,
    )
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    // Fallback: tetap gunakan data URL asli bila kanvas tidak tersedia.
    return dataUrl
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Foto tidak bisa ditampilkan.'))
    image.src = src
  })
}
