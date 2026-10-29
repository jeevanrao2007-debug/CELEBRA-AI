/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { calculateBudgetSummary, identifySavingsOpportunities } from '../src/logic/budgetEngine.ts';
import {
  canCompleteTask,
  validateDependencyGraph,
  getTaskStats,
  calculateDelayCascade,
} from '../src/logic/taskEngine.ts';
import { evaluateVenueCapacity, isObjectWithinBounds } from '../src/logic/capacityEngine.ts';
import {
  analyzeIncidentImpact,
  generateCandidateRecoveryPlans,
  applyRecoveryPlan,
} from '../src/logic/crisisEngine.ts';
import { createVersionSnapshot, restoreVersion, compareVersions } from '../src/logic/versionEngine.ts';
import { createInitialDemoFestival, DEMO_VENUE } from '../src/data/demoFestival.ts';
import { createWeddingPreset, createBirthdayPreset } from '../src/data/demoEvents.ts';
import { ExpenseItem, Task, LayoutObject } from '../src/types/index.ts';

describe('CelebraAI Deterministic Budget Engine', () => {
  test('correctly calculates total planned expenditure, category allocations, and remaining reserve', () => {
    const expenses: ExpenseItem[] = [
      {
        id: '1',
        category: 'catering',
        description: 'Buffet',
        quantity: 100,
        unitCost: 150,
        subtotal: 15000,
        confirmedAmount: 15000,
        status: 'contracted',
      },
      {
        id: '2',
        category: 'venue',
        description: 'Hall Rental',
        quantity: 1,
        unitCost: 20000,
        subtotal: 20000,
        confirmedAmount: 20000,
        status: 'paid',
      },
      {
        id: '3',
        category: 'decoration',
        description: 'Stage Florals',
        quantity: 1,
        unitCost: 5000,
        subtotal: 5000,
        confirmedAmount: 0,
        status: 'planned',
      },
    ];

    const budget = 50000;
    const summary = calculateBudgetSummary(budget, expenses, 'INR');

    assert.equal(summary.plannedExpenditure, 40000);
    assert.equal(summary.confirmedExpenditure, 35000);
    assert.equal(summary.remainingBudget, 10000);
    assert.equal(summary.isOverBudget, false);
    assert.equal(summary.overBudgetAmount, 0);
    assert.equal(summary.utilizationPercentage, 80);
    assert.equal(summary.categoryAllocations.catering.allocated, 15000);
    assert.equal(summary.categoryAllocations.venue.allocated, 20000);
  });

  test('detects over-budget conditions accurately without silent truncation', () => {
    const expenses: ExpenseItem[] = [
      {
        id: '1',
        category: 'equipment',
        description: 'Audio Rig',
        quantity: 1,
        unitCost: 75000,
        subtotal: 75000,
        confirmedAmount: 75000,
        status: 'contracted',
      },
    ];

    const budget = 50000;
    const summary = calculateBudgetSummary(budget, expenses, 'INR');

    assert.equal(summary.isOverBudget, true);
    assert.equal(summary.overBudgetAmount, 25000);
    assert.equal(summary.remainingBudget, -25000);
  });
});

