import React from 'react';
import { GitPullRequest, CheckSquare, Shield, Clock } from 'lucide-react';

export const CommandCenter: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold text-slate-100">Command Center & Task Governance</h2>
          <p className="text-sm text-slate-400 mt-1">
            Phase 1 Foundation Placeholder: Full Kanban task board and surgical Git diff viewer will be integrated in Phase 7.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kanban Task Board Preview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-slate-200 font-heading font-semibold">
            <CheckSquare className="w-5 h-5 text-blue-400" />
            <span>Task Queue & Decomposition</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-200">tsk_01J9X8A1B2C3</div>
            <div>Fix PickupService null pointer exception</div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              <span>Agent: SOFTWARE_ENGINEER</span>
              <span className="text-amber-400">IN_PROGRESS</span>
            </div>
          </div>
        </div>

        {/* Human Approval Gates Preview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-slate-200 font-heading font-semibold">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Cryptographic Approval Gate</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-emerald-400">Policy Engine Active</div>
            <div>Zero high-risk actions pending sign-off. Any git push or DDL migration will halt here for interactive review.</div>
          </div>
        </div>

        {/* Git Worktree Branch Status */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-slate-200 font-heading font-semibold">
            <GitPullRequest className="w-5 h-5 text-purple-400" />
            <span>Sandboxed Git Worktrees</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-mono text-purple-300">ai/task-01J9X8A1B2C3</div>
            <div>Isolated worktree mounted in <code className="bg-slate-950 px-1 py-0.5 rounded text-slate-400">data/worktrees/</code>. Main branch strictly protected.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
