import type { Building, CampusProfile, Room, RoomCategory } from '../types'

export const campus: CampusProfile = {
  institution: 'Institut Desain & Bisnis Bali',
  tagline: 'Empowering People To Be Creative',
  phone: '0361-8955648',
  email: 'info@idbbali.ac.id',
  website: 'www.idbbali.ac.id',
  city: 'Denpasar, Bali',
  establishedYear: 2013,
}

export const buildings: Building[] = [
  {
    id: 'A',
    name: 'Gedung A',
    shortName: 'A',
    address: 'Jl. Tukad Batanghari No. 29, Denpasar',
    blurb:
      'Kampus utama dengan studio, laboratorium produksi, ruang rapat, dan aula serbaguna.',
  },
  {
    id: 'C',
    name: 'Gedung C',
    shortName: 'C',
    address: 'Jl. Tukad Barito No. 5X, Denpasar',
    blurb: 'Blok perkuliahan dengan ruang kelas, laboratorium, dan studio kerja.',
  },
]

export const roomCategoryLabel: Record<RoomCategory, string> = {
  studio: 'Studio',
  lab: 'Laboratorium',
  class: 'Ruang Kelas',
  meeting: 'Ruang Rapat',
  hall: 'Aula',
}

/**
 * Daftar ruang yang boleh direservasi mahasiswa.
 * Area layanan kampus (kantin, musholla, UKS, ruang dosen & administrasi,
 * perpustakaan) tidak masuk sistem peminjaman.
 * Foto: galeri fasilitas resmi idbbali.ac.id (disalin ke /public/images/fasilitas).
 */
