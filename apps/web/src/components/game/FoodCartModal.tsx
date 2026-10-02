// ==========================================================
// components/game/FoodCartModal.tsx
// Cozy Food Cart Modal for "Kopi Corner Pak Joko" in Front Yard
// Original KDI Character Identity: Pak Joko (Hospitality Host)
// ==========================================================

import React, { useState } from 'react';

export interface FoodCartModalProps {
  onClose: () => void;
}

interface MenuItem {
  name: string;
  price: string;
  desc: string;
  icon: string;
}

export const FoodCartModal: React.FC<FoodCartModalProps> = ({ onClose }) => {
  const [orderedItem, setOrderedItem] = useState<string | null>(null);

  const menu: MenuItem[] = [
    { name: 'Kopi Susu Gula Aren KDI', price: 'Rp 12.000', desc: 'Espresso robusta pilihan dengan gula aren organik dan susu creamy', icon: '☕' },
    { name: 'Kopi Tubruk Tradisional', price: 'Rp 6.000', desc: 'Kopi hitam mantap khas Nusantara, aroma harum segar', icon: '🫖' },
    { name: 'Teh Hangat Melati Alami', price: 'Rp 5.000', desc: 'Teh melati wangi penenang pikiran saat coding', icon: '🍵' },
    { name: 'Pisang Goreng Crispy', price: 'Rp 10.000', desc: 'Pisang raja manis bertabur wijen renyah hangat', icon: '🍌' },
    { name: 'Cireng Salju Gurih', price: 'Rp 10.000', desc: 'Camilan renyah kenyal dengan cocolan bumbu rujak pedas manis', icon: '🍲' },
  ];

  const handleOrder = (item: MenuItem) => {
    setOrderedItem(item.name);
    setTimeout(() => {
      setOrderedItem(null);
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-orange-500/30 text-slate-100 flex flex-col"
        style={{
          background: 'linear-gradient(170deg, #241d1a 0%, #161211 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(232, 118, 93, 0.2)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-orange-500/20 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☕</span>
            <div>
              <h3 className="text-white font-bold text-base">Kopi Corner Pak Joko</h3>
              <p className="text-amber-400/90 text-xs">Warung Kopi & Camilan Depan Kantor KDI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Pak Joko Dialogue Bubble */}
        <div className="p-4 mx-5 mt-4 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-start gap-3">
          <span className="text-2xl mt-0.5">☕</span>
          <p className="text-xs text-orange-200 leading-relaxed">
            &quot;Monggo mampir, Mas/Mbak! Mau pesan kopi apa hari ini? Anak-anak kantor KDI biasanya ngopi di sini sebelum mulai sprint engineering!&quot;
          </p>
        </div>

        {/* Order Feedback Alert */}
        {orderedItem && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold animate-in fade-in">
            ✅ {orderedItem} siap dinikmati! Selamat ngopi & semangat beraktivitas!
          </div>
        )}

        {/* Menu list */}
        <div className="p-5 space-y-2.5 overflow-y-auto max-h-[50vh]">
          {menu.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 flex items-center justify-between transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-sm font-bold text-slate-100">{item.name}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 ml-3 flex-shrink-0">
                <span className="text-xs font-mono font-bold text-amber-400">{item.price}</span>
                <button
                  onClick={() => handleOrder(item)}
                  className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition shadow-sm"
                >
                  Pesan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
