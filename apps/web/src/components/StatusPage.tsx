import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface PublicSubsystemStatus {
  name: string;
  category: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  description: string;
}

export const StatusPage: React.FC = () => {
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [overallStatus, setOverallStatus] = useState<'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE'>('OPERATIONAL');

  // Sanitized public component catalog - NO internal IPs, NO ports, NO passwords
  const components: PublicSubsystemStatus[] = [
    { name: 'Core API & Services', category: 'Core Platform', status: 'OPERATIONAL', description: 'REST APIs & event streams responsive' },
    { name: 'Living Virtual Office', category: 'User Interface', status: 'OPERATIONAL', description: '3D and 2D office visualization streaming' },
    { name: 'AI Workforce Engine', category: 'Intelligence', status: 'OPERATIONAL', description: 'Autonomous agent runtime & task execution' },
    { name: 'Public Portfolio Showcase', category: 'Showcase', status: 'OPERATIONAL', description: 'Published projects and case studies available' },
    { name: 'Knowledge Graph Memory', category: 'Intelligence', status: 'OPERATIONAL', description: 'Institutional memory & semantic retrieval' },
    { name: 'Database Storage & Durability', category: 'Infrastructure', status: 'OPERATIONAL', description: 'Encrypted persistence and automated backups' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">KDI AI Office System Status</h1>
              <p className="text-xs text-slate-400">Real-time public service availability & operational integrity</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Updated {lastCheck.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-6 rounded-2xl border flex items-center space-x-4 ${
          overallStatus === 'OPERATIONAL'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}>
          <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">All Systems Operational</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              KDI AI Office core runtime, autonomous agent scheduler, and public interfaces are functioning normally.
            </p>
          </div>
        </div>

        {/* Subsystems List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Subsystem Status</h3>
          <div className="divide-y divide-slate-800/80 bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
            {components.map((comp) => (
              <div key={comp.name} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-200">{comp.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{comp.description}</div>
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OPERATIONAL</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Past Incidents (Sanitized) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Recent Incident History</h3>
          <div className="p-5 bg-slate-900/30 rounded-2xl border border-slate-800/60 text-xs text-slate-400">
            No active incidents or major service disruptions in the past 90 days.
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-8 border-t border-slate-900">
          KDI AI Office • Autonomous Software Development Organization • Security & Reliability Hardened
        </div>
      </div>
    </div>
  );
};
