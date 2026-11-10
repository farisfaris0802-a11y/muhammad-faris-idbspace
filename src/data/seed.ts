import type { Reservation, ReservationFeedback } from '../types'
import { addDaysISO, todayISO } from '../lib/date'

/** Profil mahasiswa demo (nanti diganti data autentikasi asli). */
export const demoStudent = {
  name: 'Muhammad Faris',
  nim: '246120940052',
  prodi: 'Bisnis Digital',
  phone: '0812-3456-7890',
}

/** Profil staf kemahasiswaan — akun kedua pada Role Switcher (Tugas switch akun). */
export const demoAdmin = {
  name: 'Ni Kadek Dwi Aprilianti, S.Kes., M.Si',
  nim: 'KEM-0219',
  prodi: 'Tim Kemahasiswaan IDB Bali',
  phone: '0361-200-911',
}

const isoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

/**
 * Reservasi awal untuk memperlihatkan UI dalam kondisi terisi.
 * Tanggal dihitung relatif terhadap hari ini agar demo selalu relevan.
 */
export function createSeedReservations(): Reservation[] {
  const today = todayISO()

  return [
    {
      id: 'rsv-seed-1001',
      code: 'IDB-A-1001',
      roomId: 'a-studio-pola',
      roomName: 'Studio Pola',
      roomCode: 'A-101',
      buildingId: 'A',
      date: addDaysISO(today, 1),
      startTime: '13:00',
      endTime: '15:00',
      purpose: 'Asistensi Studio Desain Interior',
      attendeeCount: 8,
      requesterName: demoStudent.name,
      requesterNim: demoStudent.nim,
      requesterPhone: demoStudent.phone,
      status: 'approved', // disetujui → tombol Surat Izin aktif
      createdAt: isoDaysAgo(2),
    },
    {
      id: 'rsv-seed-1002',
      code: 'IDB-A-1002',
      roomId: 'a-lab-imac',
      roomName: 'Lab iMac',
      roomCode: 'A-105',
      buildingId: 'A',
      date: addDaysISO(today, 1),
      startTime: '09:00',
      endTime: '11:00',
      purpose: 'Praktikum Fotografi Digital',
      attendeeCount: 24,
      requesterName: 'I Made Bagus Pradana',
      requesterNim: '2210123088',
      requesterPhone: '0813-3900-1122',
      status: 'approved',
      createdAt: isoDaysAgo(4),
    },
    {
      id: 'rsv-seed-1003',
      code: 'IDB-A-1003',
      roomId: 'a-aula',
      roomName: 'Aula',
      roomCode: 'A-303',
      buildingId: 'A',
      date: addDaysISO(today, 2),
      startTime: '08:00',
      endTime: '12:00',
      purpose: 'Seminar Kreatif Mahasiswa Baru',
      attendeeCount: 150,
      requesterName: 'BEM IDB Bali',
      requesterNim: 'ORG-BEM-2026',
      requesterPhone: '0812-0000-2026',
      status: 'approved',
      createdAt: isoDaysAgo(6),
    },
    {
      id: 'rsv-seed-1004',
      code: 'IDB-A-1004',
      roomId: 'a-lab-fashion',
      roomName: 'Lab Fashion',
      roomCode: 'A-108',
      buildingId: 'A',
      date: addDaysISO(today, -1),
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Produksi Koleksi Desain Mode',
      attendeeCount: 12,
      requesterName: demoStudent.name,
      requesterNim: demoStudent.nim,
      requesterPhone: demoStudent.phone,
      status: 'completed',
      createdAt: isoDaysAgo(8),
    },
    {
      id: 'rsv-seed-1005',
      code: 'IDB-C-1005',
      roomId: 'c-r-lecture',
      roomName: 'R Lecture',
      roomCode: 'C-101',
      buildingId: 'C',
      date: addDaysISO(today, 4),
      startTime: '15:00',
      endTime: '17:00',
      purpose: 'Konsultasi Proposal Bisnis Digital',
      attendeeCount: 16,
      requesterName: demoStudent.name,
      requesterNim: demoStudent.nim,
      requesterPhone: demoStudent.phone,
      status: 'pending', // baru diajukan → menunggu persetujuan
      createdAt: isoDaysAgo(1),
    },
    {
      id: 'rsv-seed-1006',
      code: 'IDB-A-1006',
      roomId: 'a-r-meting-inbis',
      roomName: 'R Meting Inbis',
      roomCode: 'A-106',
      buildingId: 'A',
      date: today,
      startTime: '09:00',
      endTime: '11:00',
      purpose: 'Rapat Himpunan Mahasiswa Bisnis',
      attendeeCount: 10,
      requesterName: 'Hima Bisnis Digital',
      requesterNim: 'ORG-HIMA-2026',
      requesterPhone: '0812-1111-2026',
      status: 'approved',
      createdAt: isoDaysAgo(3),
    },
    {
      id: 'rsv-seed-1007',
      code: 'IDB-A-1007',
      roomId: 'a-lab-komputer',
      roomName: 'Lab Komputer',
      roomCode: 'A-103',
      buildingId: 'A',
      date: today,
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Workshop Motion Graphics',
      attendeeCount: 30,
      requesterName: 'Komunitas Desain Digital',
      requesterNim: 'ORG-UKM-2026',
      requesterPhone: '0812-2222-2026',
      status: 'approved',
      createdAt: isoDaysAgo(5),
    },
    {
      // Contoh pengajuan yang ditolak petugas — alasan tampil di badge merah.
      id: 'rsv-seed-1008',
      code: 'IDB-A-1008',
      roomId: 'a-studio-foto',
      roomName: 'Studio Foto',
      roomCode: 'A-104',
      buildingId: 'A',
      date: addDaysISO(today, 2),
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Pemotretan Produk UMKM',
      attendeeCount: 6,
      requesterName: demoStudent.name,
      requesterNim: demoStudent.nim,
      requesterPhone: demoStudent.phone,
      status: 'rejected',
      rejectionReason: 'Jadwal Penuh — pilih slot lain.',
      createdAt: isoDaysAgo(1),
    },
    {
      // Riwayat selesai (komunitas) — bahan demo ulasan & dashboard admin.
      id: 'rsv-seed-1009',
      code: 'IDB-A-1009',
      roomId: 'a-lab-komputer',
      roomName: 'Lab Komputer',
      roomCode: 'A-103',
      buildingId: 'A',
      date: addDaysISO(today, -5),
      startTime: '13:00',
      endTime: '15:00',
      purpose: 'Workshop Desain Grafis Komunitas',
      attendeeCount: 28,
      requesterName: 'Komunitas Desain Digital',
      requesterNim: 'ORG-UKM-2026',
      requesterPhone: '0812-2222-2026',
      status: 'completed',
      createdAt: isoDaysAgo(11),
    },
    {
      // Riwayat selesai (himpunan) — pasangan ulasan bernada apresiasi.
      id: 'rsv-seed-1010',
      code: 'IDB-A-1010',
      roomId: 'a-aula',
      roomName: 'Aula',
      roomCode: 'A-303',
      buildingId: 'A',
      date: addDaysISO(today, -3),
      startTime: '08:00',
      endTime: '11:00',
      purpose: 'Seminar Portofolio Karier',
      attendeeCount: 140,
      requesterName: 'Hima Bisnis Digital',
      requesterNim: 'ORG-HIMA-2026',
      requesterPhone: '0812-1111-2026',
      status: 'completed',
      createdAt: isoDaysAgo(13),
    },
  ]
}