describe('CelebraAI Task Dependency Engine', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task_A',
      title: 'Stage Rigging',
      description: 'Erect Stage Truss',
      category: 'Stage',
      assignedRole: 'Rigger',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'high',
      status: 'completed',
      dependencies: [],
      estimatedCost: 10000,
    },
    {
      id: 'task_B',
      title: 'Sound Check',
      description: 'Calibrate mics',
      category: 'Audio',
      assignedRole: 'Audio Tech',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'high',
      status: 'in_progress',
      dependencies: ['task_A'],
      estimatedCost: 5000,
    },
    {
      id: 'task_C',
      title: 'Opening Band Performance',
      description: 'Curtain rise',
      category: 'Show',
      assignedRole: 'MC',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'critical',
      status: 'todo',
      dependencies: ['task_B'],
      estimatedCost: 0,
    },
  ];

  test('allows task completion when prerequisite is completed', () => {
    // task_B depends on task_A which is 'completed'
    const check = canCompleteTask('task_B', sampleTasks);
    assert.equal(check.canComplete, true);
    assert.equal(check.missingPrerequisites.length, 0);
  });

  test('blocks task completion if prerequisite is incomplete', () => {
    // task_C depends on task_B which is 'in_progress'
    const check = canCompleteTask('task_C', sampleTasks);
    assert.equal(check.canComplete, false);
    assert.ok(check.reason?.includes('Sound Check'));
  });

  test('detects circular dependencies in task graphs', () => {
    const cyclicTasks: Task[] = [
      {
        ...sampleTasks[0],
        id: 't1',
        dependencies: ['t2'],
      },
      {
        ...sampleTasks[1],
        id: 't2',
        dependencies: ['t1'],
      },
    ];

    const graphValidation = validateDependencyGraph(cyclicTasks);
    assert.equal(graphValidation.isValid, false);
    assert.ok(graphValidation.circularDependencyPaths.length > 0);
  });
});

describe('CelebraAI Venue Capacity & Spatial Boundaries', () => {
  test('evaluates compliant seating and warns on capacity deficit', () => {
    const layout: LayoutObject[] = [
      {
        id: 'tbl_1',
        type: 'round_table',
        name: 'Table 1',
        zone: 'indoor',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        capacity: 8,
        status: 'operational',
      },
    ];

    const evaluation = evaluateVenueCapacity(DEMO_VENUE, layout, 20);
    assert.equal(evaluation.totalSeatsConfigured, 8);
    assert.equal(evaluation.deficit, 12);
    assert.equal(evaluation.isCompliant, false);
    assert.ok(evaluation.warnings.length > 0);
  });

  test('enforces spatial boundaries inside venue perimeter', () => {
    // Indoor venue has width 26 (half 13) and length 32 (half 16)
    const inside = isObjectWithinBounds([5, 0, 8], 'indoor', DEMO_VENUE);
    assert.equal(inside, true);

    const outside = isObjectWithinBounds([20, 0, 5], 'indoor', DEMO_VENUE);
    assert.equal(outside, false);
  });

  test('evaluates seating_row objects as contributing to total venue capacity', () => {
    const layout: LayoutObject[] = [
      {
        id: 'row_1',
        type: 'seating_row',
        name: 'Row A',
        zone: 'indoor',
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        capacity: 24,
        status: 'operational',
      },
    ];

    const stats = evaluateVenueCapacity(DEMO_VENUE, layout, 20);
    assert.equal(stats.totalSeatsConfigured, 24);
    assert.equal(stats.indoorSeatsConfigured, 24);
    assert.equal(stats.deficit, 0);
  });
});

