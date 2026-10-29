/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EventData,
  FeasibilityCheckItem,
  IncidentImpactReport,
  IncidentScenario,
  IncidentType,
  LayoutObject,
  RecoveryPlanProposal,
  Task,
  Vendor,
} from '../types';
import { calculateBudgetSummary } from './budgetEngine';
import { evaluateVenueCapacity } from './capacityEngine';
import { canCompleteTask } from './taskEngine';

export const CRISIS_SCENARIOS: IncidentScenario[] = [
  {
    id: 'heavy_rain',
    title: 'Severe Torrential Rainstorm',
    category: 'weather',
    defaultSeverity: 'severe',
    description: 'Sudden high-intensity downpour renders outdoor stage, amphitheatre lawn, and open-air audio equipment unusable.',
    realisticContext: 'Meteorological alert warning of 45mm rain over next 3 hours directly over the venue grounds.',
  },
  {
    id: 'caterer_cancellation',
    title: 'Primary Caterer Last-Minute Walkout',
    category: 'vendor',
    defaultSeverity: 'critical',
    description: 'Contracted lead catering vendor encounters kitchen equipment breakdown and cancels service 48 hours before the event.',
    realisticContext: 'The food provider reports an electrical kitchen fire and cannot fulfill the contracted menu for all guests.',
  },
  {
    id: 'attendance_surge',
    title: 'Unexpected Attendance Surge (+35%)',
    category: 'guest',
    defaultSeverity: 'moderate',
    description: 'Viral social media interest and VIP delegation registrations expand expected attendance by 35%, breaching seating capacity.',
    realisticContext: 'Registration desk reports 175 additional confirmed attendees exceeding original capacity.',
  },
  {
    id: 'budget_cut',
    title: 'Sponsorship Grant Cut (-20%)',
    category: 'financial',
    defaultSeverity: 'severe',
    description: 'Key institutional sponsor withdraws 20% of promised discretionary funding, resulting in a sudden funding deficit.',
    realisticContext: 'Corporate donor reduces commitment from ₹2,00,000 to ₹1,60,000 citing quarterly reallocation.',
  },
  {
    id: 'sound_equipment_failure',
    title: 'Main Audio & Staging Rig Blown Out',
    category: 'equipment',
    defaultSeverity: 'moderate',
    description: 'Power surge damages main line-array amplifiers and digital audio console during sound check.',
    realisticContext: 'High-voltage spike tripped the master breaker and fried primary power amplifiers on the main stage.',
  },
  {
    id: 'staging_delay_cascade',
    title: 'Structural Truss Inspection Delay',
    category: 'timeline',
    defaultSeverity: 'moderate',
    description: 'Safety inspectors hold up stage rigging clearance by 4 hours, blocking sound check and rehearsal schedules.',
    realisticContext: 'City safety inspector requests additional structural bracing certifications before permitting rigging ascent.',
  },
];

/**
 * Step 2: Impact Analysis Engine
 * Evaluates current event state against triggered incident to identify affected entities.
 */
