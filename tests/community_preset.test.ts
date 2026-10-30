/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityPreset } from '../src/data/demoEvents';
import { calculateBudgetSummary } from '../src/logic/budgetEngine';
import { evaluateVenueCapacity } from '../src/logic/capacityEngine';
import { validateDependencyGraph } from '../src/logic/taskEngine';
import { calculateVendorFinancials, validateVendorRecord } from '../src/logic/vendorEngine';

describe('CelebraAI Problem Statement: Community Event Preset Invariants', () => {
  test('creates a fully formed community event satisfying the core problem statement', () => {
    const communityEvent = createCommunityPreset();

    assert.equal(communityEvent.category, 'community');
    assert.equal(communityEvent.expectedAttendance, 450);
    assert.equal(communityEvent.totalBudget, 280000);
    assert.equal(communityEvent.currency, 'INR');
    assert.ok(communityEvent.name.includes('Community'));
    assert.equal(communityEvent.currentVersionNumber, 1);
    assert.equal(communityEvent.versions.length, 1);
  });

  test('community preset budget remains strictly within approved limit with contingency reserve', () => {
    const event = createCommunityPreset();
    const summary = calculateBudgetSummary(event.totalBudget, event.expenses, event.currency);

    assert.equal(summary.isOverBudget, false);
    assert.equal(summary.overBudgetAmount, 0);
    assert.ok(summary.remainingBudget >= 0);
    assert.ok(summary.plannedExpenditure <= event.totalBudget);

    // Sum of category allocations matches planned expenditure
    const totalAllocated = Object.values(summary.categoryAllocations).reduce(
      (acc, cat) => acc + cat.allocated,
      0
    );
    assert.equal(totalAllocated, summary.plannedExpenditure);
  });

  test('community venue capacity satisfies or exceeds expected attendance', () => {
    const event = createCommunityPreset();
    const capacityStats = evaluateVenueCapacity(event.venue, event.layoutObjects, event.expectedAttendance);

    assert.ok(capacityStats.totalSeatsConfigured >= event.expectedAttendance);
    assert.equal(capacityStats.isCompliant, true);
    assert.equal(capacityStats.deficit, 0);
    assert.ok(capacityStats.indoorOccupancyRate <= 100);
    assert.ok(capacityStats.outdoorOccupancyRate <= 100);
  });

  test('community task dependency graph is acyclic and free of missing parent IDs', () => {
    const event = createCommunityPreset();
    const validation = validateDependencyGraph(event.tasks);

    assert.equal(validation.isValid, true);
    assert.equal(validation.circularDependencyPaths.length, 0);

    const taskIds = new Set(event.tasks.map((t) => t.id));
    for (const task of event.tasks) {
      for (const parentId of task.dependencies) {
        assert.ok(
          taskIds.has(parentId),
          `Task "${task.id}" has missing parent dependency "${parentId}"`
        );
      }
    }
  });

  test('community vendors are all marked as demo entities and satisfy data constraints', () => {
    const event = createCommunityPreset();
    assert.ok(event.vendors.length >= 3);

    for (const vendor of event.vendors) {
      assert.equal(vendor.isDemoEntity, true);
      const val = validateVendorRecord(vendor);
      assert.equal(val.isValid, true, `Vendor ${vendor.name} failed validation: ${val.errors.join(', ')}`);
    }

    const fin = calculateVendorFinancials(event.vendors);
    assert.ok(fin.totalQuoted > 0);
    assert.ok(fin.totalQuoted <= event.totalBudget);
    assert.equal(fin.cancelledCount, 0);
  });
});