/**
 * Ulasan contoh untuk memperlihatkan tab "Kritik & Saran" panel admin
 * dalam kondisi terisi sejak demo dimulai.
 */
export function createSeedFeedback(): ReservationFeedback[] {
  const now = Date.now()
  const isoAgo = (days: number) => new Date(now - days * 86_400_000).toISOString()
  return [
    {
      reservationId: 'rsv-seed-1009',
      rating: 2,
      message:
        'AC di Lab Komputer kurang dingin sejak sesi siang, dan gambar proyektor tampak buram saat presentasi.',
      roomName: 'Lab Komputer',
      roomCode: 'A-103',
      date: addDaysISO(todayISO(), -5),
      startTime: '13:00',
      endTime: '15:00',
      reviewerName: 'Komunitas Desain Digital',
      reviewerNim: 'ORG-UKM-2026',
      createdAt: isoAgo(4),
    },
    {
      reservationId: 'rsv-seed-1010',
      rating: 5,
      message:
        'Aula bersih, sound system berfungsi baik, dan petugas membantu saat persiapan seminar. Terima kasih!',
      roomName: 'Aula',
      roomCode: 'A-303',
      date: addDaysISO(todayISO(), -3),
      startTime: '08:00',
      endTime: '11:00',
      reviewerName: 'Hima Bisnis Digital',
      reviewerNim: 'ORG-HIMA-2026',
      createdAt: isoAgo(2),
    },
  ]
}
