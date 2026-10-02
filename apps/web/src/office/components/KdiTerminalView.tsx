// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// KdiTerminalView: Authenticated Remote Execution Terminal (xterm.js)
// Visualizes sanitized KDI Agent Runtime stream (Section 5 & 16)
// ==========================================================

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useKdiOfficeStore } from '../state/kdiOfficeStore';

export const KdiTerminalView: React.FC = () => {
  const activeAgentId = useKdiOfficeStore((s) => s.activeTerminalAgentId);
  const closeTerminal = useKdiOfficeStore((s) => s.closeTerminal);
  const terminalLogs = useKdiOfficeStore((s) => s.terminalLogs);
  const snapshot = useKdiOfficeStore((s) => s.snapshot);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLineCountRef = useRef(0);

  const [copied, setCopied] = useState(false);

  const agent = activeAgentId ? snapshot.agents[activeAgentId] : null;
  const currentLogs = activeAgentId ? (terminalLogs[activeAgentId] || []) : [];

  useEffect(() => {
    if (!activeAgentId || !terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#090d16',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f1f5f9',
      },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.3,
      convertEol: true,
      cursorBlink: true,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;36m=== KDI AGENT RUNTIME EXECUTION TELEMETRY ===\x1b[0m');
    term.writeln(`\x1b[90mAgent: ${agent?.displayName || activeAgentId} | Role: ${agent?.role || 'Engineer'}\x1b[0m`);
    term.writeln('\x1b[90mSecurity: KDI SecretSanitizer Active | Node-PTY: Remote-Only\x1b[0m');
    term.writeln('');

    // Write existing logs
    for (const line of currentLogs) {
      term.writeln(line);
    }
    lastLineCountRef.current = currentLogs.length;

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermInstance.current = null;
      fitAddonRef.current = null;
      lastLineCountRef.current = 0;
    };
  }, [activeAgentId]);

  // Append new logs as they arrive
  useEffect(() => {
    if (!xtermInstance.current || !activeAgentId) return;
    if (currentLogs.length > lastLineCountRef.current) {
      const newLines = currentLogs.slice(lastLineCountRef.current);
      for (const line of newLines) {
        xtermInstance.current.writeln(line);
      }
      lastLineCountRef.current = currentLogs.length;
    }
  }, [currentLogs, activeAgentId]);

  if (!activeAgentId) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentLogs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.writeln('\x1b[90m[Terminal output cleared by user]\x1b[0m');
    }
  };

  return (
    <div className="absolute inset-x-6 bottom-6 z-40 h-80 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6">
      {/* Terminal Title Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200">
            {agent?.displayName || 'Agent'} — Execution Stream
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/40">
            STREAMING (WS)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={closeTerminal}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
            title="Close Terminal"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Terminal Canvas Container */}
      <div className="flex-1 p-2 bg-[#090d16] overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