describe('CelebraAI Crisis Simulation & Feasibility Engine', () => {
  test('analyzes impact of heavy rain storm on outdoor zone', () => {
    const event = createInitialDemoFestival();
    const report = analyzeIncidentImpact(event, 'heavy_rain', 'severe');

    assert.equal(report.incidentType, 'heavy_rain');
    assert.ok(report.affectedZones.includes('outdoor'));
    assert.ok(report.affectedTaskIds.length > 0);
    assert.ok(report.budgetRiskAmount > 0);
  });

  test('generates both feasible and infeasible candidate recovery plans', () => {
    const event = createInitialDemoFestival();
    const report = analyzeIncidentImpact(event, 'heavy_rain', 'severe');
    const plans = generateCandidateRecoveryPlans(event, report);

    assert.ok(plans.length >= 2);
    const feasiblePlan = plans.find((p) => p.isFeasible);
    const infeasiblePlan = plans.find((p) => !p.isFeasible);

    assert.ok(feasiblePlan, 'A feasible plan must be available');
    assert.ok(infeasiblePlan, 'An infeasible plan must be present to test rejection');
    assert.ok(infeasiblePlan?.feasibilityChecks.some((c) => !c.passed));
  });

  test('applying a feasible recovery plan transitions event state immutably and increments version', () => {
    const event = createInitialDemoFestival();
    const report = analyzeIncidentImpact(event, 'heavy_rain', 'severe');
    const plans = generateCandidateRecoveryPlans(event, report);
    const feasiblePlan = plans.find((p) => p.isFeasible)!;

    const initialVersion = event.currentVersionNumber;
    const initialObjects = event.layoutObjects.length;

    const updatedEvent = applyRecoveryPlan(event, feasiblePlan, report);

    assert.equal(updatedEvent.currentVersionNumber, initialVersion + 1);
    assert.equal(updatedEvent.versions.length, event.versions.length + 1);
    // Relocated objects exist
    const relocated = updatedEvent.layoutObjects.filter((o) => o.status === 'relocated');
    assert.ok(relocated.length > 0);
  });

  test('applying an infeasible recovery plan throws an error and is blocked', () => {
    const event = createInitialDemoFestival();
    const report = analyzeIncidentImpact(event, 'heavy_rain', 'severe');
    const plans = generateCandidateRecoveryPlans(event, report);
    const infeasiblePlan = plans.find((p) => !p.isFeasible)!;

    assert.throws(() => {
      applyRecoveryPlan(event, infeasiblePlan, report);
    }, /Cannot apply an infeasible recovery plan/);
  });
});

describe('CelebraAI Event Rewind Engine', () => {
  test('restoring an earlier snapshot appends a new version without deleting history', () => {
    const event = createInitialDemoFestival();
    const v1Id = event.versions[0].versionId;

    // Create a version 2 snapshot
    const v2 = createVersionSnapshot(event, 'Modified lighting');
    const eventV2 = {
      ...event,
      currentVersionNumber: 2,
      versions: [...event.versions, v2],
    };

    // Restore back to v1
    const restoredEvent = restoreVersion(eventV2, v1Id);

    assert.equal(restoredEvent.currentVersionNumber, 3);
    assert.equal(restoredEvent.versions.length, 3); // History preserved!
    assert.ok(restoredEvent.versions[2].changeDescription.includes('Rewound to Version 1'));
  });

  test('compares differences between two versions accurately', () => {
    const event = createInitialDemoFestival();
    const v1 = event.versions[0];
    const v2 = createVersionSnapshot(event, 'Added VIP Lounge');

    const diff = compareVersions(v1, v2);
    assert.equal(diff.v1Number, 1);
    assert.equal(diff.v2Number, 2);
    assert.equal(diff.v1PlannedSpend, diff.v2PlannedSpend);
  });
});

