/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  CloudRain,
  UtensilsCrossed,
  Users,
  TrendingDown,
  VolumeX,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  EventData,
  IncidentImpactReport,
  IncidentType,
  RecoveryPlanProposal,
} from '../../types';
import {
  CRISIS_SCENARIOS,
  analyzeIncidentImpact,
  applyRecoveryPlan,
  generateCandidateRecoveryPlans,
} from '../../logic/crisisEngine';
import { formatCurrency } from '../../logic/budgetEngine';

interface CrisisSimulatorViewProps {
  event: EventData;
  onApplyPlan: (updatedEvent: EventData) => void;
  onNavigateToRewind: () => void;
  onNavigateTo3D: () => void;
}

export const CrisisSimulatorView: React.FC<CrisisSimulatorViewProps> = ({
  event,
  onApplyPlan,
  onNavigateToRewind,
  onNavigateTo3D,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<IncidentType>('heavy_rain');
  const [selectedSeverity, setSelectedSeverity] = useState<
    'minor' | 'moderate' | 'severe' | 'critical'
  >('severe');
  const [activeReport, setActiveReport] = useState<IncidentImpactReport | null>(
    event.activeIncidentReport || null
  );
  const [proposals, setProposals] = useState<RecoveryPlanProposal[] | null>(
    event.candidateRecoveryPlans || null
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const scenarioIcons: Record<IncidentType, React.ReactNode> = {
    heavy_rain: <CloudRain className="w-5 h-5 text-blue-700" />,
    caterer_cancellation: <UtensilsCrossed className="w-5 h-5 text-amber-700" />,
    attendance_surge: <Users className="w-5 h-5 text-indigo-700" />,
    budget_cut: <TrendingDown className="w-5 h-5 text-red-700" />,
    sound_equipment_failure: <VolumeX className="w-5 h-5 text-purple-700" />,
    staging_delay_cascade: <Clock className="w-5 h-5 text-stone-700" />,
  };

  const handleTriggerCrisis = () => {
    setActionFeedback(null);
    // Step 2: Impact Analysis
    const report = analyzeIncidentImpact(event, selectedScenarioId, selectedSeverity);
    setActiveReport(report);

    // Step 3 & 4: Generate Candidate Recovery Plans & Run Deterministic Feasibility Validation
    const candidatePlans = generateCandidateRecoveryPlans(event, report);
    setProposals(candidatePlans);

    const firstFeasible = candidatePlans.find((p) => p.isFeasible);
    if (firstFeasible) {
      setSelectedPlanId(firstFeasible.id);
    } else if (candidatePlans.length > 0) {
      setSelectedPlanId(candidatePlans[0].id);
    }
  };

  const handleApplySelectedPlan = () => {
    if (!activeReport || !proposals) return;
    const plan = proposals.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    if (!plan.isFeasible) {
      setActionFeedback(
        `Action Blocked: "${plan.title}" violates verified event constraints and cannot be applied.`
      );
      return;
    }

    setIsApplying(true);

    setTimeout(() => {
      try {
        const updatedEvent = applyRecoveryPlan(event, plan, activeReport);
        onApplyPlan(updatedEvent);
        setActiveReport(null);
        setProposals(null);
        setIsApplying(false);
        setActionFeedback(
          `Recovery plan "${plan.title}" successfully applied! Version ${updatedEvent.currentVersionNumber} snapshot created. 3D layout, tasks, and budget synchronized.`
        );
      } catch (err: unknown) {
        setIsApplying(false);
        const errMsg = err instanceof Error ? err.message : String(err);
        setActionFeedback(`Error applying recovery plan: ${errMsg}`);
      }
    }, 400);
  };

  const handleRejectCrisis = () => {
    setActiveReport(null);
    setProposals(null);
    setSelectedPlanId(null);
    setActionFeedback('Simulated incident dismissed. Original event plan preserved unaltered.');
  };

  const activePlan = proposals?.find((p) => p.id === selectedPlanId);

  return (
    <div className="space-y-6">
      {/* Signature Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-gradient-to-r from-[#0D3B2E] to-[#165342] text-white rounded-2xl shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#C59B27] font-semibold tracking-wider uppercase mb-1">
              <Zap className="w-3.5 h-3.5" /> Event Resilience & Disruption Simulator
            </div>
            <h2 className="text-xl font-bold">Signature Event Crisis Simulator</h2>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Simulate high-impact disruptions, evaluate multi-dimensional impact on 3D venue layout, budget, tasks, and vendors, and calculate mathematically feasible recovery strategies.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToRewind}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-medium text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Event Rewind
            </button>
            <button
              onClick={onNavigateTo3D}
              className="px-3.5 py-2 bg-[#C59B27] hover:bg-[#D4AF37] text-[#181B1E] rounded-xl text-xs font-semibold transition-colors"
            >
              View in 3D Scene
            </button>
          </div>
        </div>
      </motion.div>

      {/* Action Feedback Banner */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between"
          >
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-emerald-800 font-semibold hover:underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 1: Scenario Selector & Injector Controls */}
      <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#181B1E]">
              Step 1: Select Disruption Scenario
            </h3>
            <p className="text-xs text-[#7D858D] mt-0.5">
              Choose an unexpected crisis to test CelebraAI’s deterministic recovery engine
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#4A5056] font-medium">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) =>
                setSelectedSeverity(
                  e.target.value as 'minor' | 'moderate' | 'severe' | 'critical'
                )
              }
              className="text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2.5 py-1.5 rounded-lg text-[#181B1E] font-medium capitalize"
            >
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CRISIS_SCENARIOS.map((scen) => (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              key={scen.id}
              onClick={() => setSelectedScenarioId(scen.id)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedScenarioId === scen.id
                  ? 'border-[#0D3B2E] bg-[#EBF4F0] ring-1 ring-[#0D3B2E]'
                  : 'border-[rgba(26,29,32,0.08)] bg-white hover:border-[#0D3B2E]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  {scenarioIcons[scen.id]}
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#7D858D]">
                    {scen.category}
                  </span>
                </div>
                <div className="font-semibold text-xs text-[#181B1E] mb-1">{scen.title}</div>
                <p className="text-[11px] text-[#4A5056] line-clamp-2">{scen.description}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTriggerCrisis}
            className="px-5 py-2.5 bg-[#0D3B2E] hover:bg-[#165342] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-[#C59B27]" />
            Inject Disruption & Calculate Impact
          </motion.button>
        </div>
      </div>

      {/* STEP 2: IMPACT ANALYSIS REPORT */}
      <AnimatePresence>
        {activeReport && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,29,32,0.08)] pb-3">
              <div>
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Step 2 · Real-Time Impact Assessment
                </div>
                <h3 className="text-base font-semibold text-[#181B1E]">
                  Operational Impact Breakdown
                </h3>
              </div>
              <span className="text-xs font-mono text-[#7D858D]">
                Severity: <strong className="uppercase text-amber-800">{activeReport.severity}</strong>
              </span>
            </div>

            <p className="text-xs text-[#4A5056] bg-amber-50/60 p-3 rounded-lg border border-amber-200/60 font-medium">
              {activeReport.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
                <span className="text-[#7D858D] block mb-1">Affected Venue Zones</span>
                <span className="font-semibold text-[#181B1E] capitalize">
                  {activeReport.affectedZones.length > 0
                    ? activeReport.affectedZones.join(', ')
                    : 'None directly flooded'}
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
                <span className="text-[#7D858D] block mb-1">Capacity Impact</span>
                <span className="font-semibold text-amber-800 tabular-nums">
                  {activeReport.capacityDelta > 0
                    ? `+${activeReport.capacityDelta} attendee surge`
                    : activeReport.capacityDelta < 0
                    ? `${activeReport.capacityDelta} seats inoperable`
                    : 'Neutral seating impact'}
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
                <span className="text-[#7D858D] block mb-1">Blocked / Affected Tasks</span>
                <span className="font-semibold text-[#181B1E] tabular-nums">
                  {activeReport.affectedTaskIds.length} run-sheet tasks impacted
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[rgba(26,29,32,0.06)]">
                <span className="text-[#7D858D] block mb-1">Budget Exposure</span>
                <span className="font-semibold text-red-700 tabular-nums font-mono">
                  {formatCurrency(activeReport.budgetRiskAmount, event.currency)}
                </span>
              </div>
            </div>

            {activeReport.criticalScheduleConflicts.length > 0 && (
              <div className="pt-2 text-xs">
                <span className="font-semibold text-[#181B1E] block mb-1">Schedule Conflicts:</span>
                <ul className="list-disc list-inside text-[#4A5056] space-y-0.5">
                  {activeReport.criticalScheduleConflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 3, 4, 5: CANDIDATE RECOVERY PROPOSALS & FEASIBILITY ENGINE */}
      <AnimatePresence>
        {proposals && proposals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,29,32,0.08)] pb-3">
              <div>
                <div className="text-[10px] font-bold text-[#0D3B2E] uppercase tracking-wider">
                  Step 3 & 4 · Candidate Recovery Plans
                </div>
                <h3 className="text-base font-semibold text-[#181B1E]">
                  Deterministic Feasibility Validation
                </h3>
              </div>
              <span className="text-xs text-[#7D858D]">
                {proposals.length} alternative protocols evaluated
              </span>
            </div>

            {/* Proposal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.map((plan) => (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedPlanId === plan.id
                      ? 'border-[#0D3B2E] bg-[#EBF4F0]/60 ring-1 ring-[#0D3B2E]'
                      : 'border-[rgba(26,29,32,0.08)] bg-white hover:border-[#0D3B2E]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-xs text-[#181B1E]">{plan.title}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                        plan.isFeasible
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {plan.isFeasible ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Feasible
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Infeasible
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-[#4A5056] mb-3 line-clamp-2">{plan.description}</p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[rgba(26,29,32,0.06)]">
                    <span className="text-[#7D858D]">Cost Impact:</span>
                    <span
                      className={`font-semibold tabular-nums font-mono ${
                        plan.costDelta > 0
                          ? 'text-amber-800'
                          : plan.costDelta < 0
                          ? 'text-emerald-800'
                          : 'text-[#181B1E]'
                      }`}
                    >
                      {plan.costDelta > 0
                        ? `+${formatCurrency(plan.costDelta, event.currency)}`
                        : plan.costDelta < 0
                        ? `-${formatCurrency(Math.abs(plan.costDelta), event.currency)}`
                        : '₹0 (Neutral)'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Deep Selected Plan Evaluation Details */}
            {activePlan && (
              <motion.div
                key={activePlan.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="p-5 bg-[#FAF8F5] rounded-xl border border-[rgba(26,29,32,0.08)] space-y-4 text-xs"
              >
                <div>
                  <h4 className="font-semibold text-[#181B1E] text-sm mb-1">{activePlan.title}</h4>
                  <p className="text-[#4A5056]">{activePlan.description}</p>
                </div>

                {/* Feasibility Checks Checklist */}
                <div className="space-y-2">
                  <span className="font-semibold text-[#181B1E] block">
                    Authoritative Constraint Validation:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {activePlan.feasibilityChecks.map((chk, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                          chk.passed
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-red-50/80 border-red-200 text-red-900'
                        }`}
                      >
                        {chk.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold">{chk.name}</div>
                          <div className="text-[11px] opacity-90">{chk.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade-Off Summary */}
                <div className="p-3 bg-white rounded-lg border border-[rgba(26,29,32,0.08)]">
                  <span className="font-semibold text-[#181B1E] block mb-0.5">
                    Strategic Trade-Off Analysis:
                  </span>
                  <p className="text-[#4A5056]">{activePlan.tradeOffSummary}</p>
                </div>

                {/* Specific Layout / Task Mutations preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-white rounded-lg border border-[rgba(26,29,32,0.08)]">
                    <span className="font-semibold text-[#181B1E] block mb-1">
                      3D Venue Layout Adjustments:
                    </span>
                    <ul className="list-disc list-inside text-[#4A5056] space-y-0.5">
                      {activePlan.layoutChangesSummary.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[rgba(26,29,32,0.08)]">
                    <span className="font-semibold text-[#181B1E] block mb-1">
                      Run-Sheet & Vendor Actions:
                    </span>
                    <ul className="list-disc list-inside text-[#4A5056] space-y-0.5">
                      {activePlan.affectedTasksSummary.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* STEP 6: Apply or Reject Actions */}
                <div className="pt-3 border-t border-[rgba(26,29,32,0.08)] flex items-center justify-between">
                  <button
                    onClick={handleRejectCrisis}
                    className="px-4 py-2 border border-[rgba(26,29,32,0.15)] rounded-xl text-xs font-medium text-[#4A5056] hover:bg-white transition-colors"
                  >
                    Dismiss / Reject Simulation
                  </button>

                  <button
                    disabled={!activePlan.isFeasible || isApplying}
                    onClick={handleApplySelectedPlan}
                    className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${
                      activePlan.isFeasible
                        ? 'bg-[#0D3B2E] hover:bg-[#165342] text-white cursor-pointer'
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {isApplying ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-[#C59B27]" />
                        Applying Relocation & Committing Revision...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {activePlan.isFeasible
                          ? 'Apply Recovery Protocol & Snapshot Version'
                          : 'Plan Infeasible — Cannot Apply'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
