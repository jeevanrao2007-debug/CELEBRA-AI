/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GitFork } from 'lucide-react';
import { Task, TaskDelayImpact } from '../../types';

interface DelayCascadePanelProps {
  tasks: Task[];
  simulatedTaskId: string;
  simulatedDelayHours: number;
  cascadeImpact: TaskDelayImpact | null;
  onSelectTask: (taskId: string) => void;
  onSelectHours: (hours: number) => void;
  onApplyMitigation: () => void;
  onClose: () => void;
}

export const DelayCascadePanel: React.FC<DelayCascadePanelProps> = ({
  tasks,
  simulatedTaskId,
  simulatedDelayHours,
  cascadeImpact,
  onSelectTask,
  onSelectHours,
  onApplyMitigation,
  onClose,
}) => {
  return (
    <div className="p-5 bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-md space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Delay Cascade Propagation Simulator</h3>
            <p className="text-[11px] text-stone-400">
              Simulate downstream schedule risks when a bottleneck task slips past its buffer.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-stone-400 hover:text-white self-end md:self-auto cursor-pointer"
        >
          Close Simulator
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-stone-400 mb-1">
            Select Delaying Bottleneck Task:
          </label>
          <select
            value={simulatedTaskId}
            onChange={(e) => onSelectTask(e.target.value)}
            className="w-full text-xs bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white font-medium"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.category})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-stone-400 mb-1">Simulated Slippage Duration:</label>
          <div className="flex items-center gap-2">
            {[1, 2, 4, 6].map((hrs) => (
              <button
                key={hrs}
                type="button"
                onClick={() => onSelectHours(hrs)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  simulatedDelayHours === hrs
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                +{hrs}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {cascadeImpact && (
        <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Propagation Risk Level:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  cascadeImpact.scheduleRisk === 'critical'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : cascadeImpact.scheduleRisk === 'moderate'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {cascadeImpact.scheduleRisk} Risk
              </span>
            </div>
            <div className="text-stone-400 font-mono">
              {cascadeImpact.affectedTaskIds.length} downstream activities delayed
            </div>
          </div>

          <div className="text-[11px] text-stone-300">
            <strong className="text-white">Deterministic Mitigation Strategy: </strong>
            {cascadeImpact.mitigationStrategy}
          </div>

          {cascadeImpact.affectedTaskIds.length > 0 && (
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">
                Highlighted in amber/red below in the task run-sheet.
              </span>
              <button
                onClick={onApplyMitigation}
                className="px-3 py-1.5 bg-[#0D3B2E] hover:bg-[#165342] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Apply Mitigation Buffers
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

