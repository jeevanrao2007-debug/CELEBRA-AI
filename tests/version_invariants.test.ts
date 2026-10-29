/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createVersionSnapshot, restoreVersion, compareVersions } from '../src/logic/versionEngine';
import { createInitialDemoFestival } from '../src/data/demoEvents';

describe('CelebraAI Version Monotonicity & Rollback Invariants', () => {
  test('creates immutable snapshots with strict version monotonicity', () => {
    const event = createInitialDemoFestival();
    const initialVersion = event.currentVersionNumber;

    const snap1 = createVersionSnapshot(event, 'First checkpoint', 'Lead Architect');
    assert.equal(snap1.versionNumber, initialVersion + 1);
    assert.equal(snap1.changeDescription, 'First checkpoint');
    assert.equal(snap1.author, 'Lead Architect');
    assert.ok(snap1.versionId.startsWith(`v_${initialVersion + 1}_`));

    // Deep copy isolation check: mutating event should NOT mutate snapshot
    event.expenses[0].unitCost = 999999;
    assert.notEqual(snap1.expenses[0].unitCost, 999999);
  });

  test('restoring an earlier snapshot appends a new version without deleting history', () => {
    const baseEvent = createInitialDemoFestival();
    const snap1 = createVersionSnapshot(baseEvent, 'Snapshot 1');
    const eventV2 = {
      ...baseEvent,
      currentVersionNumber: snap1.versionNumber,
      versions: [...baseEvent.versions, snap1],
    };

    const snap2 = createVersionSnapshot(eventV2, 'Snapshot 2 (with changes)');
    const eventV3 = {
      ...eventV2,
      currentVersionNumber: snap2.versionNumber,
      versions: [...eventV2.versions, snap2],
    };

    const restored = restoreVersion(eventV3, snap1.versionId);

    // Rollback invariant: versions array length grew, not shrunk
    assert.equal(restored.versions.length, eventV3.versions.length + 1);
    assert.equal(restored.currentVersionNumber, eventV3.currentVersionNumber + 1);

    // All previous versions are still intact
    assert.ok(restored.versions.some((v) => v.versionId === snap1.versionId));
    assert.ok(restored.versions.some((v) => v.versionId === snap2.versionId));

    // Active incident should be cleared on rewind
    assert.equal(restored.activeIncidentReport, undefined);
  });

  test('throws descriptive error when attempting to restore non-existent version ID', () => {
    const event = createInitialDemoFestival();
    assert.throws(
      () => restoreVersion(event, 'v_non_existent_999'),
      /Cannot restore: Version snapshot v_non_existent_999 not found/
    );
  });

  test('computes deep differential comparison accurately between two version snapshots', () => {
    const event = createInitialDemoFestival();
    const snapA = createVersionSnapshot(event, 'Baseline snapshot');

    // Mutate and create second snapshot
    const eventModified = {
      ...event,
      currentVersionNumber: snapA.versionNumber,
      expenses: [
        ...event.expenses,
        {
          id: 'exp_diff_test',
          category: 'entertainment' as const,
          description: 'Fireworks pyrotechnic license',
          quantity: 1,
          unitCost: 15000,
          subtotal: 15000,
          confirmedAmount: 0,
          status: 'planned' as const,
        },
      ],
      tasks: event.tasks.slice(1), // remove one task
    };

    const snapB = createVersionSnapshot(eventModified, 'Added fireworks');
    const diff = compareVersions(snapA, snapB);

    assert.equal(diff.v1Number, snapA.versionNumber);
    assert.equal(diff.v2Number, snapB.versionNumber);
    assert.equal(diff.budgetDelta, 15000);
    assert.equal(diff.v2TaskCount, snapA.tasks.length - 1);
    assert.ok(diff.expenseChanges.some((c) => c.includes('Fireworks pyrotechnic license')));
  });
});

