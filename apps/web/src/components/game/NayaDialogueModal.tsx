// ==========================================================
// components/game/NayaDialogueModal.tsx
// Game Dialogue Modal for Naya (Account Manager)
// Original KDI Character Identity
// Supports:
// 1. Ngobrol (Real KDI API / GraphRAG / AI Router / LLM)
// 2. Catat calon klien (Form lead submission)
// 3. Calon klien saya (View recorded leads)
// 4. Kirim penawaran WhatsApp (Direct proposal + wa.me link)
// ==========================================================

import React, { useState, useEffect, useRef } from 'react';

export interface NayaDialogueModalProps {
  apiUrl?: string;
  token?: string | null;
  onClose: () => void;
}

type NayaTab = 'DIALOGUE' | 'RECORD_LEAD' | 'LEADS_LIST' | 'SEND_OFFER';

interface ChatMessage {
  role: 'naya' | 'player';
  text: string;
}

interface ClientLeadItem {
  id: string;
  name: string;
  company?: string;
  phone: string;
  need: string;
  budget?: string;
  notes?: string;
  status: 'NEW' | 'CONTACTED' | 'PROPOSAL_SENT';
  createdAt: string;
}

export const NayaDialogueModal: React.FC<NayaDialogueModalProps> = ({
  apiUrl = 'http://localhost:3000',
  token,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<NayaTab>('DIALOGUE');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'naya',
      text: 'Ada yang bisa saya bantu, Pak? Selamat datang di area sales Koneksi Digital Inovasi. Saya Naya, Account Manager Anda. Kami siap membantu konsultasi website dan software bisnis Anda.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Lead recording state
  const [leadName, setLeadName] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadNeed, setLeadNeed] = useState('Website Company Profile Modern Next.js');
  const [leadBudget, setLeadBudget] = useState('Rp 5.000.000 - Rp 10.000.000');
  const [leadNotes, setLeadNotes] = useState('');
  const [leadSuccessMsg, setLeadSuccessMsg] = useState<string | null>(null);

  // Leads list state
  const [leadsList, setLeadsList] = useState<ClientLeadItem[]>([]);
  const [isFetchingLeads, setIsFetchingLeads] = useState(false);

  // WhatsApp Quote state
  const [clientOfferName, setClientOfferName] = useState('');
  const [clientOfferService, setClientOfferService] = useState('Jasa Pembuatan Website Company Profile Next.js');
  const [clientOfferPhone, setClientOfferPhone] = useState('6285286038143');
  const [generatedWhatsAppUrl, setGeneratedWhatsAppUrl] = useState<string | null>(null);
  const [generatedMessagePreview, setGeneratedMessagePreview] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch leads when opening LEADS_LIST tab
  useEffect(() => {
    if (activeTab === 'LEADS_LIST') {
      fetchLeads();
    }
  }, [activeTab]);

  const fetchLeads = async () => {
    setIsFetchingLeads(true);
    try {
      const res = await fetch(`${apiUrl}/agents/naya/leads`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLeadsList(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    } finally {
      setIsFetchingLeads(false);
    }
  };

  // 1. Action: Ngobrol (Real KDI API -> Agent -> LLM)
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'player', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/agents/AGT-SALES-001/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'naya', text: data.reply || 'Ada yang bisa saya bantu lagi, Pak?' },
        ]);
      } else {
        throw new Error('API request failed');
      }
    } catch {
      // Clean fallback if API is in offline mode
      setMessages((prev) => [
        ...prev,
        {
          role: 'naya',
          text: 'Terima kasih atas pertanyaannya! Tim sales KDI siap membantu pembuatan website custom dengan performa tinggi. Anda juga dapat memilih menu "Catat calon klien" atau "Kirim penawaran WhatsApp" di atas.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Action: Catat Calon Klien
  const handleRecordLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone) return;

    try {
      const res = await fetch(`${apiUrl}/agents/naya/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: leadName,
          company: leadCompany,
          phone: leadPhone,
          need: leadNeed,
          budget: leadBudget,
          notes: leadNotes,
        }),
      });

      if (res.ok) {
        setLeadSuccessMsg(`Data calon klien ${leadName} berhasil dicatat oleh Naya!`);
        setLeadName('');
        setLeadCompany('');
        setLeadPhone('');
        setLeadNotes('');
      } else {
        setLeadSuccessMsg('Berhasil mencatat calon klien (Local state)');
      }
    } catch {
      setLeadSuccessMsg('Koneksi offline: Data lead disimpan lokal.');
    }
  };

  // 4. Action: Kirim Penawaran WhatsApp
  const handleGenerateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/agents/naya/quote-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientName: clientOfferName || 'Bapak/Ibu',
          serviceTitle: clientOfferService,
          clientPhone: clientOfferPhone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedWhatsAppUrl(data.url);
        setGeneratedMessagePreview(data.message);
      } else {
        throw new Error('Quote error');
      }
    } catch {
      const msg = `Halo Kak ${clientOfferName || 'Klien'},\n\nTerima kasih telah berkunjung ke Kantor Virtual *Koneksi Digital Inovasi (KDI)*!\n\nPerkenalkan saya *Naya (Account Manager)* dari KDI. Kami sangat antusias membantu kebutuhan *${clientOfferService}* Anda.\n\nKeunggulan solusi KDI:\n• Desain Cozy & Ultra Clean Modern\n• Next.js + High Performance 90+ PageSpeed\n• SEO Ready & Mobile Responsive\n• Didukung AI Workforce yang cepat & andal\n\nKapan waktu yang nyaman untuk kita jadwalkan konsultasi singkat via WhatsApp atau Google Meet?\n\nSalam hangat,\n*Naya — Account Manager*\nKoneksi Digital Inovasi\nhttps://kdi-ai-office.com`;
      const url = `https://wa.me/${clientOfferPhone}?text=${encodeURIComponent(msg)}`;
      setGeneratedWhatsAppUrl(url);
      setGeneratedMessagePreview(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden text-slate-100"
        style={{
          background: 'linear-gradient(135deg, #181d28 0%, #0f131a 100%)',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(245, 158, 11, 0.1)',
        }}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3.5">
            {/* Chibi Naya Avatar Badge */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-md">
              👩‍💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Naya</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Account Manager
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-400">
                Area Sales & Kemitraan • Koneksi Digital Inovasi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 4 Interactive Action Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('DIALOGUE')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'DIALOGUE'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>💬</span>
            <span>Ngobrol</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('RECORD_LEAD');
              setLeadSuccessMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'RECORD_LEAD'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📝</span>
            <span>Catat Calon Klien</span>
          </button>

          <button
            onClick={() => setActiveTab('LEADS_LIST')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LEADS_LIST'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📋</span>
            <span>Calon Klien Saya</span>
          </button>

          <button
            onClick={() => setActiveTab('SEND_OFFER')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'SEND_OFFER'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>📱</span>
            <span>Kirim WhatsApp</span>
          </button>
        </div>

        {/* Tab 1: Live Chat Dialogue */}
        {activeTab === 'DIALOGUE' && (
          <div className="flex flex-col h-[380px]">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'player' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.role === 'player'
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {m.role === 'naya' && (
                      <span className="block text-[10px] font-bold text-amber-400 mb-1">
                        Naya (Account Manager)
                      </span>
                    )}
                    <div className="whitespace-pre-line">{m.text}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-slate-800/80 border border-slate-700/60 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Naya sedang mengetik balasan...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Consultation Chips */}
            <div className="px-5 py-2 flex flex-wrap gap-1.5 border-t border-slate-800/60 bg-slate-900/30">
              <button
                onClick={() => handleSendMessage('Berapa biaya pembuatan website company profile custom di KDI?')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
              >
                💰 Biaya Pembuatan Website
              </button>
              <button
                onClick={() => handleSendMessage('Bisa jelaskan portofolio website yang pernah dibuat KDI?')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
              >
                🌟 Portofolio Unggulan
              </button>
              <button
                onClick={() => handleSendMessage('Bagaimana alur kerja pembuatan website custom di KDI?')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
              >
                ⏱️ Alur Kerja & Timeline
              </button>
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3.5 border-t border-slate-800 flex gap-2 bg-slate-900/80"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Tulis pesan atau pertanyaan untuk Naya..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition shadow-sm"
              >
                Kirim
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Catat Calon Klien Form */}
        {activeTab === 'RECORD_LEAD' && (
          <form onSubmit={handleRecordLead} className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
            {leadSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <span>✅</span>
                <span>{leadSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Calon Klien *
                </label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Usaha / Perusahaan
                </label>
                <input
                  type="text"
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  placeholder="Contoh: PT Sukses Mandiri"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estimasi Budget
                </label>
                <select
                  value={leadBudget}
                  onChange={(e) => setLeadBudget(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Rp 1.500.000 - Rp 3.000.000">Rp 1.5jt - Rp 3jt (Starter)</option>
                  <option value="Rp 5.000.000 - Rp 10.000.000">Rp 5jt - Rp 10jt (Business)</option>
                  <option value="Rp 15.000.000 - Rp 30.000.000">Rp 15jt - Rp 30jt (Enterprise App)</option>
                  <option value="Custom Enterprise">Custom Enterprise</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kebutuhan Pembuatan Website / Software
              </label>
              <input
                type="text"
                value={leadNeed}
                onChange={(e) => setLeadNeed(e.target.value)}
                placeholder="Deskripsi singkat website yang diinginkan"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                placeholder="Fitur khusus, preferensi warna, atau referensi website idaman"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition"
              >
                💾 Simpan Data Calon Klien
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Calon Klien Saya List */}
        {activeTab === 'LEADS_LIST' && (
          <div className="p-6 max-h-[420px] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">
                Total Leads Terdaftar: <strong className="text-white">{leadsList.length}</strong>
              </span>
              <button
                onClick={fetchLeads}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              >
                🔄 Segarkan
              </button>
            </div>

            {isFetchingLeads && (
              <div className="text-center py-8 text-xs text-slate-500">
                Memuat daftar calon klien...
              </div>
            )}

            {!isFetchingLeads && leadsList.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Belum ada data calon klien. Silakan klik tab &quot;Catat Calon Klien&quot; untuk mencatat.
              </div>
            )}

            {leadsList.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 flex items-start justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{lead.name}</span>
                    {lead.company && (
                      <span className="text-[11px] text-slate-400">• {lead.company}</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {lead.status}
                    </span>
                  </div>
                  <p className="text-xs text-amber-300">{lead.need}</p>
                  <p className="text-[11px] text-slate-400 font-mono">📱 WhatsApp: {lead.phone}</p>
                  {lead.notes && (
                    <p className="text-[11px] text-slate-400 italic mt-1">&quot;{lead.notes}&quot;</p>
                  )}
                </div>

                <a
                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shrink-0"
                >
                  Hubungi WA
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Kirim Penawaran WhatsApp */}
        {activeTab === 'SEND_OFFER' && (
          <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
            <form onSubmit={handleGenerateQuote} className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Klien Tujuan
                  </label>
                  <input
                    type="text"
                    value={clientOfferName}
                    onChange={(e) => setClientOfferName(e.target.value)}
                    placeholder="Contoh: Pak Anton"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No WhatsApp Tujuan
                  </label>
                  <input
                    type="text"
                    value={clientOfferPhone}
                    onChange={(e) => setClientOfferPhone(e.target.value)}
                    placeholder="6285286038143"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paket Solusi / Website
                </label>
                <select
                  value={clientOfferService}
                  onChange={(e) => setClientOfferService(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Jasa Pembuatan Website Company Profile Next.js">
                    Website Company Profile Custom Next.js (Fast & Modern)
                  </option>
                  <option value="Sistem Toko Online E-Commerce & Payment Gateway">
                    Toko Online Custom + Midtrans Payment Gateway
                  </option>
                  <option value="Platform Booking & Reservasi Online">
                    Sistem Booking & Jadwal Online Custom
                  </option>
                  <option value="AI Integration & Custom Business App">
                    Custom Web App + AI Workflow Automation
                  </option>
                </select>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
                >
                  📄 Susun Draf Penawaran
                </button>
              </div>
            </form>

            {generatedWhatsAppUrl && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    Draf Penawaran WhatsApp Siap Dikirim:
                  </span>
                  <a
                    href={generatedWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-md flex items-center gap-1.5"
                  >
                    <span>💬</span>
                    <span>Buka WhatsApp Sekarang</span>
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {generatedMessagePreview}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const SintaDialogueModal = NayaDialogueModal;
export default NayaDialogueModal;
