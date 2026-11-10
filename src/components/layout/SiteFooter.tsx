import { Link } from 'react-router-dom'
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import { buildings, campus } from '../../data/campus'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__weave" aria-hidden="true" />
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand brand--footer">
              <img
                className="brand__mark"
                src="/images/idb-bali-mark.png"
                alt=""
                width={40}
                height={40}
              />
              <span className="brand__text">
                <img
                  className="brand__wordmark brand__wordmark--footer"
                  src="/images/idb-bali-wordmark.png"
                  alt="IDB Bali"
                  width={132}
                  height={24}
                />
                <span className="brand__sub">{campus.institution}</span>
              </span>
            </div>
            <p className="footer-tagline">“{campus.tagline}”</p>
            <p className="footer-copy">
              Kampus desain dan bisnis di Denpasar, Bali. Ruang belajar, berkarya, dan
              bertumbuh untuk generasi kreatif.
            </p>
            <div className="footer-socials">
              <a href="https://www.instagram.com/idbbali" aria-label="Instagram IDB Bali">
                <Instagram size={17} />
              </a>
              <a href="https://www.youtube.com/@idbbali" aria-label="YouTube IDB Bali">
                <Youtube size={17} />
              </a>
              <a href="https://www.facebook.com/idbbali" aria-label="Facebook IDB Bali">
                <Facebook size={17} />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-col__title">Kunjungi Kami</h3>
            {buildings.map((building) => (
              <div className="footer-address" key={building.id}>
                <MapPin size={16} aria-hidden="true" />
                <div>
                  <strong>{building.name}</strong>
                  <span>{building.address}</span>
                </div>
              </div>
            ))}
            <div className="footer-address">
              <Clock size={16} aria-hidden="true" />
              <div>
                <strong>Jam operasional ruang</strong>
                <span>Senin–Jumat 07.00 WITA–21.00 WITA · Sabtu 08.00 WITA–14.00 WITA</span>
                <span>Minggu &amp; hari libur nasional tutup</span>
              </div>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-col__title">Kontak</h3>
            <a className="footer-contact" href={`tel:+62${campus.phone.replace(/^0/, '').replace(/-/g, '')}`}>
              <Phone size={16} aria-hidden="true" />
              <span>Telp: {campus.phone}</span>
            </a>
            <a className="footer-contact" href={`mailto:${campus.email}`}>
              <Mail size={16} aria-hidden="true" />
              <span>{campus.email}</span>
            </a>
            <a
              className="footer-contact"
              href="https://www.idbbali.ac.id"
              target="_blank"
              rel="noreferrer"
            >
              <span className="footer-contact__globe" aria-hidden="true">
                ↗
              </span>
              <span>{campus.website}</span>
            </a>
            <p className="footer-hour">
              Layanan akademik: Senin–Jumat 08.30–17.30, Sabtu 08.30–14.00
            </p>
          </div>

          <div className="footer-col">
            <h3 className="footer-col__title">Navigasi</h3>
            <Link className="footer-link" to="/">
              Beranda
            </Link>
            <Link className="footer-link" to="/cari">
              Cari ruang kosong
            </Link>
            <Link className="footer-link" to="/reservasi">
              Status &amp; pembatalan
            </Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {campus.institution}. Seluruh hak cipta dilindungi.
          </p>
          <p>
            IDB Space · Sistem Peminjaman Ruang
          </p>
        </div>
      </div>
    </footer>
  )
}
