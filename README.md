# IDB Space — Sistem Peminjaman Ruang IDB Bali

Mockup frontend fase 1 untuk sistem reservasi ruang **Institut Desain & Bisnis Bali (IDB Bali)**.
Backend disimulasikan sepenuhnya di browser melalui `MockApiService`.

> **Status:** Tugas 1 (fondasi + beranda + Mock API), Tugas 2 (pencarian + formulir
> reservasi), dan **Tugas 3** — halaman "Reservasi Saya" dengan alur persetujuan
> (Menunggu → Disetujui/Ditolak → Selesai), Surat Izin resmi, dan lapor kendala — aktif.
> Ditambah **Halaman Login** (auth gate + demo quick login) dan **Panel Admin**
> (verifikasi pengajuan, export laporan, kontrol status ruangan).

---

## Stack teknologi

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Build tool | **Vite 6** | Server dev instan, konfigurasi minimal, dukungan `.env` bawaan (`VITE_*`). |
| UI | **React 18 + TypeScript** | Komponen berbasis state cocok untuk alur reservasi bertahap; TypeScript menjaga kontrak data Mock API tetap jelas. |
| Routing | **React Router 6** | Navigasi antar halaman (`/`, `/cari`, `/reservasi`) tanpa reload. |
| State | **Context + `useReducer`** | Cukup untuk skala mockup; memisahkan data kampus, reservasi, dan notifikasi. |
| Styling | **CSS murni + design token** | Identitas visual custom (Fraunces + Plus Jakarta Sans, palet tinta–terakota–emas) tanpa ketergantungan utility framework. |
| Ikon | **lucide-react** | Ikon konsisten dan ringan. |
| Persistensi | **localStorage** | Reservasi tetap ada saat halaman di-refresh selama fase mockup. |

---

## Menjalankan proyek

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Buka `http://localhost:5173`.

Alternatif memakai **Bun** (lebih cepat):

```bash
bun install
bun run dev
```

Perintah lain:

```bash
npm run build       # typecheck + build produksi
npm run preview     # menjalankan hasil build
npm run typecheck   # TypeScript saja
```

### Variabel lingkungan

| Variabel | Default | Fungsi |
| --- | --- | --- |
| `VITE_API_KEY` | — | Kunci API (placeholder pada fase mockup). |
| `VITE_API_BASE_URL` | — | Base URL backend sungguhan, belum dipakai. |
| `VITE_MOCK_LATENCY_MIN` / `MAX` | `650` / `1400` | Rentang jeda jaringan palsu (ms). |
| `VITE_MOCK_SLOT_TAKEN_RATE` | `0.15` | Peluang transaksi gagal karena slot direbut. |

---

## Halaman Login & Sesi

- **Auth gate** — seluruh halaman (di belakang `Layout`) wajib sesi aktif
  (`localStorage: idb-space.session.v1`); tanpa sesi, URL apa pun dipantulkan ke `/login`.
- **Split layout** — kolom kiri visual gerbang kampus eksklusif (foto blur halus + scrim
  gelap dari bawah) dengan copywriting khusus masuk: badge **"PORTAL RESMI AKADEMIK"**,
  judul *"Masuk untuk mengelola ruang kampus dengan kendali penuh"*, hook civitas
  akademika, dan tiga poin keamanan berchip (🔒 ⚡ 📋); kolom kanan kartu form:
  Email Kampus (`@idbbali.ac.id`), password (toggle lihat/sembunyi),
  dan tombol **"Masuk (Sign In)"**.
- **Validasi manual** — email tanpa `@` dan password < 4 karakter menampilkan pesan error
  inline; pola email `admin|kemahasiswaan|kmhs|staf` → role admin, selain itu mahasiswa.
- **Demo Quick Login** — dua tombol pintasan yang mengisi form otomatis lalu redirect:
  🚀 *Masuk sebagai Mahasiswa (Faris)* → dashboard `/reservasi`, dan
  🛡️ *Masuk sebagai Admin Kemahasiswaan* → panel kontrol `/admin`.
