/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Calendar,
  Users,
  Wallet,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { EventData } from '../../types';
import { calculateBudgetSummary, formatCurrency } from '../../logic/budgetEngine';

interface MainDashboardProps {
  events: EventData[];
  onSelectEvent: (event: EventData) => void;
  onDeleteEvent?: (eventId: string) => void;
  onResetDefaults?: () => void;
  onOpenWizard: () => void;
  onLoadDemo: () => void;
  onLoadPreset?: (preset: 'festival' | 'wedding' | 'birthday') => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  events,
  onSelectEvent,
  onDeleteEvent,
  onResetDefaults,
  onOpenWizard,
  onLoadDemo,
  onLoadPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const filteredEvents = events.filter((e) => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-[rgba(26,29,32,0.08)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#181B1E]">Event Operations Command</h1>
          <p className="text-xs text-[#7D858D] mt-1">
            Manage live celebrations, simulate resilience protocols, and track multi-dimensional event health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onLoadPreset && (
            <>
              <button
                onClick={() => onLoadPreset('festival')}
                className="px-3 py-2 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.12)] text-[#0D3B2E] text-xs font-semibold rounded-xl transition-colors"
              >
                + College Fest
              </button>
              <button
                onClick={() => onLoadPreset('wedding')}
                className="px-3 py-2 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.12)] text-[#0D3B2E] text-xs font-semibold rounded-xl transition-colors"
              >
                + Royal Wedding
              </button>
              <button
                onClick={() => onLoadPreset('birthday')}
                className="px-3 py-2 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.12)] text-[#0D3B2E] text-xs font-semibold rounded-xl transition-colors"
              >
                + 50th Birthday
              </button>
            </>
          )}
          {onResetDefaults && (
            <button
              onClick={onResetDefaults}
              className="px-3 py-2 bg-white hover:bg-stone-50 border border-[rgba(26,29,32,0.12)] text-[#7D858D] hover:text-[#181B1E] text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              title="Reset events back to original seeded presets"
            >
              <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>
          )}
          <button
            onClick={onOpenWizard}
            className="px-4 py-2 bg-[#0D3B2E] hover:bg-[#165342] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Event Plan
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#181B1E]">Active Event Workspaces</h2>
            <span className="text-xs text-[#7D858D] font-mono tabular-nums">
              ({filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {['all', 'college_fest', 'wedding', 'birthday'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0D3B2E] text-white'
                    : 'bg-white text-[#4A5056] border border-[rgba(26,29,32,0.08)] hover:bg-[#FAF8F5]'
                }`}
              >
                {cat === 'all'
                  ? 'All Events'
                  : cat === 'college_fest'
                  ? 'College Fest'
                  : cat === 'wedding'
                  ? 'Weddings'
                  : 'Birthdays'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const budget = calculateBudgetSummary(evt.totalBudget, evt.expenses, evt.currency);
            const completedTasks = evt.tasks.filter((t) => t.status === 'completed').length;
            const hasActiveCrisis = !!evt.activeIncidentReport;

            return (
              <div
                key={evt.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectEvent(evt);
                  }
                }}
                onClick={() => onSelectEvent(evt)}
                className="group relative p-5 bg-white rounded-2xl border border-[rgba(26,29,32,0.08)] shadow-sm hover:border-[#0D3B2E]/40 transition-all cursor-pointer flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-[#0D3B2E]/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D3B2E] bg-[#EBF4F0] px-2 py-0.5 rounded">
                      {evt.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#7D858D]">
                        v{evt.currentVersionNumber}
                      </span>
                      {onDeleteEvent && events.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${evt.name}"? This action cannot be undone.`)) {
                              onDeleteEvent(evt.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#7D858D] hover:text-red-700 transition-opacity rounded"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#181B1E] line-clamp-1">{evt.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#7D858D] mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{evt.date}</span>
                    <span>·</span>
                    <span>{evt.city}</span>
                  </div>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-[#FAF8F5] rounded-xl text-center text-xs">
                  <div>
                    <div className="text-[10px] text-[#7D858D]">Guests</div>
                    <div className="font-bold text-[#181B1E] tabular-nums font-mono mt-0.5">
                      {evt.expectedAttendance}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7D858D]">Budget</div>
                    <div className="font-bold text-[#181B1E] tabular-nums font-mono mt-0.5">
                      {formatCurrency(evt.totalBudget, evt.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7D858D]">Tasks</div>
                    <div className="font-bold text-[#0D3B2E] tabular-nums font-mono mt-0.5">
                      {completedTasks}/{evt.tasks.length}
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="pt-2 border-t border-[rgba(26,29,32,0.06)] flex items-center justify-between text-xs">
                  {hasActiveCrisis ? (
                    <span className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5" /> Disruption In Progress
                    </span>
                  ) : (
                    <span className="text-[#0D3B2E] font-medium text-[11px]">
                      Operational Baseline
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-[#0D3B2E] font-semibold">
                    Launch Command <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