export function analyzeIncidentImpact(
  event: EventData,
  incidentType: IncidentType,
  severity: 'minor' | 'moderate' | 'severe' | 'critical' = 'severe'
): IncidentImpactReport {
  const affectedZones: string[] = [];
  const affectedVendorIds: string[] = [];
  const affectedTaskIds: string[] = [];
  const criticalScheduleConflicts: string[] = [];
  let capacityDelta = 0;
  let budgetRiskAmount = 0;
  let summary = '';

  const outdoorObjects = event.layoutObjects.filter((o) => o.zone === 'outdoor');
  const outdoorCapacity = outdoorObjects.reduce((sum, o) => sum + (o.capacity || 0), 0);

  switch (incidentType) {
    case 'heavy_rain': {
      affectedZones.push('outdoor', 'lawn_stage', 'amphitheatre');
      capacityDelta = -outdoorCapacity;
      summary = `Outdoor zone flooded. ${outdoorObjects.length} layout objects (including main stage & ${outdoorCapacity} seats) are inoperable. Outdoor schedule items blocked.`;

      // Find affected tasks (sound check, outdoor stage setup, open lawn seating)
      event.tasks.forEach((t) => {
        const titleLower = t.title.toLowerCase();
        if (
          titleLower.includes('outdoor') ||
          titleLower.includes('stage') ||
          titleLower.includes('lawn') ||
          titleLower.includes('truss') ||
          titleLower.includes('lighting')
        ) {
          affectedTaskIds.push(t.id);
        }
      });

      // Find outdoor schedule items
      event.schedule.forEach((s) => {
        if (s.zone === 'outdoor' || s.isWeatherDependent) {
          criticalScheduleConflicts.push(`${s.startTime} - ${s.title} (Requires dry outdoor stage)`);
        }
      });

      // Budget risk: weather tarping, urgent indoor setup fees
      budgetRiskAmount = 15000;
      break;
    }

    case 'caterer_cancellation': {
      summary = 'Contracted catering vendor cancelled. Guest dining and buffet services are completely unserved.';
      const catererVendors = event.vendors.filter((v) => v.category === 'catering');
      catererVendors.forEach((v) => affectedVendorIds.push(v.id));

      event.tasks.forEach((t) => {
        if (
          t.category.toLowerCase().includes('catering') ||
          t.title.toLowerCase().includes('food') ||
          t.title.toLowerCase().includes('buffet') ||
          t.title.toLowerCase().includes('tasting')
        ) {
          affectedTaskIds.push(t.id);
        }
      });

      criticalScheduleConflicts.push('Dinner / Lunch Buffet hours unstaffed and foodless');
      budgetRiskAmount = event.expenses
        .filter((e) => e.category === 'catering')
        .reduce((sum, e) => sum + e.subtotal, 0);
      break;
    }

    case 'attendance_surge': {
      const surgeCount = Math.round(event.expectedAttendance * 0.35);
      capacityDelta = surgeCount;
      summary = `Expected attendance increased from ${event.expectedAttendance} to ${
        event.expectedAttendance + surgeCount
      } (+35%). Severe seating and catering deficit.`;

      event.tasks.forEach((t) => {
        if (
          t.title.toLowerCase().includes('seating') ||
          t.title.toLowerCase().includes('badge') ||
          t.title.toLowerCase().includes('registration') ||
          t.title.toLowerCase().includes('security')
        ) {
          affectedTaskIds.push(t.id);
        }
      });

      criticalScheduleConflicts.push('Registration queue bottleneck exceeds entry capacity');
      budgetRiskAmount = surgeCount * 180; // Estimated incremental cost per attendee
      break;
    }

    case 'budget_cut': {
      const reduction = Math.round(event.totalBudget * 0.2);
      budgetRiskAmount = reduction;
      summary = `Budget reduced by 20% (deficit of ₹${reduction.toLocaleString(
        'en-IN'
      )}). Total planned expenditures now exceed approved funds.`;

      event.tasks.forEach((t) => {
        if (t.priority === 'low' || t.category === 'decoration' || t.category === 'entertainment') {
          affectedTaskIds.push(t.id);
        }
      });
      break;
    }

    case 'sound_equipment_failure': {
      summary = 'Main sound system amplifier stack failed. Acoustic output for performances and announcements is dead.';
      event.vendors
        .filter((v) => v.category === 'equipment' || v.category === 'entertainment')
        .forEach((v) => affectedVendorIds.push(v.id));

      event.tasks.forEach((t) => {
        if (
          t.title.toLowerCase().includes('sound') ||
          t.title.toLowerCase().includes('audio') ||
          t.title.toLowerCase().includes('rehearsal')
        ) {
          affectedTaskIds.push(t.id);
        }
      });

      criticalScheduleConflicts.push('Opening ceremony & performances cannot broadcast audio');
      budgetRiskAmount = 18000;
      break;
    }

    case 'staging_delay_cascade': {
      summary = 'Stage rigging inspection delayed by 4 hours. Blocks subsequent sound checks, lighting cues, and rehearsals.';
      event.tasks.forEach((t) => {
        if (
          t.title.toLowerCase().includes('sound check') ||
          t.title.toLowerCase().includes('rehearsal') ||
          t.title.toLowerCase().includes('performer') ||
          t.title.toLowerCase().includes('lighting cue')
        ) {
          affectedTaskIds.push(t.id);
        }
      });

      criticalScheduleConflicts.push(
        'Opening band sound check overlaps with guest arrival window'
      );
      break;
    }
  }

  return {
    incidentType,
    timestamp: new Date().toISOString(),
    severity,
    affectedZones,
    capacityDelta,
    affectedVendorIds,
    affectedTaskIds,
    budgetRiskAmount,
    criticalScheduleConflicts,
    summary,
  };
}

