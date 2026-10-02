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
      <div className="p-8 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] text-center text-[#5c554b] text-xs">
        Detailed case study not published for this project.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#eee9df] border border-[#b4ae9f]">
        <button
          onClick={() => setActiveSubTab('narrative')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'narrative'
              ? 'bg-[#2a2622] text-[#fffcf5] font-semibold shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          Context & Problem
        </button>

        <button
          onClick={() => setActiveSubTab('constraints')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'constraints'
              ? 'bg-[#2a2622] text-[#fffcf5] font-semibold shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          Constraints & Approach
        </button>

        <button
          onClick={() => setActiveSubTab('execution')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'execution'
              ? 'bg-[#2a2622] text-[#fffcf5] font-semibold shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          Implementation & Testing
        </button>

        <button
          onClick={() => setActiveSubTab('outcomes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeSubTab === 'outcomes'
              ? 'bg-[#2a2622] text-[#fffcf5] font-semibold shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          Lessons & Future
        </button>
      </div>

      {/* Narrative Sub-tab */}
      {activeSubTab === 'narrative' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
            <h5 className="font-semibold text-[#385747] flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Institutional Context</span>
            </h5>
            <p className="text-[#5c554b] leading-relaxed">{caseStudy.context}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
            <h5 className="font-semibold text-[#c2410c] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Core Business & Technical Bottleneck</span>
            </h5>
            <p className="text-[#5c554b] leading-relaxed">{caseStudy.problem}</p>
          </div>
        </div>
      )}

      {/* Constraints & Approach Sub-tab */}
      {activeSubTab === 'constraints' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2.5">
            <h5 className="font-semibold text-[#2a2622] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#385747]" />
              <span>Technical & Regulatory Constraints</span>
            </h5>
            <ul className="space-y-1.5 pl-1">
              {caseStudy.constraints.map((c, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-[#5c554b]">
                  <span className="text-[#c2410c] font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
            <h5 className="font-semibold text-[#385747] flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Architectural Strategy & Formulation</span>
            </h5>
            <p className="text-[#5c554b] leading-relaxed">{caseStudy.approach}</p>
          </div>
        </div>
      )}

      {/* Execution Sub-tab */}
      {activeSubTab === 'execution' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
            <h5 className="font-semibold text-[#2a2622] flex items-center space-x-2">
              <span>Implementation Mechanics</span>
            </h5>
            <p className="text-[#5c554b] leading-relaxed">{caseStudy.implementation}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
            <h5 className="font-semibold text-[#385747] flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Automated Verification & Testing Strategy</span>
            </h5>
            <p className="text-[#5c554b] leading-relaxed">{caseStudy.testing}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2">
            <h5 className="font-semibold text-purple-700 flex items-center space-x-2">
              <Rocket className="w-4 h-4" />
              <span>Deployment & Operational Rollout</span>
            </h5>
            <p className="text-[#5c554b] leading-relaxed">{caseStudy.deployment}</p>
          </div>
        </div>
      )}

      {/* Lessons & Future Sub-tab */}
      {activeSubTab === 'outcomes' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2.5">
            <h5 className="font-semibold text-[#385747] flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Key Architectural Lessons Learned</span>
            </h5>
            <ul className="space-y-1.5 pl-1">
              {caseStudy.lessonsLearned.map((lesson, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-[#5c554b]">
                  <span className="text-[#385747] font-bold">✓</span>
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
          </div>

          {caseStudy.futureImprovements && caseStudy.futureImprovements.length > 0 && (
            <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-2.5">
              <h5 className="font-semibold text-[#2a2622] flex items-center space-x-2">
                <Rocket className="w-4 h-4 text-[#385747]" />
                <span>Planned Evolutions & Roadmap</span>
              </h5>
              <ul className="space-y-1.5 pl-1">
                {caseStudy.futureImprovements.map((imp, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-[#5c554b]">
                    <span className="text-[#385747] font-bold">→</span>
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
