// ==========================================================
// apps/web/src/components/portfolio/CaseStudySection.tsx
// Comprehensive In-Depth Engineering Case Study Presentation
// ==========================================================

import React, { useState } from 'react';
import type { CaseStudy } from '@kdi/types';
import { BookOpen, CheckCircle, AlertTriangle, Lightbulb, Rocket, ShieldCheck } from 'lucide-react';

export interface CaseStudySectionProps {
  caseStudy?: CaseStudy;
}

export const CaseStudySection: React.FC<CaseStudySectionProps> = ({ caseStudy }) => {
  const [activeSubTab, setActiveSubTab] = useState<'narrative' | 'constraints' | 'execution' | 'outcomes'>('narrative');

  if (!caseStudy) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
        Detailed case study not published for this project.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => setActiveSubTab('narrative')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'narrative'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Context & Problem
        </button>

        <button
          onClick={() => setActiveSubTab('constraints')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'constraints'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Constraints & Approach
        </button>

        <button
          onClick={() => setActiveSubTab('execution')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'execution'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Implementation & Testing
        </button>

        <button
          onClick={() => setActiveSubTab('outcomes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'outcomes'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Lessons & Future
        </button>
      </div>

      {/* Narrative Sub-tab */}
      {activeSubTab === 'narrative' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-semibold text-amber-400 flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Institutional Context</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">{caseStudy.context}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-semibold text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Core Business & Technical Bottleneck</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">{caseStudy.problem}</p>
          </div>
        </div>
      )}

      {/* Constraints & Approach Sub-tab */}
      {activeSubTab === 'constraints' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h5 className="font-semibold text-amber-400 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Technical & Regulatory Constraints</span>
            </h5>
            <ul className="space-y-1.5 pl-1">
              {caseStudy.constraints.map((c, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-semibold text-emerald-400 flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Architectural Strategy & Formulation</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">{caseStudy.approach}</p>
          </div>
        </div>
      )}

      {/* Execution Sub-tab */}
      {activeSubTab === 'execution' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-semibold text-sky-400 flex items-center space-x-2">
              <span>Implementation Mechanics</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">{caseStudy.implementation}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-semibold text-emerald-400 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Automated Verification & Testing Strategy</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">{caseStudy.testing}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-semibold text-purple-400 flex items-center space-x-2">
              <Rocket className="w-4 h-4" />
              <span>Deployment & Operational Rollout</span>
            </h5>
            <p className="text-slate-300 leading-relaxed">{caseStudy.deployment}</p>
          </div>
        </div>
      )}

      {/* Lessons & Future Sub-tab */}
      {activeSubTab === 'outcomes' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h5 className="font-semibold text-emerald-400 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Key Architectural Lessons Learned</span>
            </h5>
            <ul className="space-y-1.5 pl-1">
              {caseStudy.lessonsLearned.map((lesson, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
          </div>

          {caseStudy.futureImprovements && caseStudy.futureImprovements.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <h5 className="font-semibold text-sky-400 flex items-center space-x-2">
                <Rocket className="w-4 h-4" />
                <span>Planned Evolutions & Roadmap</span>
              </h5>
              <ul className="space-y-1.5 pl-1">
                {caseStudy.futureImprovements.map((imp, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-slate-300">
                    <span className="text-sky-400 font-bold">→</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