- **Keluar (Logout)** — ada di menu akun (header); mengakhiri sesi, mengembalikan role
  ke mahasiswa, dan membuka kembali halaman Login lengkap dengan notis
  "Kamu telah keluar. Silakan masuk kembali."

---

## Avatar Profil Dinamis (Navbar)

- **Inisial otomatis** — tanpa foto, avatar memakai inisial nama (mis. *Muhammad Faris* →
  **MF**, *Ni Kadek Dwi Aprilianti* → **KD**) di lingkaran gradien: **oranye IDB** untuk
  mahasiswa, **navy** untuk admin, lengkap dengan border tipis + ring role + shadow halus.
- **Unggah foto** — dari menu akun (*Unggah/Ganti Foto Profil*) maupun modal **Edit Profil**:
  berkas dibaca via `FileReader`, dipotong tengah & diperkecil ke 256×256 (canvas) agar
  hemat kuota, lalu disimpan per peran di `localStorage: idb-space.avatars.v1`.
  Tersedia juga **Hapus Foto Profil** untuk kembali ke inisial.
- **Badge role** — pill **MAHASISWA**/**ADMIN** tetap tampil di samping nama pada chip navbar
  dan header dropdown; foto akun mahasiswa dan admin disimpan terpisah.
- **Validasi** — hanya JPG/PNG/WebP maks. 5 MB; berkas non-gambar ditolak dengan toast error.

---

## Yang bisa direview pada Tugas 1

1. **Beranda** — hero, papan ketersediaan hari ini, ringkasan angka, dan daftar 15 ruang.
2. **Ganti gedung** — tab Gedung A (12 ruang) dan Gedung C (3 ruang) beserta alamatnya.
3. **Quick search** — pilih tanggal/gedung lalu “Cek ketersediaan”; parameter terbawa ke
   halaman pencarian sebagai persiapan Tugas 2.
4. **Status ketersediaan** — batang slot per jam: kosong (hijau), terisi (terakota), lewat (abu).
5. **Navigasi & responsive** — header sticky, menu mobile, dan halaman 404.
6. **Reset data demo** — mengembalikan 9 reservasi contoh + 2 ulasan demo ke kondisi awal.
7. **Mock API** — jeda jaringan palsu, validasi BR-01/BR-03 di service, dan simulasi
   `SLOT_TAKEN` yang siap dipakai pada Tugas 2.

---

## Struktur proyek

```
src/
├── components/
│   ├── layout/        # Header, footer, layout + scroll restoration
│   ├── ui/            # RoomCard, AvailabilityStrip, Toaster
│   └── LogoMark.tsx
├── context/
│   └── AppContext.tsx # State global: data kampus, reservasi, sesi login, toast
├── data/
│   ├── campus.ts      # Profil kampus + 15 ruang (Gedung A & C)
│   └── seed.ts        # Profil demo + 9 reservasi + 2 ulasan awal
├── lib/
│   └── date.ts        # Helper tanggal, jam operasional, slot
├── pages/             # Login, Beranda, Cari, Formulir, Reservasi Saya, Panel Admin
├── services/
│   └── MockApiService.ts
├── styles/
│   └── global.css     # Design token & seluruh komponen visual
└── types/
    └── index.ts       # Kontrak data + ApiError
```

---

## Mock API

`src/services/MockApiService.ts` meniru backend dengan `setTimeout`:

- **Latency** acak 650–1400 ms pada setiap request.
- **`getAvailability(roomId, date)`** menghitung slot per jam dari jam operasional
  (Senin–Jumat 07.00–21.00, Sabtu 08.00–14.00, Minggu tutup).
- **`createReservation()`** memvalidasi BR-01 di sisi service, kapasitas, jam operasional,
  lalu mengecek bentrok dengan reservasi tersimpan **dan** simulasi “slot direbut”.
- **`cancelReservation()`** menolak pembatalan setelah waktu mulai (BR-03).
- Data awal: 9 reservasi (termasuk 3 reservasi lampau/selesai dan 2 milik mahasiswa lain).

### Menguji skenario gagal

1. **Acak** — sekitar 15% transaksi gagal dengan `ApiError('SLOT_TAKEN')`.
   Atur lewat `VITE_MOCK_SLOT_TAKEN_RATE=0` bila ingin selalu berhasil.
2. **Terarah** — panggil dari console browser:

```js
// Impor modul service lewat Vite dev server
const { mockApi } = await import('/src/services/MockApiService.ts')
mockApi.simulateSlotTakenOnce({
  roomId: 'a-studio-foto',
  date: '2026-10-22',
  startTime: '10:00',
  endTime: '12:00',
})
```

Tombol **Reset data demo** di beranda mengembalikan data reservasi ke kondisi awal.

---

## Yang bisa direview pada Tugas 3

Buka **/reservasi** (menu "Reservasi Saya"):

