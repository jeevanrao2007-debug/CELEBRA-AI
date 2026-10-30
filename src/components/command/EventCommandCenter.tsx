/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  Box,
  Wallet,
  Clock,
  Building2,
  ShieldAlert,
  RotateCcw,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Share2,
} from 'lucide-react';
import { EventData, ExpenseItem, LayoutObject, Task, Vendor } from '../../types';
import { calculateBudgetSummary, formatCurrency } from '../../logic/budgetEngine';
import { evaluateVenueCapacity } from '../../logic/capacityEngine';
import { getTaskStats } from '../../logic/taskEngine';
import { BudgetView } from '../budget/BudgetView';
import { TimelineView } from '../timeline/TimelineView';
import { VendorView } from '../vendors/VendorView';
import { ContextualAssistant } from '../assistant/ContextualAssistant';
import { ShareBriefModal } from './ShareBriefModal';

// Code-split heavy interactive sub-systems with React.lazy
const Venue3DCanvas = lazy(() =>
  import('../venue3d/Venue3DCanvas').then((m) => ({ default: m.Venue3DCanvas }))
);
const CrisisSimulatorView = lazy(() =>
  import('../crisis/CrisisSimulatorView').then((m) => ({ default: m.CrisisSimulatorView }))
);
const EventRewindView = lazy(() =>
  import('../rewind/EventRewindView').then((m) => ({ default: m.EventRewindView }))
);

const TabLoadingSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div className="p-12 text-center bg-white rounded-2xl border border-[rgba(26,29,32,0.08)] shadow-sm animate-pulse space-y-3">
    <div className="h-4 w-48 bg-stone-200 rounded mx-auto" />
    <p className="text-xs text-[#7D858D]">Initializing {label} engine...</p>
  </div>
);

export type WorkspaceTab =
  | 'overview'
  | 'venue3d'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'crisis'
  | 'rewind';

interface EventCommandCenterProps {
  event: EventData;
  onUpdateEvent: (updatedEvent: EventData) => void;
  onBackToDashboard: () => void;
}

