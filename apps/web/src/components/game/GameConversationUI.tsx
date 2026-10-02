// ==========================================================
// components/game/GameConversationUI.tsx
// Game-like Conversation Dialog Panel
// Connects to KDI backend /api/agents/:id/chat
// ==========================================================

import React, { useState, useRef, useEffect } from 'react';
import type { OfficeAgentDetail } from '@kdi/types';

interface Message {
  role: 'player' | 'agent';
  text: string;
  timestamp: number;
}

interface GameConversationUIProps {
  agent: OfficeAgentDetail;
  isInternalMode: boolean;
  apiUrl: string;
  token?: string | null;
  onClose: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  AI_MANAGER: '#eab308',
  SYSTEM_ARCHITECT: '#8b5cf6',
  RESEARCHER: '#a855f7',
  QA_ENGINEER: '#06b6d4',
  SECURITY_ENGINEER: '#ef4444',
  SOFTWARE_ENGINEER: '#10b981',
};

const STARTER_SUGGESTIONS = [
  'Apa yang sedang kamu kerjakan?',
  'Ceritakan tentang proyekmu',
  'Bagaimana progress hari ini?',
  'Apa keahlianmu?',
];

export const GameConversationUI: React.FC<GameConversationUIProps> = ({
  agent,
  isInternalMode,
  apiUrl,
  token,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      text: `Hai! Saya ${agent.name}. ${isInternalMode ? 'Ada yang bisa saya bantu?' : 'Selamat datang! Silakan tanya tentang pekerjaan kami.'}`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const agentColor = ROLE_COLORS[agent.role] || '#10b981';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input when dialog opens
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');

    const userMsg: Message = { role: 'player', text: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/agents/${agent.agentId}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text.trim(),
          context: isInternalMode ? 'INTERNAL' : 'PUBLIC',
        }),
      });

      let reply = '';
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || data.message || data.response || 'Saya sedang memproses...';
      } else {
        // Graceful fallback — agent responds based on their state
        reply = generateFallbackReply(agent, text, isInternalMode);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: reply, timestamp: Date.now() },
      ]);
    } catch {
      const reply = generateFallbackReply(agent, text, isInternalMode);
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: reply, timestamp: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center pb-8 px-4"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="w-full max-w-lg"
        style={{
          pointerEvents: 'auto',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Dialog Panel */}
        <div
          style={{
            background: 'rgba(2,6,23,0.95)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${agentColor}44`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 -4px 40px ${agentColor}22, 0 24px 80px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Agent Portrait Header */}
          <div
            className="flex items-center gap-4 px-5 py-4"
            style={{
              borderBottom: `1px solid ${agentColor}22`,
              background: `linear-gradient(90deg, ${agentColor}11, transparent)`,
            }}
          >
            {/* Portrait */}
            <div
              style={{
                width: 48,
                height: 56,
                borderRadius: 12,
                border: `2px solid ${agentColor}55`,
                background: `linear-gradient(160deg, ${agentColor}22, rgba(2,6,23,0.8))`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Mini avatar in portrait */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
                marginBottom: 2,
              }} />
              <div style={{
                width: 24, height: 22, borderRadius: '6px 6px 4px 4px',
                background: agentColor,
              }} />
              {/* Activity dot */}
              <div style={{
                position: 'absolute',
                bottom: 4, right: 4,
                width: 7, height: 7,
                borderRadius: '50%',
                background: '#10b981',
                border: '1.5px solid rgba(2,6,23,0.8)',
                animation: 'pulse 2s infinite',
              }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-bold truncate">{agent.name}</div>
              <div className="text-xs font-mono truncate" style={{ color: agentColor }}>
                {agent.role.replace(/_/g, ' ')}
              </div>
              {agent.activityState && (
                <div className="text-slate-500 text-[10px] mt-0.5 truncate">
                  {agent.activityState}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition p-1.5 rounded-lg hover:bg-white/5"
            >
              ✕
            </button>
          </div>

          {/* Message Area */}
          <div
            ref={scrollRef}
            className="px-4 py-4 space-y-3 overflow-y-auto"
            style={{ maxHeight: 260, minHeight: 120 }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '9px 14px',
                    borderRadius: msg.role === 'player'
                      ? '16px 4px 16px 16px'
                      : '4px 16px 16px 16px',
                    background: msg.role === 'player'
                      ? 'rgba(234,179,8,0.15)'
                      : `linear-gradient(135deg, ${agentColor}18, rgba(15,23,42,0.6))`,
                    border: msg.role === 'player'
                      ? '1px solid rgba(234,179,8,0.25)'
                      : `1px solid ${agentColor}22`,
                    color: msg.role === 'player' ? '#fcd34d' : '#e2e8f0',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: '4px 16px 16px 16px',
                    background: `${agentColor}15`,
                    border: `1px solid ${agentColor}22`,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: agentColor,
                        animation: `bounce 0.8s ${i * 0.15}s infinite ease-in-out`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {STARTER_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: `1px solid ${agentColor}33`,
                    color: agentColor,
                    background: `${agentColor}10`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${agentColor}25`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${agentColor}10`;
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div
            className="px-4 py-3 flex gap-3"
            style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage(input);
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Tulis pesan..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '9px 14px',
                color: 'white',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: input.trim() && !isLoading ? agentColor : 'rgba(255,255,255,0.05)',
                color: input.trim() && !isLoading ? '#020617' : '#475569',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              Kirim
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

// Fallback reply generator when backend is unavailable
function generateFallbackReply(
  agent: OfficeAgentDetail,
  _question: string,
  isInternal: boolean
): string {
  const state = agent.activityState || 'IDLE';
  const roleName = agent.role.replace(/_/g, ' ').toLowerCase();

  if (!isInternal) {
    const publicReplies = [
      `Halo! Saya adalah ${agent.name}, ${roleName} di KDI AI Office. Kami membangun solusi software berkualitas tinggi.`,
      `Saya sedang bekerja pada proyek-proyek menarik. Apa yang ingin kamu ketahui tentang kapabilitas kami?`,
      `Senang bertemu denganmu! Sebagai ${roleName}, saya membantu menghadirkan inovasi teknologi untuk klien kami.`,
    ];
    return publicReplies[Math.floor(Math.random() * publicReplies.length)];
  }

  const internalReplies: Record<string, string[]> = {
    WORKING: [
      `Saya sedang fokus mengerjakan task saat ini. Progress berjalan sesuai rencana.`,
      `Sedang dalam mode kerja intensif. Ada yang perlu diprioritaskan?`,
    ],
    IDLE: [
      `Saya sedang standby. Siap menerima task baru kapan saja.`,
      `Tidak ada task aktif saat ini. Ada yang perlu saya kerjakan?`,
    ],
    MEETING: [
      `Saya sedang dalam sesi kolaborasi. Bisa kita diskusikan setelah selesai?`,
    ],
    PRAYER: [
      `Sedang istirahat sebentar. Segera kembali.`,
    ],
  };

  const replies = internalReplies[state] || internalReplies['IDLE'];
  return replies[Math.floor(Math.random() * replies.length)];
}
