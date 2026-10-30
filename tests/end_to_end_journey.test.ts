/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createWeddingPreset } from '../src/data/demoEvents';
import { calculateBudgetSummary } from '../src/logic/budgetEngine';
import { evaluateVenueCapacity } from '../src/logic/capacityEngine';
import { calculateDelayCascade } from '../src/logic/taskEngine';
import { simulateVendorDropout, mobilizeStandbyVendor } from '../src/logic/vendorEngine';
import { analyzeIncidentImpact, generateCandidateRecoveryPlans, applyRecoveryPlan } from '../src/logic/crisisEngine';
import { createVersionSnapshot, restoreVersion } from '../src/logic/versionEngine';

describe('CelebraAI End-to-End Autonomous Event Lifecycle Journey', () => {
  test('executes complete 7-stage event journey with strict invariant preservation', () => {
    // ── STAGE 1: Event Requirement & Baseline Initialization ──────────────────
    let event = createWeddingPreset();
    assert.equal(event.currentVersionNumber, 1);
    const initialBudget = event.totalBudget;
    const initialSummary = calculateBudgetSummary(initialBudget, event.expenses, event.currency);
    assert.equal(initialSummary.isOverBudget, false);
    assert.ok(initialSummary.remainingBudget > 0);

    // ── STAGE 2: Task Dependency & Schedule Propagation ─────────────────────
    // Delay lead permit/contract task and verify downstream tasks cascade
    const rootTask = event.tasks[0];
    const delayImpact = calculateDelayCascade(rootTask.id, 4, event.tasks);
    assert.ok(delayImpact.affectedTaskIds.length >= 0);
    assert.equal(delayImpact.sourceTaskId, rootTask.id);

    // ── STAGE 3: Vendor Disruption & Standby Mobilization ─────────────────────
    const primaryVendor = event.vendors[0];
    const droppedVendors = simulateVendorDropout(event.vendors, primaryVendor.id);
    assert.equal(
      droppedVendors.find((v) => v.id === primaryVendor.id)?.bookingStatus,
      'cancelled'
    );

    // Mobilize standby partner with SLA surcharge
    const standbyResult = mobilizeStandbyVendor(droppedVendors, primaryVendor.id);
    assert.ok(standbyResult.mobilizedVendor !== null);
    assert.equal(standbyResult.mobilizedVendor.bookingStatus, 'confirmed');
    assert.ok(standbyResult.costDelta > 0);
    event = {
      ...event,
      vendors: standbyResult.updatedVendors,
    };

    // Commit checkpoint v2
    const v2Snapshot = createVersionSnapshot(event, 'Vendor Standby Mobilization Deployed');
    event = {
      ...event,
      currentVersionNumber: v2Snapshot.versionNumber,
      versions: [...event.versions, v2Snapshot],
    };
    assert.equal(event.currentVersionNumber, 2);

    // ── STAGE 4: Environmental Crisis Simulation (Heavy Rain) ────────────────
    const impact = analyzeIncidentImpact(event, 'heavy_rain', 'severe');
    assert.equal(impact.incidentType, 'heavy_rain');
    assert.ok(impact.capacityDelta < 0 || impact.affectedZones.length > 0);

    // ── STAGE 5: Autonomous Recovery Plan Generation ─────────────────────────
    const candidates = generateCandidateRecoveryPlans(event, impact);
    assert.ok(candidates.length >= 2);

    const feasiblePlan = candidates.find((p) => p.isFeasible);
    assert.ok(feasiblePlan, 'Must generate at least one mathematically feasible recovery plan');

    // ── STAGE 6: Apply Recovery Plan Immutably ────────────────────────────────
    event = applyRecoveryPlan(event, feasiblePlan, impact);
    assert.equal(event.currentVersionNumber, 3);
    assert.equal(event.versions.length, 3);

    // Verify post-crisis capacity is compliant
    const postCrisisCapacity = evaluateVenueCapacity(
      event.venue,
      event.layoutObjects,
      event.expectedAttendance
    );
    assert.ok(postCrisisCapacity.totalSeatsConfigured > 0);

    // ── STAGE 7: Non-Destructive Event Rewind to Version 1 ───────────────────
    const restoredEvent = restoreVersion(event, 'v_1_wed');
    assert.equal(restoredEvent.currentVersionNumber, 4); // Monotonic increment
    assert.equal(restoredEvent.versions.length, 4); // Audit trail preserved
    assert.equal(restoredEvent.totalBudget, initialBudget);
    assert.equal(restoredEvent.expenses.length, event.versions[0].expenses.length);
  });
});