export const EventCommandCenter: React.FC<EventCommandCenterProps> = ({
  event,
  onUpdateEvent,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [showShareModal, setShowShareModal] = useState(false);

  const budgetSummary = useMemo(
    () => calculateBudgetSummary(event.totalBudget, event.expenses, event.currency),
    [event.totalBudget, event.expenses, event.currency]
  );
  const capacityStats = useMemo(
    () => evaluateVenueCapacity(event.venue, event.layoutObjects, event.expectedAttendance),
    [event.venue, event.layoutObjects, event.expectedAttendance]
  );
  const taskStats = useMemo(() => getTaskStats(event.tasks), [event.tasks]);
  const hasActiveCrisis = !!event.activeIncidentReport;

  // Handlers for canonical state mutations
  const handleUpdateLayout = (newObjects: LayoutObject[]) => {
    onUpdateEvent({ ...event, layoutObjects: newObjects });
  };

  const handleUpdateExpenses = (newExpenses: ExpenseItem[]) => {
    onUpdateEvent({ ...event, expenses: newExpenses });
  };

  const handleUpdateTotalBudget = (newBudget: number) => {
    onUpdateEvent({ ...event, totalBudget: newBudget });
  };

  const handleUpdateTasks = (newTasks: Task[]) => {
    onUpdateEvent({ ...event, tasks: newTasks });
  };

  const handleUpdateVendors = (newVendors: Vendor[]) => {
    onUpdateEvent({ ...event, vendors: newVendors });
  };

  const handleApplyAssistantAction = (action: import('../../types').AssistantProposedAction) => {
    if (action.actionType === 'reduce_budget_line') {
      const updatedExpenses = event.expenses.map((e) => {
        if (e.category === 'catering') {
          const discount = 0.85;
          const newUnit = Math.round(e.unitCost * discount);
          return {
            ...e,
            unitCost: newUnit,
            subtotal: newUnit * e.quantity,
            notes: `${e.notes ? e.notes + ' · ' : ''}AI Optimization Applied`,
          };
        }
        return e;
      });
      onUpdateEvent({ ...event, expenses: updatedExpenses });
    } else if (action.actionType === 'add_contingency') {
      onUpdateEvent({ ...event, totalBudget: event.totalBudget + 25000 });
    } else if (action.actionType === 'add_task' && action.payload?.task) {
      const newTask: Task = {
        id: `task_ai_${Date.now()}`,
        title: action.payload.task.title || 'AI Recommended Strategy Action',
        description: action.payload.task.description || 'Action injected from Contextual Strategist',
        category: action.payload.task.category || 'Operations',
        assignedRole: action.payload.task.assignedRole || 'Event Lead',
        startDate: event.date,
        dueDate: event.date,
        priority: 'high',
        status: 'todo',
        dependencies: [],
        estimatedCost: action.payload.task.estimatedCost || 0,
      };
      onUpdateEvent({ ...event, tasks: [...event.tasks, newTask] });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Top Workspace Header (Top Bar Contract Zone with Contextual Breadcrumb) */}
      <header className="flex items-center justify-between gap-6 px-6 py-3.5 border-b border-[rgba(26,29,32,0.08)] bg-white sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 hover:bg-[#FAF8F5] rounded-lg text-[#7D858D] hover:text-[#181B1E] transition-colors cursor-pointer"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#181B1E]">{event.name}</h1>
              <span className="text-[10px] font-mono bg-[#EBF4F0] text-[#0D3B2E] px-2 py-0.5 rounded font-semibold">
                v{event.currentVersionNumber}
              </span>
              {hasActiveCrisis && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Disruption Active
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#7D858D]">
              {event.date} · {event.city} · {event.expectedAttendance} Attendees · Approved Budget:{' '}
              {formatCurrency(event.totalBudget, event.currency)}
            </div>
          </div>
        </div>

        {/* Quick Actions (Share + Crisis Simulator) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.12)] text-[#0D3B2E] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Export or share operational brief"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Brief
          </button>
          <button
            onClick={() => setActiveTab('crisis')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] hover:bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            Crisis Simulator
          </button>
        </div>
      </header>

      {/* Workspace Secondary Navigation Tabs Bar */}
      <div className="border-b border-[rgba(26,29,32,0.08)] bg-white px-6">
        <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>

          <button
            onClick={() => setActiveTab('venue3d')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'venue3d'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <Box className="w-4 h-4" /> 3D Venue
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'budget'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <Wallet className="w-4 h-4" /> Budget
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <Clock className="w-4 h-4" /> Timeline
          </button>

          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'vendors'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <Building2 className="w-4 h-4" /> Vendors
          </button>

          <button
            onClick={() => setActiveTab('crisis')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'crisis'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-700" /> Crisis Simulator
          </button>

          <button
            onClick={() => setActiveTab('rewind')}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === 'rewind'
                ? 'border-[#0D3B2E] text-[#0D3B2E] font-semibold'
                : 'border-transparent text-[#4A5056] hover:text-[#181B1E]'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Event Rewind
          </button>
        </nav>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top 4 KPI Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
                <div className="text-xs text-[#7D858D] font-medium mb-1">Budget Reserve Health</div>
                <div
                  className={`text-2xl font-bold tabular-nums font-mono ${
                    budgetSummary.isOverBudget ? 'text-red-700' : 'text-[#0D3B2E]'
                  }`}
                >
                  {formatCurrency(budgetSummary.remainingBudget, event.currency)}
                </div>
                <div className="text-xs text-[#7D858D] mt-1">
                  {budgetSummary.isOverBudget
                    ? `Over budget by ${formatCurrency(budgetSummary.overBudgetAmount, event.currency)}`
                    : `${budgetSummary.utilizationPercentage}% spent`}
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
                <div className="text-xs text-[#7D858D] font-medium mb-1">Venue Seating Allocation</div>
                <div
                  className={`text-2xl font-bold tabular-nums font-mono ${
                    capacityStats.isCompliant ? 'text-[#0D3B2E]' : 'text-amber-700'
                  }`}
                >
                  {capacityStats.totalSeatsConfigured} / {event.expectedAttendance}
                </div>
                <div className="text-xs text-[#7D858D] mt-1">
                  {capacityStats.deficit > 0
                    ? `${capacityStats.deficit} guest seating deficit`
                    : '100% seating coverage'}
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
                <div className="text-xs text-[#7D858D] font-medium mb-1">Execution Progress</div>
                <div className="text-2xl font-bold text-[#181B1E] tabular-nums font-mono">
                  {taskStats.completionRate}%
                </div>
                <div className="text-xs text-[#7D858D] mt-1">
                  {taskStats.completed} of {taskStats.total} run-sheet tasks verified
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
                <div className="text-xs text-[#7D858D] font-medium mb-1">Immutable Snapshots</div>
                <div className="text-2xl font-bold text-[#181B1E] tabular-nums font-mono">
                  v{event.currentVersionNumber}
                </div>
                <div className="text-xs text-[#7D858D] mt-1">
                  {event.versions.length} versions committed in history
                </div>
              </div>
            </div>

            {/* 3D Scene Spotlight Card */}
            <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#181B1E]">
                    Spatial Arrangement Preview
                  </h3>
                  <p className="text-xs text-[#7D858D]">
                    Procedural 3D model with real-time zone and seating synchronization
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('venue3d')}
                  className="px-3.5 py-1.5 bg-[#0D3B2E] text-white rounded-lg text-xs font-semibold hover:bg-[#165342] transition-colors"
                >
                  Enter Full 3D Editor
                </button>
              </div>

              <Venue3DCanvas event={event} onUpdateLayout={handleUpdateLayout} />
            </div>

            {/* Quick Action Matrix (Timeline + Vendors) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Critical Run-Sheet Snapshot */}
              <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#181B1E]">Upcoming Critical Path</h3>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className="text-xs text-[#0D3B2E] font-medium hover:underline"
                  >
                    View All Tasks →
                  </button>
                </div>
                <div className="divide-y divide-[rgba(26,29,32,0.06)] text-xs">
                  {event.tasks.slice(0, 4).map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#181B1E]">{t.title}</div>
                        <div className="text-[11px] text-[#7D858D]">{t.assignedRole} · Due {t.dueDate}</div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                        t.status === 'completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day Schedule Summary */}
              <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#181B1E]">Event Day Programme Run</h3>
                  <span className="text-xs text-[#7D858D] font-mono">{event.schedule.length} segments</span>
                </div>
                <div className="divide-y divide-[rgba(26,29,32,0.06)] text-xs">
                  {event.schedule.slice(0, 4).map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#181B1E]">{s.title}</div>
                        <div className="text-[11px] text-[#7D858D] capitalize">{s.zone} · {s.leadRole}</div>
                      </div>
                      <span className="text-xs font-mono font-medium text-[#4A5056] shrink-0">
                        {s.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 3D VENUE */}
        {activeTab === 'venue3d' && (
          <div className="space-y-4">
            <Suspense fallback={<TabLoadingSkeleton label="3D Spatial Venue" />}>
              <Venue3DCanvas event={event} onUpdateLayout={handleUpdateLayout} />
            </Suspense>
          </div>
        )}

        {/* TAB 3: BUDGET */}
        {activeTab === 'budget' && (
          <BudgetView
            event={event}
            onUpdateExpenses={handleUpdateExpenses}
            onUpdateTotalBudget={handleUpdateTotalBudget}
          />
        )}

        {/* TAB 4: TIMELINE */}
        {activeTab === 'timeline' && (
          <TimelineView event={event} onUpdateTasks={handleUpdateTasks} />
        )}

        {/* TAB 5: VENDORS */}
        {activeTab === 'vendors' && (
          <VendorView event={event} onUpdateVendors={handleUpdateVendors} />
        )}

        {/* TAB 6: CRISIS SIMULATOR */}
        {activeTab === 'crisis' && (
          <Suspense fallback={<TabLoadingSkeleton label="Crisis Scenario Simulator" />}>
            <CrisisSimulatorView
              event={event}
              onApplyPlan={(updated) => onUpdateEvent(updated)}
              onNavigateToRewind={() => setActiveTab('rewind')}
              onNavigateTo3D={() => setActiveTab('venue3d')}
            />
          </Suspense>
        )}

        {/* TAB 7: EVENT REWIND */}
        {activeTab === 'rewind' && (
          <Suspense fallback={<TabLoadingSkeleton label="Event History & Rewind" />}>
            <EventRewindView
              event={event}
              onRestoreVersion={(updated) => onUpdateEvent(updated)}
              onNavigateTo3D={() => setActiveTab('venue3d')}
            />
          </Suspense>
        )}
      </main>

      {/* Embedded Contextual AI Assistant Floating Drawer */}
      <ContextualAssistant event={event} onApplyAction={handleApplyAssistantAction} />

      {/* Share & Export Operational Brief Modal */}
      <ShareBriefModal
        isOpen={showShareModal}
        event={event}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};