/**
 * Step 3 & 4: Candidate Recovery Plans & Feasibility Validation Engine
 * Generates structured candidate responses and checks budget, capacity, vendors, and schedule constraints.
 */
export function generateCandidateRecoveryPlans(
  event: EventData,
  report: IncidentImpactReport
): RecoveryPlanProposal[] {
  const currentBudgetSummary = calculateBudgetSummary(
    event.totalBudget,
    event.expenses,
    event.currency
  );
  const remainingReserve = currentBudgetSummary.remainingBudget;

  const proposals: RecoveryPlanProposal[] = [];

  switch (report.incidentType) {
    case 'heavy_rain': {
      // Plan 1: Pragmatic Hall Pivot (Feasible)
      const costDelta1 = 12000;
      const revisedBudget1 = currentBudgetSummary.plannedExpenditure + costDelta1;
      const budgetCheck1Passed = revisedBudget1 <= event.totalBudget;

      const indoorCapacityMax = event.venue.totalIndoorCapacity || 520;
      const capacityCheck1Passed = indoorCapacityMax >= event.expectedAttendance;

      proposals.push({
        id: 'plan_rain_pivot_indoor',
        title: 'Plan A: Strategic Indoor Hall Consolidation',
        strategy: 'Relocate stage and guest program into Main Auditorium. Deploy acoustic baffle panels.',
        description:
          'Shift the primary performance stage from the outdoor lawn to the indoor hall east podium. Convert outdoor lawn activities to an indoor foyer gallery. Adjust schedule by 30 mins for equipment transfer.',
        costDelta: costDelta1,
        revisedTotalBudget: revisedBudget1,
        scheduleImpact: '+30 min stage changeover buffer; all performances preserved indoors',
        affectedTasksSummary: [
          'Relocate audio console & stage podium to Indoor Auditorium',
          'Deploy emergency indoor acoustic baffles',
          'Post digital directional signage for indoor foyer',
        ],
        vendorActionSummary: [
          'Instruct StageCraft Rentals to deploy indoor compact truss',
          'Notify venue facilities to switch master AC & ventilation to max',
        ],
        layoutChangesSummary: [
          'Relocate Stage from Outdoor Lawn (Z: -12m) to Indoor Hall (Z: -6m)',
          'Reposition 4 outdoor round tables to indoor gallery perimeter',
          'Set outdoor objects status to "relocated"',
        ],
        unresolvedRisks: ['Slightly tighter standing room during climax performance'],
        isFeasible: budgetCheck1Passed && capacityCheck1Passed,
        feasibilityChecks: [
          {
            name: 'Budget Ceiling Check',
            passed: budgetCheck1Passed,
            detail: budgetCheck1Passed
              ? `Incremental cost ₹${costDelta1.toLocaleString('en-IN')} covered by contingency reserve (₹${remainingReserve.toLocaleString('en-IN')})`
              : `Exceeds budget ceiling by ₹${(revisedBudget1 - event.totalBudget).toLocaleString('en-IN')}`,
          },
          {
            name: 'Indoor Safe Capacity Check',
            passed: capacityCheck1Passed,
            detail: `Indoor hall capacity (${indoorCapacityMax}) satisfies expected attendance (${event.expectedAttendance})`,
          },
          {
            name: 'Weather Immunity Check',
            passed: true,
            detail: '100% of programming transitioned under waterproof indoor roof',
          },
        ],
        tradeOffSummary:
          'Modest ₹12,000 contingency expenditure; guarantees zero performance cancellations.',
        layoutMutations: {
          relocateObjects: event.layoutObjects
            .filter((o) => o.zone === 'outdoor')
            .map((o, idx) => ({
              id: o.id,
              zone: 'indoor',
              position: [
                o.type === 'stage' ? 0 : -6 + (idx % 4) * 4,
                0,
                o.type === 'stage' ? -6 : 3 + Math.floor(idx / 4) * 3,
              ],
            })),
        },
        budgetMutations: [
          {
            category: 'equipment',
            description: 'Emergency indoor audio relocation & crew rush fee',
            amount: 8000,
          },
          {
            category: 'staff',
            description: 'Additional indoor usher & porter crew (4 staff)',
            amount: 4000,
          },
        ],
      });

      // Plan 2: Ambitious Waterproof Dome Tenting (Infeasible due to extreme cost & delivery time)
      const costDelta2 = 85000;
      const revisedBudget2 = currentBudgetSummary.plannedExpenditure + costDelta2;
      const budgetCheck2Passed = revisedBudget2 <= event.totalBudget;

      proposals.push({
        id: 'plan_rain_waterproof_tenting',
        title: 'Plan B: Emergency Outdoor Mega-Canopy Erection',
        strategy: 'Rent heavy-duty German aluminum waterproof hangar tent for the entire lawn.',
        description:
          'Construct a 30m x 20m high-peak tent over the outdoor amphitheatre to maintain the open-air layout. Requires rapid contractor mobilization.',
        costDelta: costDelta2,
        revisedTotalBudget: revisedBudget2,
        scheduleImpact: 'Requires 6 hours construction lead time (unrealistic before opening)',
        affectedTasksSummary: ['Halt all setup for 6 hours while crane and truss tent are assembled'],
        vendorActionSummary: ['Engage Emergency Tent Co. at 300% weekend surge pricing'],
        layoutChangesSummary: ['Maintain outdoor stage under simulated mega-dome'],
        unresolvedRisks: [
          'High probability contractor delivery arrives after event start',
          'Violates approved total budget by over ₹60,000',
        ],
        isFeasible: false,
        feasibilityChecks: [
          {
            name: 'Budget Ceiling Check',
            passed: budgetCheck2Passed,
            detail: `FAILED: Exceeds approved budget ceiling by ₹${(revisedBudget2 - event.totalBudget).toLocaleString('en-IN')}`,
          },
          {
            name: 'Time Feasibility Check',
            passed: false,
            detail: 'FAILED: Tent assembly requires 6 hours, event starts in 2 hours',
          },
          {
            name: 'Permit & Safety Clearance',
            passed: false,
            detail: 'FAILED: Outdoor high-wind structural permit cannot be issued during active rainstorm',
          },
        ],
        tradeOffSummary:
          'Severely infeasible: breaches fiscal ceiling and construction timeline.',
      });
      break;
    }

    case 'caterer_cancellation': {
      // Plan 1: Rapid Demo Vendor Replacement (Feasible)
      const costDelta1 = 15000;
      const revisedBudget1 = currentBudgetSummary.plannedExpenditure + costDelta1;
      const budgetCheck1Passed = revisedBudget1 <= event.totalBudget;

      proposals.push({
        id: 'plan_caterer_rapid_replacement',
        title: 'Plan A: Pre-Vetted Standby Caterer Activation',
        strategy: 'Contract verified partner "Royal Feast Hospitality" with live buffet stations.',
        description:
          'Mobilize standby caterer from pre-vetted local database. Menu streamlined to high-throughput festive buffet (Biryani, Pasta & Dessert bar) requiring minimal prep time.',
        costDelta: costDelta1,
        revisedTotalBudget: revisedBudget1,
        scheduleImpact: 'Buffet service opening shifted by 20 minutes',
        affectedTasksSummary: [
          'Sign emergency SLA with Royal Feast Hospitality',
          'Coordinate loading dock entry and water supply access',
        ],
        vendorActionSummary: [
          'Cancel previous vendor contract under force-majeure clause',
          'Deploy Royal Feast Hospitality team of 12 servers',
        ],
        layoutChangesSummary: ['Maintain buffet stations in indoor dining wing'],
        unresolvedRisks: ['Slightly simplified dessert selection compared to original gourmet tasting'],
        isFeasible: budgetCheck1Passed,
        feasibilityChecks: [
          {
            name: 'Budget Ceiling Check',
            passed: budgetCheck1Passed,
            detail: `₹${costDelta1.toLocaleString('en-IN')} emergency surcharge absorbed by contingency reserve`,
          },
          {
            name: 'Guest Capacity Match',
            passed: true,
            detail: `Substitute vendor capacity (550 pax) satisfies event demand (${event.expectedAttendance} pax)`,
          },
          {
            name: 'Food Safety & Hygiene Certification',
            passed: true,
            detail: 'Verified FSSAI Grade-A certification on file',
          },
        ],
        tradeOffSummary: 'Modest surcharge for guaranteed full guest meal coverage and fast turnaround.',
        budgetMutations: [
          {
            category: 'catering',
            description: 'Emergency standby catering replacement fee',
            amount: 15000,
          },
        ],
      });

      // Plan 2: Food Truck Fleet (Infeasible if outdoor lawn is constrained)
      const costDelta2 = 35000;
      const revisedBudget2 = currentBudgetSummary.plannedExpenditure + costDelta2;
      proposals.push({
        id: 'plan_caterer_food_trucks',
        title: 'Plan B: Multi-Vendor Food Truck Concourse',
        strategy: 'Book 5 independent artisan food trucks to park around the venue.',
        description: 'Provide food truck vouchers to all guests for diverse gourmet food choices.',
        costDelta: costDelta2,
        revisedTotalBudget: revisedBudget2,
        scheduleImpact: 'High queuing delays of 40+ minutes per truck',
        affectedTasksSummary: ['Manage parking bay electrical hookups for 5 trucks'],
        vendorActionSummary: ['Coordinate 5 separate vendor billing agreements'],
        layoutChangesSummary: ['Requires 5 large outdoor parking spaces'],
        unresolvedRisks: ['Severe bottleneck in food delivery and potential weather exposure'],
        isFeasible: false,
        feasibilityChecks: [
          {
            name: 'Budget Ceiling Check',
            passed: false,
            detail: `FAILED: ₹${costDelta2.toLocaleString('en-IN')} exceeds available contingency funds`,
          },
          {
            name: 'Throughput Check',
            passed: false,
            detail: `FAILED: 5 food trucks cannot serve ${event.expectedAttendance} guests within standard 90-minute meal window`,
          },
        ],
        tradeOffSummary: 'Expensive and introduces high service delays.',
      });
      break;
    }

    case 'attendance_surge': {
      const surgeCount = Math.round(event.expectedAttendance * 0.35);
      const newAttendance = event.expectedAttendance + surgeCount;
      const costDelta1 = 18000;
      const revisedBudget1 = currentBudgetSummary.plannedExpenditure + costDelta1;
      const budgetCheck1Passed = revisedBudget1 <= event.totalBudget;

      proposals.push({
        id: 'plan_surge_overflow_staggering',
        title: 'Plan A: Overflow Seating & Staggered Hospitality',
        strategy: 'Deploy modular banquet seating and implement 2-tier dining time slots.',
        description:
          `Add 12 additional 8-seater dining tables in the gallery foyer. Stagger catering service into two 45-minute cohorts to distribute demand smoothly. Increase registration check-in tablets from 2 to 5.`,
        costDelta: costDelta1,
        revisedTotalBudget: revisedBudget1,
        scheduleImpact: 'Dining schedule split into Slot A (12:30 PM) and Slot B (1:30 PM)',
        affectedTasksSummary: [
          'Rent 12 additional banquet tables and 96 banquet chairs',
          'Procure +100 welcome kits and badges',
          'Deploy 2 additional registration scanners',
        ],
        vendorActionSummary: [
          'Request caterer to prepare +35% headcount batch with quick-cook items',
        ],
        layoutChangesSummary: [
          'Expand indoor foyer into secondary seating zone',
          'Add 12 new round banquet tables to 3D layout',
        ],
        unresolvedRisks: ['Requires clear guest communication regarding staggered dining slots'],
        isFeasible: budgetCheck1Passed && newAttendance <= (event.venue.totalIndoorCapacity || 600) + 100,
        feasibilityChecks: [
          {
            name: 'Budget Feasibility',
            passed: budgetCheck1Passed,
            detail: `Incremental cost ₹${costDelta1.toLocaleString('en-IN')} is within budget reserve`,
          },
          {
            name: 'Total Venue Capacity Check',
            passed: true,
            detail: `Venue combined indoor/foyer space accommodates ${newAttendance} guests under staggered flow`,
          },
          {
            name: 'Egress & Fire Safety Clearance',
            passed: true,
            detail: 'Minimum 2.5m aisle clearance maintained along all emergency exits',
          },
        ],
        tradeOffSummary: 'Solves seating and dining without requiring venue relocation.',
        budgetMutations: [
          {
            category: 'catering',
            description: 'Headcount expansion catering surcharge (+35%)',
            amount: 11000,
          },
          {
            category: 'equipment',
            description: 'Rental of 12 additional round tables & 96 chairs',
            amount: 7000,
          },
        ],
      });
      break;
    }

    case 'budget_cut': {
      const reduction = Math.round(event.totalBudget * 0.2);
      proposals.push({
        id: 'plan_budget_austerity_rebalance',
        title: 'Plan A: Balanced Austerity Protocol (Zero Core Impact)',
        strategy: 'Trim discretionary floral decoration & celebrity VIP lounge; preserve core guest experience.',
        description:
          `Reduce decorative lighting fixtures, replace imported exotic flowers with seasonal botanical arrangements, and convert printed brochures to digital QR programs. Saves ₹${reduction.toLocaleString(
            'en-IN'
          )} without cutting food, sound, or essential safety.`,
        costDelta: -reduction,
        revisedTotalBudget: currentBudgetSummary.plannedExpenditure - reduction,
        scheduleImpact: 'No impact on event day schedule',
        affectedTasksSummary: [
          'Cancel premium floral canopy order; switch to minimalist eco-botanical styling',
          'Switch printed programs to mobile interactive QR code cards',
        ],
        vendorActionSummary: [
          'Renegotiate decoration contract with floral supplier for ₹15,000 credit',
        ],
        layoutChangesSummary: ['Simplify entrance archway and remove luxury lounge set'],
        unresolvedRisks: ['Slightly more understated visual decor compared to initial lavish vision'],
        isFeasible: true,
        feasibilityChecks: [
          {
            name: 'Budget Rebalancing',
            passed: true,
            detail: `Reduces planned expenses by ₹${reduction.toLocaleString('en-IN')}, balancing the new deficit`,
          },
          {
            name: 'Core Programming Integrity',
            passed: true,
            detail: '100% of guest food, stage, audio, and safety remain fully funded',
          },
        ],
        tradeOffSummary: 'Cuts luxury embellishments to safeguard core event delivery.',
        budgetMutations: [
          {
            category: 'decoration',
            description: 'Rebalance floral and decorative canopy scope',
            amount: -Math.round(reduction * 0.65),
          },
          {
            category: 'entertainment',
            description: 'Trim secondary ambient entertainment lounge',
            amount: -Math.round(reduction * 0.35),
          },
        ],
      });
      break;
    }

    case 'sound_equipment_failure': {
      const costDelta1 = 14000;
      const revisedBudget1 = currentBudgetSummary.plannedExpenditure + costDelta1;
      const budgetCheck1Passed = revisedBudget1 <= event.totalBudget;

      proposals.push({
        id: 'plan_sound_hot_swap',
        title: 'Plan A: Emergency Mobile Audio Hot-Swap',
        strategy: 'Deploy emergency standby twin-rig amplifiers and soundboard from city depot.',
        description:
          'Local partner rental service dispatched with twin 5000W digital amplifiers and 16-channel console. Arrives within 45 minutes.',
        costDelta: costDelta1,
        revisedTotalBudget: revisedBudget1,
        scheduleImpact: 'Sound check shifted by 45 minutes; main show on time',
        affectedTasksSummary: [
          'Unhook blown amplifier channels and isolate power source',
          'Plug in replacement hot-swap console upon delivery',
        ],
        vendorActionSummary: ['AudioTech City Warehouse dispatched with delivery van'],
        layoutChangesSummary: ['Retain sound tower positions in 3D layout'],
        unresolvedRisks: ['Compressed 15-minute sound check before curtain rise'],
        isFeasible: budgetCheck1Passed,
        feasibilityChecks: [
          {
            name: 'Budget Feasibility',
            passed: budgetCheck1Passed,
            detail: `₹${costDelta1.toLocaleString('en-IN')} emergency courier & equipment rental within reserve`,
          },
          {
            name: 'Technical Compatibility',
            passed: true,
            detail: 'Dante audio digital protocol matches existing stage snake cables',
          },
        ],
        tradeOffSummary: 'Quick technical swap resolves sound crisis with minimal schedule ripple.',
        budgetMutations: [
          {
            category: 'equipment',
            description: 'Standby amplifier hot-swap and urgent courier dispatch',
            amount: 14000,
          },
        ],
      });
      break;
    }

    case 'staging_delay_cascade': {
      proposals.push({
        id: 'plan_timeline_parallel_reorder',
        title: 'Plan A: Parallel Workstream Reordering',
        strategy: 'Reshuffle sound check and performer briefing to parallel indoor green room.',
        description:
          'Conduct vocal and instrument tuning inside Green Room 2 while rigging is secured. Run safety inspection concurrently with food setup rather than sequentially.',
        costDelta: 0,
        revisedTotalBudget: currentBudgetSummary.plannedExpenditure,
        scheduleImpact: 'Zero net delay to opening ceremony; schedules realigned',
        affectedTasksSummary: [
          'Parallelize Green Room rehearsal and stage rigging',
          'Compress transition intervals between speakers by 5 minutes each',
        ],
        vendorActionSummary: ['Brief technical stage manager on adjusted run sheet'],
        layoutChangesSummary: ['No physical furniture changes required'],
        unresolvedRisks: ['Requires tight discipline from stage manager and MC'],
        isFeasible: true,
        feasibilityChecks: [
          {
            name: 'Zero Cost Impact',
            passed: true,
            detail: 'Process realignment incurred ₹0 incremental cost',
          },
          {
            name: 'Dependency Chain Integrity',
            passed: true,
            detail: 'Decoupled green-room rehearsal from stage rigging dependency',
          },
        ],
        tradeOffSummary: 'Free, operationally clean fix by parallelizing independent tasks.',
      });
      break;
    }
  }

  return proposals;
}

