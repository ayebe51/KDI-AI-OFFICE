// ==========================================================
// apps/web/src/components/portfolio/PublicProjectShowcaseModal.tsx
// Rich Public Project Detail Modal with Live Links & Case Study
// ==========================================================

import React, { useState, useEffect } from 'react';
import type { PublicProject } from '@kdi/types';
import {
  ExternalLink,
  Github,
  X,
  Layers,
  BookOpen,
  Cpu,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Lock,
  Share2,
} from 'lucide-react';
import { ArchitectureViewer } from './ArchitectureViewer.js';
import { CaseStudySection } from './CaseStudySection.js';
import { AiContributionBadge } from './AiContributionBadge.js';
import { MediaGallery } from './MediaGallery.js';
import { validateSafeUrl, getSafeRepositoryNotice } from './SecurityUtils.js';

export interface PublicProjectShowcaseModalProps {
  project: PublicProject;
  onClose: () => void;
  onOpenGraphView?: (projectId: string) => void;
  isInternalOperator?: boolean;
}

export const PublicProjectShowcaseModal: React.FC<PublicProjectShowcaseModalProps> = ({
  project,
  onClose,
  onOpenGraphView,
  isInternalOperator = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'case_study' | 'team_ai' | 'media'>('overview');

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const repoInfo = getSafeRepositoryNotice(project.isRepositoryPublic, project.repositoryUrl);
  const isDemoSafe = validateSafeUrl(project.demoUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2a2622]/40 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-title"
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-2xl overflow-hidden text-[#2a2622]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="p-5 border-b border-[#b4ae9f] bg-[#fffcf5] flex items-start justify-between">
          <div className="space-y-1.5 max-w-[80%]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eee9df] border border-[#b4ae9f] text-[#2a2622] uppercase tracking-wider font-mono">
                {project.category}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#385747]/10 border border-[#385747]/30 text-[#385747] font-mono">
                {project.status}
              </span>
              <span className="text-[10px] text-[#5c554b] flex items-center space-x-1 font-mono">
                <Calendar className="w-3 h-3" />
                <span>{project.year}</span>
              </span>
            </div>

            <h3 id="project-title" className="text-lg sm:text-xl font-heading font-bold text-[#2a2622]">
              {project.name}
            </h3>

            <p className="text-xs text-[#5c554b] leading-relaxed">
              {project.shortDescription}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl bg-[#eee9df] hover:bg-[#e3dccd] text-[#5c554b] hover:text-[#2a2622] border border-[#b4ae9f] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Link Bar */}
        <div className="px-5 py-2.5 bg-[#f8f5ee] border-b border-[#b4ae9f] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Demo Link */}
            {project.demoUrl && isDemoSafe ? (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#2a2622] hover:bg-[#385747] text-[#fffcf5] font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <span>Launch Live Demo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-[#eee9df] text-[#5c554b] font-medium border border-[#b4ae9f] cursor-not-allowed">
                Demo Restricted
              </span>
            )}

            {/* Public vs Private Repository Link */}
            {repoInfo.isAvailable && repoInfo.safeUrl ? (
              <a
                href={repoInfo.safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#fffcf5] hover:bg-[#eee9df] text-[#2a2622] font-medium transition flex items-center space-x-1.5 border border-[#b4ae9f]"
              >
                <Github className="w-3.5 h-3.5" />
                <span>{repoInfo.label}</span>
              </a>
            ) : (
              <div
                title={repoInfo.notice}
                className="px-3 py-1.5 rounded-lg bg-[#eee9df] text-[#5c554b] text-[11px] font-medium flex items-center space-x-1.5 border border-[#b4ae9f] cursor-help"
              >
                <Lock className="w-3 h-3 text-[#5c554b]" />
                <span>{repoInfo.label}</span>
              </div>
            )}

            {/* Internal Operator Graph Pivot */}
            {isInternalOperator && onOpenGraphView && (
              <button
                onClick={() => onOpenGraphView(project.projectId)}
                className="px-3 py-1.5 rounded-lg bg-[#385747]/10 hover:bg-[#385747]/20 text-[#385747] border border-[#385747]/30 font-medium transition flex items-center space-x-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Graph Memory (Neo4j)</span>
              </button>
            )}
          </div>

          {/* Client Type Tag */}
          <span className="text-[11px] text-[#5c554b] font-mono">
            Client: {project.clientType}
          </span>
        </div>

        {/* Primary Tabs Navigation */}
        <div className="flex border-b border-[#b4ae9f] px-5 bg-[#fffcf5] overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#2a2622] text-[#2a2622] font-bold'
                : 'border-transparent text-[#5c554b] hover:text-[#2a2622]'
            }`}
          >
            <span>Project Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-[#2a2622] text-[#2a2622] font-bold'
                : 'border-transparent text-[#5c554b] hover:text-[#2a2622]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('case_study')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'case_study'
                ? 'border-[#2a2622] text-[#2a2622] font-bold'
                : 'border-transparent text-[#5c554b] hover:text-[#2a2622]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Case Study</span>
          </button>

          <button
            onClick={() => setActiveTab('team_ai')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'team_ai'
                ? 'border-[#2a2622] text-[#2a2622] font-bold'
                : 'border-transparent text-[#5c554b] hover:text-[#2a2622]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Human & AI Engineering</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-[#2a2622] text-[#2a2622] font-bold'
                : 'border-transparent text-[#5c554b] hover:text-[#2a2622]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media Assets</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-[#fffcf5]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 text-xs">
              {/* Problem & Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] space-y-2">
                  <h4 className="font-semibold text-[#c2410c] uppercase tracking-wider font-mono">
                    The Problem
                  </h4>
                  <p className="text-[#5c554b] leading-relaxed">{project.problem}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] space-y-2">
                  <h4 className="font-semibold text-[#385747] uppercase tracking-wider font-mono">
                    Engineered Solution
                  </h4>
                  <p className="text-[#5c554b] leading-relaxed">{project.solution}</p>
                </div>
              </div>

              {/* Technologies Stack Chips */}
              <div className="space-y-2">
                <h4 className="font-semibold text-[#2a2622] uppercase tracking-wider font-mono">
                  Technology Stack
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {project.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[#eee9df] border border-[#b4ae9f] text-[#2a2622] font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Features */}
              {project.features && project.features.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-[#2a2622] uppercase tracking-wider font-mono">
                    Key Platform Capabilities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.features.map((feat) => (
                      <div
                        key={feat.featureId}
                        className="p-3.5 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#2a2622]">{feat.name}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#385747]/10 border border-[#385747]/30 text-[#385747]">
                            {feat.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5c554b] leading-normal">
                          {feat.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Metrics / Outcomes */}
              {project.results && project.results.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-[#2a2622] uppercase tracking-wider flex items-center space-x-1.5 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#385747]" />
                    <span>Verified Performance Metrics</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {project.results.map((res) => (
                      <div
                        key={res.metricId}
                        className="p-3.5 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] text-center space-y-1"
                      >
                        <div className="text-xl font-heading font-bold text-[#2a2622]">
                          {res.value}
                        </div>
                        <div className="text-[11px] text-[#2a2622] font-medium">{res.label}</div>
                        {res.unit && (
                          <div className="text-[9px] text-[#5c554b] font-mono">{res.unit}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Architecture Tab */}
          {activeTab === 'architecture' && (
            <ArchitectureViewer architecture={project.architecture} />
          )}

          {/* Case Study Tab */}
          {activeTab === 'case_study' && (
            <CaseStudySection caseStudy={project.caseStudy} />
          )}

          {/* Team & AI Tab */}
          {activeTab === 'team_ai' && (
            <AiContributionBadge
              aiContribution={project.aiContribution}
              team={project.team}
            />
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <MediaGallery
              media={project.media}
              screenshots={project.screenshots}
              videos={project.videos}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#b4ae9f] bg-[#f8f5ee] flex items-center justify-between text-xs text-[#5c554b]">
          <span className="font-mono text-[11px]">
            SLUG: /project/{project.slug}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2622] hover:bg-[#385747] text-[#fffcf5] rounded-xl font-semibold transition shadow-xs"
          >
            Close Showcase
          </button>
        </div>
      </div>
    </div>
  );
};
