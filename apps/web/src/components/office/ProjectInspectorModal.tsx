// ==========================================================
// components/office/ProjectInspectorModal.tsx
// Project Showcase & Focused Graph Relationship Visualizer
// ==========================================================

import React, { useState } from 'react';
import type { OfficeProjectItem } from '@kdi/types';
import { Layers, Share2, Cpu, CheckCircle2, X } from 'lucide-react';

export interface ProjectInspectorModalProps {
  project: OfficeProjectItem;
  isInternalMode: boolean;
  onClose: () => void;
}

export const ProjectInspectorModal: React.FC<ProjectInspectorModalProps> = ({
  project,
  isInternalMode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'graph'>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-pink-500/40 bg-slate-900 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 font-bold font-heading">
              {project.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-100">{project.name}</h3>
              <p className="text-xs text-pink-400 font-mono">
                {project.category} • {project.status} • {project.year || '2026'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-pink-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Project Overview
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeTab === 'graph'
                ? 'bg-pink-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Focused Graph (3-Hop)</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              {project.description}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block mb-1">Active AI Workforce</span>
                <span className="text-emerald-400 font-semibold text-sm">
                  {project.activeAgents} Agents Assigned
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block mb-1">Engineering Tasks</span>
                <span className="text-amber-400 font-semibold text-sm">
                  {project.currentTasks} Active Pipelines
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-2 font-medium">Technology Stack</span>
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700 font-mono text-[11px]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400">
                <span>Neo4j Bounded 3-Hop Graph Topology:</span>
                <span className="text-[10px] text-pink-400 font-mono">Hop Bound: 3 max</span>
              </div>

              {/* Graphical Node representation */}
              <div className="py-6 flex flex-col items-center justify-center space-y-4">
                {/* Root Project Node */}
                <div className="px-4 py-2 rounded-xl bg-pink-500/20 border-2 border-pink-500 text-pink-300 font-bold font-heading shadow-lg shadow-pink-500/20 flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>[Project: {project.name}]</span>
                </div>

                <div className="h-6 w-0.5 bg-slate-700"></div>

                {/* Second Hop: Tasks & Tech */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-center">
                    <span className="text-slate-400 text-[10px] block">HAS_TASK</span>
                    <span className="text-amber-400 font-mono">Task: AST Refactor</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-center">
                    <span className="text-slate-400 text-[10px] block">USES</span>
                    <span className="text-blue-400 font-mono">Tech: React/Vite</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-center">
                    <span className="text-slate-400 text-[10px] block">HAS_DECISION</span>
                    <span className="text-emerald-400 font-mono">ADR-021 Runtime</span>
                  </div>
                </div>

                <div className="h-4 w-0.5 bg-slate-700"></div>

                {/* Third Hop: Agents Executed */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-center w-full">
                  <span className="text-slate-400 text-[10px] block">ASSIGNED_TO</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    Agent: Farhan (AI Software Engineer)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
