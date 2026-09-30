// ==========================================================
// apps/web/src/components/portfolio/ArchitectureViewer.tsx
// Interactive Structured System Architecture Presentation
// ==========================================================

import React from 'react';
import type { ProjectArchitecture, ProjectArchitectureComponent } from '@kdi/types';
import { Layers, Server, Database, Cpu, Globe, ArrowRight, ShieldCheck } from 'lucide-react';

export interface ArchitectureViewerProps {
  architecture?: ProjectArchitecture;
}

export const ArchitectureViewer: React.FC<ArchitectureViewerProps> = ({ architecture }) => {
  if (!architecture) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
        Architecture specification not published for this project.
      </div>
    );
  }

  const getLayerIcon = (layer: ProjectArchitectureComponent['layer']) => {
    switch (layer) {
      case 'FRONTEND':
        return <Globe className="w-4 h-4 text-sky-400" />;
      case 'BACKEND':
      case 'API':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'DATABASE':
      case 'CACHE':
        return <Database className="w-4 h-4 text-amber-400" />;
      case 'AI':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'INFRASTRUCTURE':
      default:
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getLayerColor = (layer: ProjectArchitectureComponent['layer']) => {
    switch (layer) {
      case 'FRONTEND':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
      case 'BACKEND':
      case 'API':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'DATABASE':
      case 'CACHE':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
      case 'AI':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
      case 'INFRASTRUCTURE':
      default:
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Architectural Philosophy</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{architecture.overview}</p>
      </div>

      {/* Structured Tiered Components */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          System Tiers & Component Topology
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {architecture.components.map((comp) => (
            <div
              key={comp.componentId}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {getLayerIcon(comp.layer)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">{comp.name}</h5>
                    <span className="text-[10px] text-slate-400 block">{comp.technology}</span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-medium ${getLayerColor(
                    comp.layer
                  )}`}
                >
                  {comp.layer}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-normal">{comp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Flow Steps */}
      {architecture.dataFlow && architecture.dataFlow.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <span>Verified Request & Data Flow</span>
          </h4>

          <div className="space-y-2 text-xs">
            {architecture.dataFlow.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                  {idx + 1}
                </div>
                <div className="pt-0.5 flex-1 leading-relaxed flex items-center space-x-1.5">
                  <span>{step}</span>
                  {idx < (architecture.dataFlow?.length ?? 0) - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-600 hidden sm:inline shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
