// ==========================================================
// apps/web/src/components/portfolio/PortfolioGalleryView.tsx
// Public 2D Portfolio Showcase Page with Filters, Search & Modal
// ==========================================================

import React, { useState, useEffect, useMemo } from 'react';
import type { PublicProject } from '@kdi/types';
import {
  Search,
  Box,
  Layers,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { PublicProjectShowcaseModal } from './PublicProjectShowcaseModal.js';
import { applyDocumentSeo, generateProjectSeo } from './SeoMetadata.js';
import { validateSafeUrl } from './SecurityUtils.js';

export interface PortfolioGalleryViewProps {
  apiUrl?: string;
  onNavigateTo3D?: () => void;
  onOpenProjectSlug?: string;
}

// Fallback initial public cache if API container is slow or offline
const FALLBACK_PUBLIC_PROJECTS: PublicProject[] = [
  {
    projectId: 'prj_01_simmaci',
    slug: 'simmaci',
    name: 'SIMMACI — Academic Management & Student Statistics',
    shortDescription: 'Enterprise academic management platform and reactive statistical intelligence ecosystem for Islamic institutions.',
    description: 'SIMMACI is a mission-critical web application engineered for Islamic higher education institutions. It automates student evaluation, competition scoring resets, academic decree generation, and multi-dimensional statistical reporting with strict role-based access control.',
    category: 'Web Application',
    projectType: 'WEB_APP',
    status: 'Production Active',
    year: '2026',
    clientType: 'Higher Education / Pesantren',
    problem: 'Manual decree tracking and fragmented student competition records caused administrative backlogs.',
    solution: 'Designed and deployed a high-throughput reactive architecture featuring automated batch reset commands.',
    role: 'Lead Architect & Fullstack Development with Autonomous AI Engineering',
    technologies: ['Laravel', 'PHP', 'React', 'TypeScript', 'MySQL', 'TailwindCSS'],
    features: [
      { featureId: 'ft_1', projectId: 'prj_01_simmaci', name: 'Decree Batch Generation & Export', description: 'Automated streaming export', status: 'PRODUCTION', sortOrder: 1 },
      { featureId: 'ft_2', projectId: 'prj_01_simmaci', name: 'Reactive Student Statistics Portal', description: 'Dean analytical dashboard', status: 'PRODUCTION', sortOrder: 2 },
    ],
    aiContribution: {
      humanContribution: 'Core business domain rules, university stakeholder interviews, regulatory compliance review.',
      aiContribution: 'Autonomous code generation for export jobs, automated PHPUnit regression suites, AST refactoring.',
      engineeringAgents: ['Farhan (Software Engineer)', 'Nadia (QA Engineer)', 'Ahmad (System Architect)'],
    },
    screenshots: [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [],
    media: [],
    demoUrl: 'https://demo.simmaci.kdi-office.id',
    repositoryUrl: 'https://github.com/kdi-ai-office/simmaci-public-demo',
    isRepositoryPublic: true,
    timeline: [],
    team: [
      { memberId: 'm1', name: 'Principal Human Architect', role: 'Solutions Architect', isAi: false, responsibilities: ['Governance'] },
      { memberId: 'm2', name: 'Farhan', role: 'Lead Software Engineer', isAi: true, responsibilities: ['Development'] },
    ],
    results: [
      { metricId: 'r1', label: 'Export Processing Time', value: '94%', unit: 'Reduction', verified: true },
      { metricId: 'r2', label: 'Concurrent Users Supported', value: '1,200+', unit: 'Users', verified: true },
    ],
    featured: true,
    sortOrder: 1,
    updatedAt: '2026-09-25T14:30:00Z',
  },
  {
    projectId: 'prj_02_koneksi_santri',
    slug: 'koneksi-santri',
    name: 'Koneksi Santri — Pesantren Digital Ecosystem',
    shortDescription: 'Multi-tenant cloud platform connecting pesantren administration, digital financial ledgers, and guardian real-time updates.',
    description: 'Koneksi Santri empowers Islamic boarding institutions with centralized student management and cashless digital wallets.',
    category: 'SaaS Platform',
    projectType: 'SAAS',
    status: 'Production Active',
    year: '2026',
    clientType: 'Pesantren Consortium',
    problem: 'Cash-based allowance management led to loss and dispute.',
    solution: 'Engineered an end-to-end multi-tenant SaaS platform featuring digital wallets for santri.',
    role: 'Full Lifecycle Multi-Agent Product Engineering',
    technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'TailwindCSS', 'Redis'],
    features: [],
    aiContribution: {
      humanContribution: 'Pesantren domain consulting, financial regulatory compliance.',
      aiContribution: 'Autonomous development of PostgreSQL row-level security policies.',
      engineeringAgents: ['Farhan (Software Engineer)', 'Rian (Frontend Engineer)'],
    },
    screenshots: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [],
    media: [],
    demoUrl: 'https://demo.koneksisantri.id',
    repositoryUrl: 'https://github.com/kdi-ai-office/koneksi-santri-showcase',
    isRepositoryPublic: true,
    timeline: [],
    team: [],
    results: [
      { metricId: 'r3', label: 'Payment Reconciliation Time', value: '100%', unit: 'Realtime', verified: true },
    ],
    featured: true,
    sortOrder: 2,
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    projectId: 'prj_03_kdi_ai_office',
    slug: 'kdi-ai-office',
    name: 'KDI AI Office — Living Virtual Office & 3D Digital Twin',
    shortDescription: 'State-of-the-art 3D living digital twin and multi-agent autonomous engineering workspace.',
    description: 'KDI AI Office transforms autonomous AI engineering from opaque CLI execution into an immersive, observable 3D digital workplace.',
    category: 'AI System',
    projectType: 'AI_SYSTEM',
    status: 'Production Active',
    year: '2026',
    clientType: 'Enterprise Internal & Public Showcase',
    problem: 'AI software agents historically operate as disjointed background scripts.',
    solution: 'Built an authoritative backend-driven 3D digital twin using PlayCanvas React and WebSocket streaming.',
    role: 'Core Architecture, 3D Engineering & Autonomous Multi-Agent Runtime',
    technologies: ['PlayCanvas', 'React', 'TypeScript', 'NestJS', 'PostgreSQL', 'Neo4j', 'Redis'],
    features: [],
    aiContribution: {
      humanContribution: 'System vision, architectural gates, Islamic workplace ethics design.',
      aiContribution: 'Self-authored modular 3D scene architecture, deterministic BFS waypoint routing.',
      engineeringAgents: ['Farhan (Software Engineer)', 'Ahmad (System Architect)', 'Nadia (QA Engineer)'],
    },
    screenshots: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    ],
    videos: [],
    media: [],
    demoUrl: 'https://office.kdi-office.id',
    repositoryUrl: 'https://github.com/kdi-ai-office/living-virtual-office',
    isRepositoryPublic: true,
    timeline: [],
    team: [],
    results: [
      { metricId: 'r4', label: 'Frame Rendering Performance', value: '<0.1ms', unit: 'Update Time', verified: true },
      { metricId: 'r5', label: 'Automated Test Pass Rate', value: '100%', unit: '120/120 Tests', verified: true },
    ],
    featured: true,
    sortOrder: 3,
    updatedAt: '2026-09-30T08:30:00Z',
  },
];