1. **Conditional rendering per status** — badge kuning **Menunggu** dengan tombol
   nonaktif *Menunggu Persetujuan...*, badge merah **Ditolak** beserta alasan
   (contoh seed: *Jadwal Penuh*), badge hijau **Disetujui** dengan tombol utama
   *Lihat Surat Izin*, dan badge abu-abu **Selesai** dengan tombol
   **Beri Ulasan/Lapor Kendala** (+ tautan *Lapor Kerusakan Fasilitas*).
   Pengajuan yang ditarik tampil sebagai *Dibatalkan* (redup).
2. **Surat Izin Penggunaan Ruangan** — modal bergaya kertas A4 (Tailwind): kop
   resmi IDB Bali, judul bergaris bawah, tabel info (Hari/Tanggal Cetak, Kepada,
   Dari, Perihal), isi surat, tabel data mahasiswa dari profil, QR pass
   *Scan validasi keamanan*, tanda tangan scan asli pejabat
   (`/ttd-asli.jpg`), footer navy–oranye, dan tombol `window.print()`.
3. **Lapor kendala** — modal pilihan kerusakan (AC mati, proyektor, dll.) +
   keterangan bebas; tersimpan lewat `mockApi.reportFacilityIssue` lalu kartu
   menandai *Kendala dilaporkan*.
4. **BR-03** — tombol pembatalan hanya tampil pada kartu Disetujui dan hilang
   sendiri setelah jam mulai.
5. **Search & Filter Bar (halaman Cari Ruang)** — pencarian nama (case-insensitive)
   + pill kategori (Semua, Ruang Kelas, Laboratorium, Studio, Lainnya) beraksen
   oranye #f26522 tepat di atas grid; hasil kosong menampilkan
   *"Maaf, ruangan yang kamu cari belum tersedia."* Klik kartu ruangan membuka
   **Room Details Modal** (foto aspect-video, badge kapasitas, grid fasilitas,
   deskripsi) dengan tombol *Kembali* / *Lanjutkan Reservasi* yang melanjutkan
   ke formulir reservasi.
6. **Switch Akun / Role Switcher (baru)** — klik chip profil di header
   (mis. `Faris [MAHASISWA]`) membuka dropdown **Ganti Akun / Peran** berisi dua
   akun: **Muhammad Faris** (Bisnis Digital · Mahasiswa, badge biru) dan
   **Ni Kadek Dwi Aprilianti, S.Kes., M.Si** (Tim Kemahasiswaan · **Admin**,
   badge oranye). Role aktif tersimpan di `localStorage` (`idb-space.role.v2`)
   sehingga bertahan lintas refresh. Saat Admin aktif:
   - judul halaman berubah menjadi *"Verifikasi pengajuan reservasi."* +
     tag *Mode tim Kemahasiswaan* (lingkup seluruh pengajuan);
   - kartu **Menunggu** menampilkan tombol **Setujui** / **Tolak** (tolak lewat
     modal alasan dengan preset cepat) yang langsung memperbarui status pemohon;
   - aksi milik pemohon (Surat Izin, BR-03, Lapor Kendala) disembunyikan, dan
     menu *Edit Profil* tidak tampil.
   - link nav **Panel Admin** muncul → dashboard `/admin` berisi:
     - **Export Laporan (Excel/PDF)** — rekap peminjaman bulan berjalan: CSV
       (`;` + BOM, langsung dibuka Excel) atau PDF via dialog cetak (kop resmi);
     - **Beban Ruangan Minggu Ini** — 4 ruangan tersibuk 7 hari terakhir + bar;
     - **Status Kontrol Ruangan** — toggle Aktif ⇄ Maintenance per ruangan.
       Ruangan yang ditutup terkunci otomatis: kartu Cari Ruang berlabel
       "Maintenance", modal detail menandai CTA dinonaktifkan, formulir reservasi
       ditolak, dan `createReservation` menolak pengajuan seperti BR-01.
     - **Tab Kritik & Saran** — daftar ulasan pasca-pemakaian dari mahasiswa
       (kartu ruangan + identitas + bintang), dengan border merah untuk kendala
       fasilitas dan ringkasan total/rata-rata rating.