export const rooms: Room[] = [
  // ── Gedung A ────────────────────────────────────────────────────────────
  {
    id: 'a-studio-pola',
    code: 'A-101',
    name: 'Studio Pola',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 30,
    category: 'studio',
    facilities: ['Meja potong', 'Manekin jahit', 'Mesin jahit', 'Papan pola'],
    description:
      'Studio kerja untuk perancangan pola dan konstruksi busana dengan area kerja panjang.',
    imageUrl: '/images/fasilitas/studio-pola.jpg',
  },
  {
    id: 'a-r-lecture',
    code: 'A-102',
    name: 'R Lecture',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 40,
    category: 'class',
    facilities: ['Proyektor', 'AC', 'Whiteboard', 'Sound system'],
    description:
      'Ruang kuliah utama dengan tata letak fleksibel untuk kelas teori maupun presentasi.',
    imageUrl: '/images/fasilitas/ruang-kelas.jpg',
  },
  {
    id: 'a-lab-komputer',
    code: 'A-103',
    name: 'Lab Komputer',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 36,
    category: 'lab',
    facilities: ['36 PC', 'Adobe Creative Cloud', 'Jaringan LAN', 'Proyektor'],
    description:
      'Laboratorium komputer dengan GPU terbaru untuk kelas desain digital dan multimedia.',
    imageUrl: '/images/fasilitas/lab-komputer.jpg',
  },
  {
    id: 'a-studio-foto',
    code: 'A-104',
    name: 'Studio Foto',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 20,
    category: 'studio',
    facilities: ['Softbox', 'Backdrop', 'Kamera mirrorless', 'Lighting set'],
    description:
      'Studio fotografi dengan pencahayaan terkontrol untuk pemotretan produk dan portofolio.',
    imageUrl: '/images/fasilitas/studio-foto.jpg',
  },
  {
    id: 'a-lab-imac',
    code: 'A-105',
    name: 'Lab iMac',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 30,
    category: 'lab',
    facilities: ['iMac M1', 'Adobe Creative Cloud', 'Proyektor', 'AC'],
    description:
      'Lab komputer berbasis macOS untuk pekerjaan desain dengan standar industri.',
    imageUrl: '/images/fasilitas/lab-imac.jpg',
  },
  {
    id: 'a-r-meting-inbis',
    code: 'A-106',
    name: 'R Meting Inbis',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 14,
    category: 'meeting',
    facilities: ['Smart TV', 'Video conference', 'AC', 'Papan tulis'],
    description:
      'Ruang rapat Program Studi Bisnis untuk diskusi kelompok dan pertemuan organisasi.',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHDGBx6BS2Q1y43g-SVkYjwUODEgWhJv88RGCJUiRtg3o1yU-FK0MdxVs&s=10',
    imagePosition: '50% 45%',
  },
  {
    id: 'a-studio',
    code: 'A-107',
    name: 'Studio',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 25,
    category: 'studio',
    facilities: ['Meja kerja', 'Easel', 'AC', 'Papan presentasi'],
    description:
      'Studio serbaguna untuk kerja studio arsitektur, interior, dan tugas akhir.',
    imageUrl: '/images/fasilitas/studio-gambar.jpg',
  },
  {
    id: 'a-lab-fashion',
    code: 'A-108',
    name: 'Lab Fashion',
    buildingId: 'A',
    floor: 'Lantai 1',
    capacity: 28,
    category: 'lab',
    facilities: ['Mesin jahit', 'Dress form', 'Setrika uap', 'Rak material'],
    description:
      'Laboratorium produksi busana untuk praktik desain mode dan pengembangan produk.',
    imageUrl: '/images/fasilitas/lab-fashion.jpg',
  },
  {
    id: 'a-ruang-magister',
    code: 'A-201',
    name: 'Ruang Magister',
    buildingId: 'A',
    floor: 'Lantai 2',
    capacity: 20,
    category: 'class',
    facilities: ['Proyektor', 'AC', 'Meja seminar', 'Video conference'],
    description:
      'Ruang seminar Program Magister dengan tata letak diskusi melingkar.',
    imageUrl: '/images/fasilitas/magister.jpg',
    imagePosition: '50% 40%',
  },
  {
    id: 'a-ruang-asistensi',
    code: 'A-202',
    name: 'Ruang Asistensi',
    buildingId: 'A',
    floor: 'Lantai 2',
    capacity: 12,
    category: 'meeting',
    facilities: ['Meja diskusi', 'AC', 'Papan tulis', 'Monitor'],
    description:
      'Ruang konsultasi dosen–mahasiswa untuk asistensi tugas dan bimbingan.',
    imageUrl: '/images/fasilitas/ruang-asistensi.jpg',
    imagePosition: '50% 60%',
  },
  {
    id: 'a-aula',
    code: 'A-303',
    name: 'Aula',
    buildingId: 'A',
    floor: 'Lantai 3',
    capacity: 200,
    category: 'hall',
    facilities: ['Panggung', 'Sound system', 'Proyektor', 'AC'],
    description:
      'Aula utama untuk seminar, workshop, pelatihan, dan kegiatan unit kemahasiswaan.',
    imageUrl: '/images/fasilitas/aula.jpg',
  },

  // ── Gedung C ────────────────────────────────────────────────────────────
  {
    id: 'c-r-lecture',
    code: 'C-101',
    name: 'R Lecture',
    buildingId: 'C',
    floor: 'Lantai 1',
    capacity: 45,
    category: 'class',
    facilities: ['Proyektor', 'AC', 'Whiteboard', 'Sound system'],
    description:
      'Ruang kuliah Gedung C dengan kapasitas besar untuk kelas lintas program studi.',
    imageUrl: '/images/fasilitas/ruang-kelas.jpg',
    imagePosition: '50% 78%',
  },
  {
    id: 'c-lab-komputer',
    code: 'C-102',
    name: 'Lab Komputer',
    buildingId: 'C',
    floor: 'Lantai 1',
    capacity: 32,
    category: 'lab',
    facilities: ['32 PC', 'Adobe Creative Cloud', 'Jaringan LAN', 'Proyektor'],
    description:
      'Laboratorium komputer untuk praktik perangkat lunak desain dan analisis data bisnis.',
    imageUrl: '/images/fasilitas/stib.jpg',
  },
  {
    id: 'c-studio',
    code: 'C-103',
    name: 'Studio',
    buildingId: 'C',
    floor: 'Lantai 1',
    capacity: 24,
    category: 'studio',
    facilities: ['Meja kerja', 'Easel', 'AC', 'Rak karya'],
    description:
      'Studio kerja Gedung C untuk praktik desain dan pengerjaan proyek kreatif.',
    imageUrl: '/images/fasilitas/maket.jpg',
    imagePosition: '50% 55%',
  },
  {
    // Ruang multifungsi baru — kapasitas besar untuk kegiatan skala aula.
    id: 'a-ruang-serba-guna',
    code: 'A-304',
    name: 'Ruang Serba Guna',
    buildingId: 'A',
    floor: 'Lantai 3',
    capacity: 80,
    category: 'hall',
    facilities: [
      'AC Sentral',
      'Sound System & Mic',
      'Proyektor LCD',
      'Kursi Fleksibel',
      'Panggung Mini',
    ],
    description:
      'Ruang multifungsi berkapasitas besar untuk seminar, pelatihan, dan kegiatan organisasi mahasiswa.',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH9s0iqX2-W9eT8NHK__JyiaGAB80fxMG5JmULK1q5GMA5bVIQPsbETLYa&s=10',
    imagePosition: '50% 50%',
  },
]

export function getRoomsByBuilding(buildingId: Building['id']): Room[] {
  return rooms.filter((room) => room.buildingId === buildingId)
}

export function findRoom(roomId: string): Room | undefined {
  return rooms.find((room) => room.id === roomId)
}
