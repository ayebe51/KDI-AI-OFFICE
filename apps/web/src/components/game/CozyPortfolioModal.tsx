// ==========================================================
// components/game/CozyPortfolioModal.tsx
// Game-Like Cozy Portfolio Modal with Carousel, Project Mockups,
// Live Demo Links, and Direct WhatsApp Consultation CTA
// ==========================================================

import React, { useState } from 'react';

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  accent: string;
  blurb: string;
  features: string[];
  image: string;
  liveUrl: string | null;
  detailUrl?: string;
  year: string;
}

export const PORTFOLIO_PROJECTS: PortfolioItem[] = [
  {
    id: 'expeditour',
    title: 'Website Tour & Travel Bali dengan Booking Online & Backoffice — Expeditour',
    category: 'Website Bisnis',
    accent: '#e8765d',
    blurb: 'Website tour & travel untuk Expeditour di Bali — booking dan checkout online yang smooth untuk traveler, plus backoffice internal untuk mengatur pesanan, jadwal trip, hingga laporan harian.',
    features: ['Next.js 15', 'Tailwind CSS', 'PostgreSQL', 'Midtrans Gateway'],
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    liveUrl: 'https://www.expeditour.id/',
    year: '2026',
  },
  {
    id: 'company-profile',
    title: 'Jasa Pembuatan Website Company Profile Profesional Next.js',
    category: 'Company Profile',
    accent: '#3f8fd6',
    blurb: 'Website company profile profesional dibangun dengan Next.js — teknologi yang sama dipakai startup unicorn Indonesia. Desain custom premium, SEO teroptimasi penuh, loading 90+ PageSpeed score.',
    features: ['Next.js', 'Tailwind CSS', 'PostgreSQL', 'Supabase'],
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    liveUrl: 'https://demo-company.kdi-ai-office.com/',
    year: '2025',
  },
  {
    id: 'car-rental',
    title: 'Jasa Website Rental Mobil dengan Manajemen Armada & WhatsApp',
    category: 'Website Sales Mobil',
    accent: '#f2994a',
    blurb: 'Website rental mobil profesional dengan katalog armada, cek ketersediaan unit real-time, booking online, dan konfirmasi WhatsApp otomatis. Pelanggan bisa pesan sendiri 24 jam.',
    features: ['Next.js', 'Tailwind CSS', 'PostgreSQL', 'WhatsApp Automation'],
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    liveUrl: 'https://demo-rental.kdi-ai-office.com/',
    year: '2025',
  },
  {
    id: 'delta-legal',
    title: 'Jasa Website Law Firm & Firma Hukum Profesional',
    category: 'Company Profile',
    accent: '#3f8fd6',
    blurb: 'Website law firm & firma hukum yang membangun kepercayaan klien potensial secara online. Profil tim pengacara, bidang praktik, studi kasus, dan formulir konsultasi.',
    features: ['Next.js', 'Tailwind CSS', 'PostgreSQL', 'Security Hardened'],
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    liveUrl: 'https://deltalegal.id/',
    year: '2025',
  },
  {
    id: 'padel-booking',
    title: 'Jasa Website Lapangan Padel dengan Booking Online',
    category: 'Website Bisnis',
    accent: '#e8765d',
    blurb: 'Website booking lapangan padel dengan jadwal real-time, pembayaran digital, manajemen member, dan notifikasi WhatsApp otomatis tanpa komisi marketplace.',
    features: ['Next.js', 'Tailwind CSS', 'PostgreSQL', 'QRIS Payment'],
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
    liveUrl: 'https://demo-padel.kdi-ai-office.com/',
    year: '2025',
  },
  {
    id: 'online-shop-custom',
    title: 'Jasa Website Toko Online Custom Tanpa Marketplace Fee',
    category: 'Toko Online',
    accent: '#e26d9c',
    blurb: 'Website toko online custom 100% tanpa template — desain unik sesuai brand, payment gateway Midtrans/Xendit, manajemen stok, dan 0% komisi pihak ketiga.',
    features: ['Next.js', 'Tailwind CSS', 'PostgreSQL', 'Midtrans', 'Redis'],
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
    liveUrl: 'https://demo-shop.kdi-ai-office.com/',
    year: '2025',
  },
];

export interface CozyPortfolioModalProps {
  onClose: () => void;
  onOpenNayaOffer?: (projectTitle: string) => void;
  onOpenSintaOffer?: (projectTitle: string) => void;
}

export const CozyPortfolioModal: React.FC<CozyPortfolioModalProps> = ({
  onClose,
  onOpenNayaOffer,
  onOpenSintaOffer,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = PORTFOLIO_PROJECTS[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PORTFOLIO_PROJECTS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + PORTFOLIO_PROJECTS.length) % PORTFOLIO_PROJECTS.length);
  };

  const handleConsultWhatsApp = () => {
    if (onOpenNayaOffer) {
      onOpenNayaOffer(current.title);
    } else if (onOpenSintaOffer) {
      onOpenSintaOffer(current.title);
    } else {
      const msg = encodeURIComponent(
        `Halo Naya (Account Manager KDI), saya tertarik berkonsultasi mengenai solusi seperti: ${current.title}. Boleh minta info detail & penawarannya?`
      );
      window.open(`https://wa.me/6285286038143?text=${msg}`, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-sky-500/30 text-slate-100 flex flex-col"
        style={{
          background: 'linear-gradient(170deg, #181c26 0%, #11141c 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <h3 className="text-white font-bold text-base">Portofolio Proyek KDI</h3>
              <p className="text-slate-400 text-xs">Produk software & website yang telah kami bangun & luncurkan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-md bg-slate-800">
              {currentIndex + 1} / {PORTFOLIO_PROJECTS.length}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Carousel Visual Area */}
        <div className="relative aspect-video max-h-64 sm:max-h-72 w-full overflow-hidden bg-slate-900 flex items-center justify-center">
          <img
            src={current.image}
            alt={current.title}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

          {/* Previous & Next Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center text-sm font-bold shadow-lg transition"
          >
            ‹
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white flex items-center justify-center text-sm font-bold shadow-lg transition"
          >
            ›
          </button>

          {/* Category Badge over image */}
          <div className="absolute top-3 left-4 flex gap-2">
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-md"
              style={{ backgroundColor: current.accent }}
            >
              {current.category}
            </span>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-900/80 text-slate-300 backdrop-blur-sm border border-slate-700">
              Tahun {current.year}
            </span>
          </div>
        </div>

        {/* Project Details */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <h4 className="text-white text-base sm:text-lg font-bold leading-snug">
              {current.title}
            </h4>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
              {current.blurb}
            </p>
          </div>

          {/* Tech stack badges */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Teknologi & Arsitektur
            </div>
            <div className="flex flex-wrap gap-1.5">
              {current.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-sky-300"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {current.liveUrl ? (
              <a
                href={current.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <span>🌐</span>
                <span>Lihat Demo Website ↗</span>
              </a>
            ) : (
              <button
                disabled
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-800/40 text-slate-500 font-semibold text-xs cursor-not-allowed"
              >
                Demo Khusus Enterprise
              </button>
            )}

            <button
              onClick={handleConsultWhatsApp}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition"
            >
              <span>💬</span>
              <span>Konsultasi Website Seperti Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
