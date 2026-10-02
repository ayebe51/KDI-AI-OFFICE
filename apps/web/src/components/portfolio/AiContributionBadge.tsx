// ==========================================================
// apps/web/src/components/portfolio/AiContributionBadge.tsx
// Transparent Human & AI Collaborative Engineering Breakdown
// ==========================================================

import React from 'react';
import type { AiContribution, ProjectTeamMember } from '@kdi/types';
import { Bot, UserCheck, CheckSquare, Layers, Cpu, ShieldCheck } from 'lucide-react';

export interface AiContributionBadgeProps {
  aiContribution?: AiContribution;
  team?: Array<Omit<ProjectTeamMember, 'agentId'>>;
}

export const AiContributionBadge: React.FC<AiContributionBadgeProps> = ({
  aiContribution,
  team = [],
}) => {
  if (!aiContribution) {
    return null;
  }

  const humanMembers = team.filter((t) => !t.isAi);
  const aiMembers = team.filter((t) => t.isAi);

  return (
    <div className="space-y-6">
      {/* Human vs AI Breakdown Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Human Leadership & Governance */}
        <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#385747] uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            <span>Human Strategic Leadership</span>
          </div>
          <p className="text-xs text-[#5c554b] leading-relaxed">
            {aiContribution.humanContribution}
          </p>

          {humanMembers.length > 0 && (
            <div className="pt-2 border-t border-[#b4ae9f] space-y-1.5">
              <span className="text-[10px] text-[#5c554b] uppercase tracking-wider block font-semibold">
                Human Directors & Advisors:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {humanMembers.map((m, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-medium"
                  >
                    {m.name} ({m.role})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Autonomous AI Engineering */}
        <div className="p-4 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#2a2622] uppercase tracking-wider">
            <Bot className="w-4 h-4 text-[#385747]" />
            <span>Autonomous AI Engineering Workforce</span>
          </div>
          <p className="text-xs text-[#5c554b] leading-relaxed">
            {aiContribution.aiContribution}
          </p>

          {aiContribution.engineeringAgents.length > 0 && (
            <div className="pt-2 border-t border-[#b4ae9f] space-y-1.5">
              <span className="text-[10px] text-[#5c554b] uppercase tracking-wider block font-semibold">
                Active Digital Personas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {aiContribution.engineeringAgents.map((agent, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#eee9df] border border-[#b4ae9f] text-[#2a2622] font-medium flex items-center space-x-1"
                  >
                    <Cpu className="w-3 h-3 text-[#385747]" />
                    <span>{agent}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specific Engineering Contributions Sub-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {aiContribution.planningContribution && (
          <div className="p-3.5 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-1.5 shadow-2xs">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-[#2a2622]">
              <Layers className="w-3.5 h-3.5 text-[#385747]" />
              <span>Planning & Architecture</span>
            </div>
            <p className="text-[11px] text-[#5c554b] leading-normal">
              {aiContribution.planningContribution}
            </p>
          </div>
        )}

        {aiContribution.testingContribution && (
          <div className="p-3.5 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-1.5 shadow-2xs">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-[#385747]">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Automated QA & Security</span>
            </div>
            <p className="text-[11px] text-[#5c554b] leading-normal">
              {aiContribution.testingContribution}
            </p>
          </div>
        )}

        {aiContribution.automationContribution && (
          <div className="p-3.5 rounded-xl bg-[#fffcf5] border border-[#b4ae9f] space-y-1.5 shadow-2xs">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-800">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>CI/CD & Git Worktree</span>
            </div>
            <p className="text-[11px] text-[#5c554b] leading-normal">
              {aiContribution.automationContribution}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