/**
 * Step 6: Apply Recovery Plan
 * Immutably mutates canonical event state based on accepted recovery proposal.
 */
export function applyRecoveryPlan(
  event: EventData,
  plan: RecoveryPlanProposal,
  incidentReport: IncidentImpactReport
): EventData {
  if (!plan.isFeasible) {
    throw new Error('Cannot apply an infeasible recovery plan.');
  }

  // 1. Mutate layout objects if specified
  let updatedLayout = [...event.layoutObjects];
  if (plan.layoutMutations?.relocateObjects) {
    const relocationMap = new Map(
      plan.layoutMutations.relocateObjects.map((r) => [r.id, r])
    );
    updatedLayout = updatedLayout.map((obj) => {
      const reloc = relocationMap.get(obj.id);
      if (reloc) {
        return {
          ...obj,
          zone: reloc.zone,
          position: reloc.position,
          status: 'relocated',
          notes: 'Relocated via crisis recovery plan',
        };
      }
      return obj;
    });
  }

  // 2. Mutate expenses
  const updatedExpenses = [...event.expenses];
  if (plan.budgetMutations && plan.budgetMutations.length > 0) {
    plan.budgetMutations.forEach((bm) => {
      if (bm.amount !== 0) {
        updatedExpenses.push({
          id: `crisis_exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          category: bm.category,
          description: `[Recovery: ${plan.title}] ${bm.description}`,
          quantity: 1,
          unitCost: Math.abs(bm.amount),
          subtotal: bm.amount,
          confirmedAmount: Math.abs(bm.amount),
          status: 'planned',
          notes: `Created by recovery plan ${plan.id}`,
        });
      }
    });
  }

  // 3. Mutate tasks
  let updatedTasks = [...event.tasks];
  // Add a task for executing the recovery plan itself
  updatedTasks.push({
    id: `task_crisis_recovery_${Date.now()}`,
    title: `[Crisis Action] ${plan.title}`,
    description: plan.description,
    category: 'Crisis Management',
    assignedRole: 'Event Director',
    assignedPerson: 'Command Center Lead',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'critical',
    status: 'in_progress',
    dependencies: [],
    estimatedCost: Math.max(0, plan.costDelta),
    isAffectedByCrisis: true,
  });

  // 4. Update schedule if rain or delay
  let updatedSchedule = [...event.schedule];
  if (incidentReport.incidentType === 'heavy_rain') {
    updatedSchedule = updatedSchedule.map((s) => ({
      ...s,
      zone: 'indoor',
      description: s.description + ' (Shifted to Indoor Hall due to weather)',
    }));
  }

  // 5. Version snapshot increment
  const newVersionNumber = event.currentVersionNumber + 1;
  const newSnapshot = {
    versionId: `v_${newVersionNumber}_${Date.now()}`,
    versionNumber: newVersionNumber,
    timestamp: new Date().toISOString(),
    changeDescription: `Crisis Recovery Applied: ${plan.title} (Incident: ${incidentReport.incidentType})`,
    author: 'Crisis Simulator Engine',
    budgetSummary: calculateBudgetSummary(event.totalBudget, updatedExpenses, event.currency),
    expenses: updatedExpenses,
    layoutObjects: updatedLayout,
    tasks: updatedTasks,
    vendors: event.vendors,
    schedule: updatedSchedule,
    activeCrisisDescription: `${incidentReport.incidentType} resolved with ${plan.title}`,
  };

  return {
    ...event,
    layoutObjects: updatedLayout,
    expenses: updatedExpenses,
    tasks: updatedTasks,
    schedule: updatedSchedule,
    currentVersionNumber: newVersionNumber,
    versions: [...event.versions, newSnapshot],
    activeIncidentReport: undefined, // Cleared once resolved!
    candidateRecoveryPlans: undefined,
  };
}