export const PortfolioGalleryView: React.FC<PortfolioGalleryViewProps> = ({
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000',
  onNavigateTo3D,
  onOpenProjectSlug,
}) => {
  const [projects, setProjects] = useState<PublicProject[]>(FALLBACK_PUBLIC_PROJECTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [activeModalProject, setActiveModalProject] = useState<PublicProject | null>(null);

  // Fetch public projects from API
  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/public/projects`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setProjects(json.data);
          }
        }
      } catch (err) {
        console.warn('[Portfolio] Could not connect to API, using reliable local public cache');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  // Handle direct slug route opening (e.g. /project/simmaci)
  useEffect(() => {
    if (onOpenProjectSlug) {
      const match = projects.find((p) => p.slug === onOpenProjectSlug);
      if (match) {
        setActiveModalProject(match);
        const seo = generateProjectSeo(match);
        applyDocumentSeo(seo);
      }
    }
  }, [onOpenProjectSlug, projects]);

  // Extract unique categories and technologies
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.category) set.add(p.category);
    }
    return ['ALL', ...Array.from(set)];
  }, [projects]);

  const allTechnologies = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      for (const t of p.technologies) set.add(t);
    }
    return ['ALL', ...Array.from(set).sort()];
  }, [projects]);

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Category match
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      // Tech match
      if (selectedTech !== 'ALL' && !p.technologies.includes(selectedTech)) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.shortDescription.toLowerCase().includes(q);
        const matchesTech = p.technologies.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTech) return false;
      }
      return true;
    });
  }, [projects, selectedCategory, selectedTech, searchQuery]);

  // Featured project for hero banner
  const featuredHero = useMemo(() => {
    return projects.find((p) => p.featured) || projects[0];
  }, [projects]);

  const handleOpenProject = (project: PublicProject) => {
    setActiveModalProject(project);
    const seo = generateProjectSeo(project);
    applyDocumentSeo(seo);
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Header & 3D Switch Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>KDI AI Engineering Portfolio</span>
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Public Showcase System</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-100 tracking-tight">
            Software Engineered by Autonomous AI
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Explore verified applications, multi-tenant SaaS ecosystems, and academic systems built with
            human governance and KDI autonomous multi-agent intelligence.
          </p>
        </div>

        {onNavigateTo3D && (
          <button
            onClick={onNavigateTo3D}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 shrink-0"
          >
            <Box className="w-4 h-4" />
            <span>Explore in 3D Living Office</span>
          </button>
        )}
      </div>

      {/* Featured Project Showcase Hero Banner */}
      {featuredHero && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 relative overflow-hidden shadow-2xl flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase tracking-wider font-heading">
                Featured Engineering Project
              </span>
              <span className="text-xs text-slate-400 font-mono">{featuredHero.year}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-bold text-slate-100">
              {featuredHero.name}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {featuredHero.shortDescription}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {featuredHero.technologies.slice(0, 5).map((tech, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => handleOpenProject(featuredHero)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5"
              >
                <span>View Full Showcase</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {featuredHero.demoUrl && validateSafeUrl(featuredHero.demoUrl) && (
                <a
                  href={featuredHero.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700"
                >
                  <span>Launch Demo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {featuredHero.screenshots?.[0] && (
            <div className="w-full md:w-80 aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shrink-0 shadow-lg">
              <img
                src={featuredHero.screenshots[0]}
                alt={featuredHero.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects or stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Tech Stack Chips Filter */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Tech Filter:</span>
          </span>

          {allTechnologies.slice(0, 10).map((tech) => (
            <button
              key={tech}
              onClick={() => setSelectedTech(tech)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                selectedTech === tech
                  ? 'bg-slate-700 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project) => (
          <div
            key={project.projectId}
            className="group rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition hover:shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between overflow-hidden cursor-pointer"
            onClick={() => handleOpenProject(project)}
          >
            {/* Card Thumbnail / Header */}
            <div>
              {project.screenshots?.[0] ? (
                <div className="aspect-video w-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={project.screenshots[0]}
                    alt={project.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-semibold text-slate-300">
                    {project.category}
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full bg-slate-950 flex items-center justify-center border-b border-slate-800">
                  <Layers className="w-8 h-8 text-slate-700" />
                </div>
              )}

              {/* Card Body */}
              <div className="p-5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-emerald-400 font-semibold">
                    {project.status}
                  </span>
                  <span className="text-slate-500">{project.year}</span>
                </div>

                <h4 className="text-base font-heading font-bold text-slate-100 group-hover:text-amber-400 transition leading-snug">
                  {project.name}
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {project.shortDescription}
                </p>

                {/* Tech Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {project.technologies.slice(0, 4).map((tech, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/40 text-slate-500">
                      +{project.technologies.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] font-mono">
                {project.clientType}
              </span>
              <span className="text-amber-400 font-semibold flex items-center space-x-1 group-hover:translate-x-1 transition text-xs">
                <span>Showcase</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <p className="text-sm text-slate-400">
            No projects found matching the specified filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedTech('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Project Showcase Modal */}
      {activeModalProject && (
        <PublicProjectShowcaseModal
          project={activeModalProject}
          onClose={() => setActiveModalProject(null)}
        />
      )}
    </div>
  );
};
