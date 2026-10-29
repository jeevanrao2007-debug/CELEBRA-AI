/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventData, EventVersionSnapshot } from '../types';
import { calculateBudgetSummary } from './budgetEngine';

export interface VersionDiff {
  v1Number: number;
  v2Number: number;
  v1Timestamp: string;
  v2Timestamp: string;
  v1Description: string;
  v2Description: string;
  budgetDelta: number; // v2 - v1
  v1PlannedSpend: number;
  v2PlannedSpend: number;
  v1ObjectCount: number;
  v2ObjectCount: number;
  v1TaskCount: number;
  v2TaskCount: number;
  v1CompletedTasks: number;
  v2CompletedTasks: number;
  layoutChanges: string[];
  expenseChanges: string[];
  taskChanges: string[];
}

/**
 * Creates an immutable snapshot of current event state.
 */
export function createVersionSnapshot(
  event: EventData,
  changeDescription: string,
  author: string = 'User Edit'
): EventVersionSnapshot {
  const versionNumber = (event.currentVersionNumber || 1) + 1;
  const budgetSummary = calculateBudgetSummary(event.totalBudget, event.expenses, event.currency);

  return {
    versionId: `v_${versionNumber}_${Date.now()}`,
    versionNumber,
    timestamp: new Date().toISOString(),
    changeDescription,
    author,
    budgetSummary,
    expenses: JSON.parse(JSON.stringify(event.expenses)),
    layoutObjects: JSON.parse(JSON.stringify(event.layoutObjects)),
    tasks: JSON.parse(JSON.stringify(event.tasks)),
    vendors: JSON.parse(JSON.stringify(event.vendors)),
    schedule: JSON.parse(JSON.stringify(event.schedule)),
  };
}

/**
 * Restores a prior version snapshot.
 * CRITICAL RULE: Restoring does NOT delete history. It appends a new version entry representing the rollback!
 */
export function restoreVersion(event: EventData, targetVersionId: string): EventData {
  const targetSnapshot = event.versions.find((v) => v.versionId === targetVersionId);

  if (!targetSnapshot) {
    throw new Error(`Cannot restore: Version snapshot ${targetVersionId} not found.`);
  }

  const restoredVersionNumber = event.currentVersionNumber + 1;
  const restorationSnapshot: EventVersionSnapshot = {
    versionId: `v_${restoredVersionNumber}_${Date.now()}`,
    versionNumber: restoredVersionNumber,
    timestamp: new Date().toISOString(),
    changeDescription: `Rewound to Version ${targetSnapshot.versionNumber} ("${targetSnapshot.changeDescription}")`,
    author: 'Event Rewind Restoration',
    budgetSummary: JSON.parse(JSON.stringify(targetSnapshot.budgetSummary)),
    expenses: JSON.parse(JSON.stringify(targetSnapshot.expenses)),
    layoutObjects: JSON.parse(JSON.stringify(targetSnapshot.layoutObjects)),
    tasks: JSON.parse(JSON.stringify(targetSnapshot.tasks)),
    vendors: JSON.parse(JSON.stringify(targetSnapshot.vendors)),
    schedule: JSON.parse(JSON.stringify(targetSnapshot.schedule)),
  };

  return {
    ...event,
    expenses: JSON.parse(JSON.stringify(targetSnapshot.expenses)),
    layoutObjects: JSON.parse(JSON.stringify(targetSnapshot.layoutObjects)),
    tasks: JSON.parse(JSON.stringify(targetSnapshot.tasks)),
    vendors: JSON.parse(JSON.stringify(targetSnapshot.vendors)),
    schedule: JSON.parse(JSON.stringify(targetSnapshot.schedule)),
    currentVersionNumber: restoredVersionNumber,
    versions: [...event.versions, restorationSnapshot],
    activeIncidentReport: undefined,
    candidateRecoveryPlans: undefined,
  };
}

/**
 * Computes deep differences between two snapshots for visual before/after comparison.
 */
export function compareVersions(v1: EventVersionSnapshot, v2: EventVersionSnapshot): VersionDiff {
  const budgetDelta = v2.budgetSummary.plannedExpenditure - v1.budgetSummary.plannedExpenditure;

  const layoutChanges: string[] = [];
  const v1ObjMap = new Map(v1.layoutObjects.map((o) => [o.id, o]));
  const v2ObjMap = new Map(v2.layoutObjects.map((o) => [o.id, o]));

  v2.layoutObjects.forEach((o2) => {
    const o1 = v1ObjMap.get(o2.id);
    if (!o1) {
      layoutChanges.push(`Added object: "${o2.name}" (${o2.zone})`);
    } else if (o1.zone !== o2.zone || o1.position[0] !== o2.position[0] || o1.position[2] !== o2.position[2]) {
      layoutChanges.push(`Relocated "${o2.name}" from ${o1.zone} [${o1.position[0].toFixed(1)}, ${o1.position[2].toFixed(1)}] to ${o2.zone} [${o2.position[0].toFixed(1)}, ${o2.position[2].toFixed(1)}]`);
    }
  });

  v1.layoutObjects.forEach((o1) => {
    if (!v2ObjMap.has(o1.id)) {
      layoutChanges.push(`Removed object: "${o1.name}"`);
    }
  });

  const expenseChanges: string[] = [];
  const v1ExpMap = new Map(v1.expenses.map((e) => [e.id, e]));
  const v2ExpMap = new Map(v2.expenses.map((e) => [e.id, e]));

  v2.expenses.forEach((e2) => {
    const e1 = v1ExpMap.get(e2.id);
    if (!e1) {
      expenseChanges.push(`New expense: "${e2.description}" (₹${e2.subtotal.toLocaleString('en-IN')})`);
    } else if (e1.subtotal !== e2.subtotal) {
      expenseChanges.push(`Modified "${e2.description}": ₹${e1.subtotal} → ₹${e2.subtotal}`);
    }
  });

  const taskChanges: string[] = [];
  const v1TaskMap = new Map(v1.tasks.map((t) => [t.id, t]));
  const v2TaskMap = new Map(v2.tasks.map((t) => [t.id, t]));

  v2.tasks.forEach((t2) => {
    const t1 = v1TaskMap.get(t2.id);
    if (!t1) {
      taskChanges.push(`New task: "${t2.title}"`);
    } else if (t1.status !== t2.status) {
      taskChanges.push(`Task "${t2.title}": ${t1.status} → ${t2.status}`);
    }
  });

  const v1CompletedTasks = v1.tasks.filter((t) => t.status === 'completed').length;
  const v2CompletedTasks = v2.tasks.filter((t) => t.status === 'completed').length;

  return {
    v1Number: v1.versionNumber,
    v2Number: v2.versionNumber,
    v1Timestamp: v1.timestamp,
    v2Timestamp: v2.timestamp,
    v1Description: v1.changeDescription,
    v2Description: v2.changeDescription,
    budgetDelta,
    v1PlannedSpend: v1.budgetSummary.plannedExpenditure,
    v2PlannedSpend: v2.budgetSummary.plannedExpenditure,
    v1ObjectCount: v1.layoutObjects.length,
    v2ObjectCount: v2.layoutObjects.length,
    v1TaskCount: v1.tasks.length,
    v2TaskCount: v2.tasks.length,
    v1CompletedTasks,
    v2CompletedTasks,
    layoutChanges,
    expenseChanges,
    taskChanges,
  };
}
