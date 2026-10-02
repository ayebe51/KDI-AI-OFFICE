// ==========================================================
// components/game/CEORoomModal.tsx
// Interactive Executive CEO Room Terminal Modal
// Exposes modules: Daftar Karyawan, Business Scraper, Bank Template,
// Database, Finance, Statistik, and Command Center
// ==========================================================

import React from 'react';

export interface CEORoomModalProps {
  isOwner: boolean;
  onOpenModule: (moduleName: string) => void;
  onClose: () => void;
}

export const CEORoomModal: React.FC<CEORoomModalProps> = ({
  isOwner,
  onOpenModule,
  onClose,
}) => {
  const modules = [
    {
      id: 'karyawan',
      title: 'Daftar Karyawan & AI Workforce',
      desc: 'Daftar tim digital, spesialisasi peran, dan evaluasi beban kerja',
      icon: '👥',
      category: 'Workforce',
      action: 'workforce',
    },
    {
      id: 'command',
      title: 'Executive Command Center',
      desc: 'Pusat komando strategis: Tujuan, Tugas, Persetujuan & Autonomi',
      icon: '👑',
      category: 'Executive',
      action: 'command',
    },
    {
      id: 'finance',
      title: 'Laporan Keuangan & Biaya AI',
      desc: 'Analisis biaya LLM, benchmark kompensasi pasar, dan valuasi FTE',
      icon: '📈',
      category: 'Finance',
      action: 'workforce',
    },
    {
      id: 'database',
      title: 'Database & Graph Memory',
      desc: 'Inspeksi ontologi Neo4j, penyimpanan PostgreSQL, dan antrean Redis',
      icon: '🗄️',
      category: 'Infrastructure',
      action: 'graph',
    },
    {
      id: 'scraper',
      title: 'Business Market Scraper',
      desc: 'Pemindaian tren pasar, benchmark tarif software, dan riset kompetitor',
      icon: '🔍',
      category: 'Intelligence',
      action: 'runtime',
    },
    {
      id: 'templates',
      title: 'Bank Template & SOP MetaGPT',
      desc: 'Koleksi boilerplate kode, SOP rekayasa software, dan prompt SOP',
      icon: '📁',
      category: 'Engineering',
      action: 'engineering',
    },
    {
      id: 'statistik',
      title: 'Statistik & Telemetri Sistem',
      desc: 'Metrik latensi 10 subsistem, health check, dan DLQ event stream',
      icon: '📊',
      category: 'Telemetry',
      action: 'health',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 text-slate-100 flex flex-col"
        style={{
          background: 'linear-gradient(170deg, #1f1b24 0%, #131218 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.15)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base">CEO Executive Workstation</h3>
                {isOwner && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Owner Access
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs">Pusat kendali manajemen eksekutif Koneksi Digital Inovasi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Modules List */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[70vh]">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onOpenModule(m.action);
                onClose();
              }}
              className="p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-amber-400/40 text-left transition group flex items-start gap-3"
            >
              <span className="text-2xl p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 group-hover:border-amber-500/40 transition">
                {m.icon}
              </span>
              <div>
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  {m.category}
                </div>
                <div className="text-sm font-bold text-slate-100 group-hover:text-white transition">
                  {m.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {m.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>KDI AI Office Executive Room</span>
          <span className="text-amber-400 font-mono">Status: Authorized</span>
        </div>
      </div>
    </div>
  );
};