describe('CelebraAI Delay Cascade Propagation Engine', () => {
  const chainTasks: Task[] = [
    {
      id: 't_setup',
      title: 'Truss Setup',
      description: 'Setup stage structure',
      category: 'Stage',
      assignedRole: 'Rigger',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'high',
      status: 'in_progress',
      dependencies: [],
      estimatedCost: 10000,
    },
    {
      id: 't_audio',
      title: 'PA Rigging',
      description: 'Hang speakers',
      category: 'Audio',
      assignedRole: 'Audio Engineer',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'high',
      status: 'todo',
      dependencies: ['t_setup'],
      estimatedCost: 5000,
    },
    {
      id: 't_rehearsal',
      title: 'Sound Check',
      description: 'Performer rehearsal',
      category: 'Show',
      assignedRole: 'Lead Artist',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'critical',
      status: 'todo',
      dependencies: ['t_audio'],
      estimatedCost: 0,
    },
    {
      id: 't_doors',
      title: 'Doors Open',
      description: 'Admit attendees',
      category: 'Operations',
      assignedRole: 'Floor Lead',
      startDate: '2026-10-22',
      dueDate: '2026-10-22',
      priority: 'critical',
      status: 'todo',
      dependencies: ['t_rehearsal'],
      estimatedCost: 0,
    },
  ];

  test('propagates delay through transitive dependency chains', () => {
    const cascade = calculateDelayCascade('t_setup', 2, chainTasks);

    assert.equal(cascade.sourceTaskId, 't_setup');
    assert.equal(cascade.delayHours, 2);
    // t_audio, t_rehearsal, and t_doors all depend transitively on t_setup
    assert.ok(cascade.affectedTaskIds.includes('t_audio'));
    assert.ok(cascade.affectedTaskIds.includes('t_rehearsal'));
    assert.ok(cascade.affectedTaskIds.includes('t_doors'));
    assert.equal(cascade.affectedTaskIds.length, 3);
    assert.equal(cascade.scheduleRisk, 'critical');
    assert.ok(cascade.mitigationStrategy.length > 0);
  });

  test('evaluates minor risk when no downstream tasks depend on the delayed item', () => {
    const cascade = calculateDelayCascade('t_doors', 1, chainTasks);

    assert.equal(cascade.affectedTaskIds.length, 0);
    assert.equal(cascade.scheduleRisk, 'minor');
  });
});

describe('CelebraAI Savings Opportunities Engine', () => {
  test('identifies catering, decor, and equipment savings opportunities from expense distribution', () => {
    const expenses: ExpenseItem[] = [
      {
        id: 'c1',
        category: 'catering',
        description: 'Multi-course dinner',
        quantity: 1,
        unitCost: 65000,
        subtotal: 65000,
        confirmedAmount: 0,
        status: 'planned',
      },
      {
        id: 'd1',
        category: 'decoration',
        description: 'Floral canopies',
        quantity: 1,
        unitCost: 30000,
        subtotal: 30000,
        confirmedAmount: 0,
        status: 'planned',
      },
      {
        id: 'e1',
        category: 'equipment',
        description: 'Sound package',
        quantity: 1,
        unitCost: 40000,
        subtotal: 40000,
        confirmedAmount: 0,
        status: 'planned',
      },
    ];

    const opportunities = identifySavingsOpportunities(200000, expenses, 'INR');

    assert.ok(opportunities.length >= 3);
    const cateringOpp = opportunities.find((o) => o.category === 'catering');
    const decorOpp = opportunities.find((o) => o.category === 'decoration');
    const equipOpp = opportunities.find((o) => o.category === 'equipment');

    assert.ok(cateringOpp);
    assert.ok(cateringOpp.potentialSavings > 0);
    assert.ok(decorOpp);
    assert.ok(equipOpp);
  });
});

describe('CelebraAI Multi-Category Event Presets', () => {
  test('creates a valid Royal Wedding preset with complete venue, expenses, tasks, and schedule', () => {
    const wedding = createWeddingPreset();

    assert.equal(wedding.category, 'wedding');
    assert.equal(wedding.expectedAttendance, 350);
    assert.equal(wedding.totalBudget, 1200000);
    assert.ok(wedding.venue.zones.length >= 2);
    assert.ok(wedding.expenses.length >= 5);
    assert.ok(wedding.tasks.length >= 4);
    assert.ok(wedding.vendors.length >= 3);
    assert.ok(wedding.schedule.length >= 3);
    assert.equal(wedding.currentVersionNumber, 1);
  });

  test('creates a valid Milestone 50th Birthday preset with glasshouse venue layout', () => {
    const bday = createBirthdayPreset();

    assert.equal(bday.category, 'birthday');
    assert.equal(bday.expectedAttendance, 120);
    assert.equal(bday.totalBudget, 350000);
    assert.ok(bday.layoutObjects.length >= 4);
    assert.ok(bday.expenses.length >= 4);
    assert.ok(bday.tasks.length >= 4);
  });
});

