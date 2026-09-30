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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-title"
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between">
          <div className="space-y-1.5 max-w-[80%]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 uppercase tracking-wider">
                {project.category}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                {project.status}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{project.year}</span>
              </span>
            </div>

            <h3 id="project-title" className="text-lg sm:text-xl font-heading font-bold text-slate-100">
              {project.name}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {project.shortDescription}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Link Bar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Demo Link */}
            {project.demoUrl && isDemoSafe ? (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <span>Launch Live Demo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-500 font-medium cursor-not-allowed">
                Demo Restricted
              </span>
            )}

            {/* Public vs Private Repository Link */}
            {repoInfo.isAvailable && repoInfo.safeUrl ? (
              <a
                href={repoInfo.safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center space-x-1.5 border border-slate-700"
              >
                <Github className="w-3.5 h-3.5" />
                <span>{repoInfo.label}</span>
              </a>
            ) : (
              <div
                title={repoInfo.notice}
                className="px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 text-[11px] font-medium flex items-center space-x-1.5 border border-slate-800 cursor-help"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>{repoInfo.label}</span>
              </div>
            )}

            {/* Internal Operator Graph Pivot */}
            {isInternalOperator && onOpenGraphView && (
              <button
                onClick={() => onOpenGraphView(project.projectId)}
                className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium transition flex items-center space-x-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Graph Memory (Neo4j)</span>
              </button>
            )}
          </div>

          {/* Client Type Tag */}
          <span className="text-[11px] text-slate-400 font-mono">
            Client: {project.clientType}
          </span>
        </div>

        {/* Primary Tabs Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Project Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('case_study')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'case_study'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Case Study</span>
          </button>

          <button
            onClick={() => setActiveTab('team_ai')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'team_ai'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Human & AI Engineering</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media Assets</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 text-xs">
              {/* Problem & Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-rose-400 uppercase tracking-wider">
                    The Problem
                  </h4>
                  <p className="text-slate-300 leading-relaxed">{project.problem}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-emerald-400 uppercase tracking-wider">
                    Engineered Solution
                  </h4>
                  <p className="text-slate-300 leading-relaxed">{project.solution}</p>
                </div>
              </div>

              {/* Technologies Stack Chips */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-300 uppercase tracking-wider">
                  Technology Stack
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {project.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Features */}
              {project.features && project.features.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider">
                    Key Platform Capabilities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.features.map((feat) => (
                      <div
                        key={feat.featureId}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{feat.name}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                            {feat.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
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
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Performance Metrics</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {project.results.map((res) => (
                      <div
                        key={res.metricId}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1"
                      >
                        <div className="text-xl font-heading font-bold text-amber-400">
                          {res.value}
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium">{res.label}</div>
                        {res.unit && (
                          <div className="text-[9px] text-slate-500 font-mono">{res.unit}</div>
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            SLUG: /project/{project.slug}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition"
          >
            Close Showcase
          </button>
        </div>
      </div>
    </div>
  );
};
