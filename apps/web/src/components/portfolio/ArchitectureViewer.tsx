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
      <div className="p-8 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] text-center text-[#5c554b] text-xs">
        Architecture specification not published for this project.
      </div>
    );
  }

  const getLayerIcon = (layer: ProjectArchitectureComponent['layer']) => {
    switch (layer) {
      case 'FRONTEND':
        return <Globe className="w-4 h-4 text-sky-600" />;
      case 'BACKEND':
      case 'API':
        return <Server className="w-4 h-4 text-[#385747]" />;
      case 'DATABASE':
      case 'CACHE':
        return <Database className="w-4 h-4 text-amber-700" />;
      case 'AI':
        return <Cpu className="w-4 h-4 text-purple-700" />;
      case 'INFRASTRUCTURE':
      default:
        return <ShieldCheck className="w-4 h-4 text-indigo-700" />;
    }
  };

  const getLayerColor = (layer: ProjectArchitectureComponent['layer']) => {
    switch (layer) {
      case 'FRONTEND':
        return 'border-sky-300 bg-sky-50 text-sky-800';
      case 'BACKEND':
      case 'API':
        return 'border-emerald-300 bg-emerald-50 text-emerald-800';
      case 'DATABASE':
      case 'CACHE':
        return 'border-amber-300 bg-amber-50 text-amber-800';
      case 'AI':
        return 'border-purple-300 bg-purple-50 text-purple-800';
      case 'INFRASTRUCTURE':
      default:
        return 'border-indigo-300 bg-indigo-50 text-indigo-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#385747] uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Architectural Philosophy</span>
        </div>
        <p className="text-xs text-[#5c554b] leading-relaxed">{architecture.overview}</p>
      </div>

      {/* Structured Tiered Components */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#2a2622] uppercase tracking-wider">
          System Tiers & Component Topology
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {architecture.components.map((comp) => (
            <div
              key={comp.componentId}
              className="p-3.5 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] hover:border-[#2a2622] transition space-y-2 shadow-2xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#eee9df] border border-[#b4ae9f]">
                    {getLayerIcon(comp.layer)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#2a2622]">{comp.name}</h5>
                    <span className="text-[10px] text-[#5c554b] block">{comp.technology}</span>
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

              <p className="text-[11px] text-[#5c554b] leading-normal">{comp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Flow Steps */}
      {architecture.dataFlow && architecture.dataFlow.length > 0 && (
        <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-3">
          <h4 className="text-xs font-semibold text-[#2a2622] uppercase tracking-wider flex items-center space-x-2">
            <span>Verified Request & Data Flow</span>
          </h4>

          <div className="space-y-2 text-xs">
            {architecture.dataFlow.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-3 text-[#2a2622]">
                <div className="w-5 h-5 rounded-full bg-[#eee9df] border border-[#b4ae9f] flex items-center justify-center text-[10px] font-bold text-[#385747] shrink-0">
                  {idx + 1}
                </div>
                <div className="pt-0.5 flex-1 leading-relaxed flex items-center space-x-1.5">
                  <span className="text-[#5c554b]">{step}</span>
                  {idx < (architecture.dataFlow?.length ?? 0) - 1 && (
                    <ArrowRight className="w-3 h-3 text-[#b4ae9f] hidden sm:inline shrink-0" />
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