7. **Simulasi petugas (demo via console)**:

```js
const { mockApi } = await import('/src/services/MockApiService.ts')
await mockApi.approveReservation('rsv-seed-1005')  // Menunggu → Disetujui
await mockApi.rejectReservation('rsv-seed-1005', 'Jadwal bentrok dengan kuliah umum')
await mockApi.setRoomMaintenance('a-studio-pola', true)   // tutup ruangan (panel admin)
```

---

## Ulasan & Laporan Kendala (post-service)

**Mahasiswa — `/reservasi`:**
- Kartu berstatus **Selesai** menampilkan tombol kecil **“Beri Ulasan/Lapor Kendala”**.
- Modal berisi **rating bintang 1–5 (opsional)** + **textarea keluhan/saran** (wajib,
  min. 5 karakter, maks. 400). Rating bisa dikosongkan lagi dengan menekan bintang yang sama.
- Setelah terkirim, kartu menampilkan ringkasan bintang + tombol **Ubah** (prefill).
- Data disimpan per reservasi di `localStorage: idb-space.feedback.v1` (upsert — satu
  ulasan per reservasi; `updatedAt` dipertahankan saat diedit).

**Admin — `/admin` → tab “Kritik & Saran”:**
- Kartu rapi berisi **nama ruangan, kode, tanggal & jam, isi ulasan, bintang, identitas
  pengirim (nama + NIM), dan waktu unggah**; urut terbaru lebih dulu.
- Ringkasan: total ulasan, rata-rata rating, jumlah kendala fasilitas.
- Ulasan bernada kendala (rating ≤ 3 atau kata kunci fasilitas seperti *rusak/mati/buram*)
  diberi **border kiri merah + badge “Kendala fasilitas”**; ulasan positif berbadge
  “Apresiasi / saran” hijau.
- Seed demo menyertakan 2 ulasan (1 kendala AC/proyektor di Lab Komputer, 1 apresiasi Aula).
  Tombol **Reset data demo** di beranda memulihkan ulasan contoh ini.

---

## Aturan bisnis

| Kode | Aturan | Status |
| --- | --- | --- |
| BR-01 | Waktu mulai < waktu selesai | Validasi service + form (Tugas 2) ✔ |
| BR-02 | Cegah double submit (tombol loading) | Diimplementasikan pada form (Tugas 2) ✔ |
| BR-03 | Sembunyikan pembatalan setelah jam mulai | UI halaman Reservasi Saya (Tugas 3) ✔ |

---

## Roadmap

- [x] **Tugas 1** — Setup, layout, navigasi, beranda, Mock API, `.env.example`.
- [x] **Tugas 2** — Pencarian ruang kosong + form reservasi (BR-01, BR-02, error slot direbut).
- [x] **Tugas 3** — Halaman "Reservasi Saya": alur persetujuan (Menunggu/Disetujui/
      Ditolak/Selesai), pembatalan BR-03, Surat Izin resmi, dan lapor kendala.

---

## Identitas kampus

Institut Desain & Bisnis Bali · *Empowering People To Be Creative*
Telp: 0361-8955648 · Email: info@idbbali.ac.id · www.idbbali.ac.id
