/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  GitCompare,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { EventData, EventVersionSnapshot } from '../../types';
import { compareVersions, restoreVersion } from '../../logic/versionEngine';
import { formatCurrency } from '../../logic/budgetEngine';

interface EventRewindViewProps {
  event: EventData;
  onRestoreVersion: (updatedEvent: EventData) => void;
  onNavigateTo3D: () => void;
}

export const EventRewindView: React.FC<EventRewindViewProps> = ({
  event,
  onRestoreVersion,
  onNavigateTo3D,
}) => {
  const [selectedV1Id, setSelectedV1Id] = useState<string>(
    event.versions[0]?.versionId || ''
  );
  const [selectedV2Id, setSelectedV2Id] = useState<string>(
    event.versions[event.versions.length - 1]?.versionId || ''
  );
  const [restorationNotice, setRestorationNotice] = useState<string | null>(null);

  const v1Snapshot = event.versions.find((v) => v.versionId === selectedV1Id) || event.versions[0];
  const v2Snapshot =
    event.versions.find((v) => v.versionId === selectedV2Id) ||
    event.versions[event.versions.length - 1];

  const diff = v1Snapshot && v2Snapshot ? compareVersions(v1Snapshot, v2Snapshot) : null;

  const handleRestore = (versionId: string) => {
    try {
      const restoredEvent = restoreVersion(event, versionId);
      onRestoreVersion(restoredEvent);
      setRestorationNotice(
        `Event successfully restored! A new version (v${restoredEvent.currentVersionNumber}) was recorded without overwriting past history.`
      );
    } catch (err: any) {
      setRestorationNotice(`Restoration failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rewind Header */}
      <div className="p-6 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#0D3B2E] font-semibold tracking-wider uppercase mb-1">
              <History className="w-3.5 h-3.5" /> Immutable Version Ledger
            </div>
            <h2 className="text-xl font-bold text-[#181B1E]">Event Rewind & Version History</h2>
            <p className="text-xs text-[#7D858D] mt-0.5">
              Every crisis scenario, layout modification, and budget adjustment is committed as an immutable snapshot. Compare revisions and restore previous baselines safely.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateTo3D}
              className="px-4 py-2 bg-[#0D3B2E] text-white rounded-lg text-xs font-semibold hover:bg-[#165342] transition-colors"
            >
              Return to 3D Scene
            </button>
          </div>
        </div>
      </div>

      {/* Restoration Notice Banner */}
      {restorationNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
          <span>{restorationNotice}</span>
          <button
            onClick={() => setRestorationNotice(null)}
            className="text-emerald-800 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Version Timeline Cards */}
      <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[rgba(26,29,32,0.08)] pb-3">
          <h3 className="text-sm font-semibold text-[#181B1E]">
            Revision Timeline ({event.versions.length} Snapshots)
          </h3>
          <span className="text-xs text-[#7D858D]">
            Active Version: <strong className="font-mono text-[#0D3B2E]">v{event.currentVersionNumber}</strong>
          </span>
        </div>

        <div className="space-y-3">
          {event.versions
            .slice()
            .reverse()
            .map((snapshot) => {
              const isCurrent = snapshot.versionNumber === event.currentVersionNumber;
              const dateStr = new Date(snapshot.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={snapshot.versionId}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'border-[#0D3B2E] bg-[#EBF4F0]/40 ring-1 ring-[#0D3B2E]'
                      : 'border-[rgba(26,29,32,0.08)] bg-white hover:border-[#0D3B2E]/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.1)] px-2 py-0.5 rounded text-[#181B1E]">
                        v{snapshot.versionNumber}
                      </span>
                      <span className="font-semibold text-xs text-[#181B1E]">
                        {snapshot.changeDescription}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-[#0D3B2E] text-white px-2 py-0.5 rounded font-medium">
                          Active Baseline
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7D858D]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {dateStr}
                      </span>
                      <span>·</span>
                      <span>Author: {snapshot.author}</span>
                      <span>·</span>
                      <span className="tabular-nums font-mono">
                        Spend: {formatCurrency(snapshot.budgetSummary.plannedExpenditure, event.currency)}
                      </span>
                      <span>·</span>
                      <span>{snapshot.layoutObjects.length} 3D objects</span>
                      <span>·</span>
                      <span>{snapshot.tasks.length} run-sheet tasks</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(snapshot.versionId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.12)] rounded-lg text-xs font-semibold text-[#0D3B2E] transition-colors"
                        title="Restore this plan into a new revision"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Plan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Side-by-Side Version Comparison Matrix */}
      {diff && (
        <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(26,29,32,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#0D3B2E]" />
              <h3 className="text-sm font-semibold text-[#181B1E]">
                Differential Comparison Matrix
              </h3>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[#7D858D]">Baseline:</span>
                <select
                  value={selectedV1Id}
                  onChange={(e) => setSelectedV1Id(e.target.value)}
                  className="bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2 py-1 rounded-md text-xs font-mono font-medium"
                >
                  {event.versions.map((v) => (
                    <option key={v.versionId} value={v.versionId}>
                      v{v.versionNumber} ({v.changeDescription.slice(0, 24)}...)
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[#7D858D]">vs</span>

              <div className="flex items-center gap-1">
                <span className="text-[#7D858D]">Compare To:</span>
                <select
                  value={selectedV2Id}
                  onChange={(e) => setSelectedV2Id(e.target.value)}
                  className="bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2 py-1 rounded-md text-xs font-mono font-medium"
                >
                  {event.versions.map((v) => (
                    <option key={v.versionId} value={v.versionId}>
                      v{v.versionNumber} ({v.changeDescription.slice(0, 24)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Metrics Delta */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
              <span className="text-[#7D858D] block mb-1">Expenditure Variance</span>
              <div className="flex items-baseline gap-1 font-semibold tabular-nums font-mono text-sm">
                {diff.budgetDelta > 0 ? (
                  <span className="text-amber-800">
                    +{formatCurrency(diff.budgetDelta, event.currency)}
                  </span>
                ) : diff.budgetDelta < 0 ? (
                  <span className="text-[#0D3B2E]">
                    -{formatCurrency(Math.abs(diff.budgetDelta), event.currency)}
                  </span>
                ) : (
                  <span className="text-[#181B1E]">₹0 (Identical)</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
              <span className="text-[#7D858D] block mb-1">3D Furniture Count</span>
              <div className="font-semibold text-sm tabular-nums">
                v{diff.v1Number}: {diff.v1ObjectCount} → v{diff.v2Number}: {diff.v2ObjectCount}
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
              <span className="text-[#7D858D] block mb-1">Run-Sheet Tasks</span>
              <div className="font-semibold text-sm tabular-nums">
                v{diff.v1Number}: {diff.v1TaskCount} → v{diff.v2Number}: {diff.v2TaskCount}
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
              <span className="text-[#7D858D] block mb-1">Tasks Completed</span>
              <div className="font-semibold text-sm tabular-nums">
                v{diff.v1Number}: {diff.v1CompletedTasks} → v{diff.v2Number}: {diff.v2CompletedTasks}
              </div>
            </div>
          </div>

          {/* Deep Detailed Changes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-4 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] space-y-2">
              <span className="font-semibold text-[#181B1E] block">
                3D Layout Differentiators ({diff.layoutChanges.length})
              </span>
              {diff.layoutChanges.length > 0 ? (
                <ul className="list-disc list-inside text-[#4A5056] space-y-1 text-[11px]">
                  {diff.layoutChanges.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-[#7D858D] text-[11px]">No layout changes between snapshots.</div>
              )}
            </div>

            <div className="p-4 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] space-y-2">
              <span className="font-semibold text-[#181B1E] block">
                Budget Line Differentiators ({diff.expenseChanges.length})
              </span>
              {diff.expenseChanges.length > 0 ? (
                <ul className="list-disc list-inside text-[#4A5056] space-y-1 text-[11px]">
                  {diff.expenseChanges.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-[#7D858D] text-[11px]">No budget adjustments detected.</div>
              )}
            </div>

            <div className="p-4 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] space-y-2">
              <span className="font-semibold text-[#181B1E] block">
                Task Execution Differentiators ({diff.taskChanges.length})
              </span>
              {diff.taskChanges.length > 0 ? (
                <ul className="list-disc list-inside text-[#4A5056] space-y-1 text-[11px]">
                  {diff.taskChanges.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-[#7D858D] text-[11px]">No task status shifts detected.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
