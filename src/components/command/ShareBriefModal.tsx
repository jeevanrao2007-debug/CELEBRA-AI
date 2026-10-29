/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share2, Copy, Check, Download, X } from 'lucide-react';
import { EventData } from '../../types';
import { calculateBudgetSummary, formatCurrency } from '../../logic/budgetEngine';
import { evaluateVenueCapacity } from '../../logic/capacityEngine';
import { getTaskStats } from '../../logic/taskEngine';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ShareBriefModalProps {
  isOpen: boolean;
  event: EventData;
  onClose: () => void;
}

export const ShareBriefModal: React.FC<ShareBriefModalProps> = ({
  isOpen,
  event,
  onClose,
}) => {
  const trapRef = useFocusTrap({ isOpen, onClose });
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const budgetSummary = calculateBudgetSummary(
    event.totalBudget,
    event.expenses,
    event.currency
  );
  const capacityStats = evaluateVenueCapacity(
    event.venue,
    event.layoutObjects,
    event.expectedAttendance
  );
  const taskStats = getTaskStats(event.tasks);

  const generateBriefMarkdown = () => {
    return `# Operational Brief: ${event.name}
- Date: ${event.date} (${event.startTime} - ${event.endTime})
- City/Venue: ${event.city} · ${event.venue.name}
- Expected Attendance: ${event.expectedAttendance} guests
- Approved Budget: ${formatCurrency(event.totalBudget, event.currency)}
- Planned Expenditure: ${formatCurrency(budgetSummary.plannedExpenditure, event.currency)}
- Contingency Reserve: ${formatCurrency(budgetSummary.remainingBudget, event.currency)} (${
      budgetSummary.isOverBudget ? 'DEFICIT' : 'HEALTHY'
    })
- Venue Seating: ${capacityStats.totalSeatsConfigured} / ${event.expectedAttendance} seats (${
      capacityStats.isCompliant ? 'Compliant' : `${capacityStats.deficit} deficit`
    })
- Run-Sheet Completion: ${taskStats.completed}/${taskStats.total} tasks (${taskStats.completionRate}%)
- Current Snapshot: Version ${event.currentVersionNumber} (${event.versions.length} immutable snapshots recorded)
- Active Incident: ${event.activeIncidentReport ? event.activeIncidentReport.summary : 'None (Nominal State)'}
`;
  };

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(generateBriefMarkdown());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleDownloadBackup = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(event, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${event.name.toLowerCase().replace(/\s+/g, '_')}_v${event.currentVersionNumber}_backup.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[rgba(26,29,32,0.12)] space-y-4">
        <div className="flex items-center justify-between border-b border-[rgba(26,29,32,0.08)] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#0D3B2E]" />
            <h3 id="share-modal-title" className="text-base font-bold text-[#181B1E]">
              Export Operational Brief & State
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7D858D] hover:text-[#181B1E] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#4A5056]">
          Share formatted operational metrics with stakeholders or download an immutable JSON state
          snapshot for local archiving.
        </p>

        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[rgba(26,29,32,0.08)] font-mono text-[11px] text-[#4A5056] space-y-1 overflow-x-auto whitespace-pre leading-relaxed max-h-48">
          {generateBriefMarkdown()}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-end gap-3 text-xs">
          <button
            onClick={handleCopyBrief}
            className="px-3.5 py-2 bg-white hover:bg-[#FAF8F5] border border-[rgba(26,29,32,0.15)] text-[#181B1E] rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {isCopied ? 'Copied to Clipboard!' : 'Copy Brief Markdown'}
          </button>

          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2 bg-[#0D3B2E] hover:bg-[#165342] text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON Backup
          </button>
        </div>
      </div>
    </div>
  );
};
