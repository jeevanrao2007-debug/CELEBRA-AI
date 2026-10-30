/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createWeddingPreset, createBirthdayPreset, createCommunityPreset, createInitialDemoFestival } from '../src/data/demoEvents';
import { createVersionSnapshot } from '../src/logic/versionEngine';
import { EventData } from '../src/types';

describe('CelebraAI State Persistence & Serialization Invariants', () => {
  test('all 4 event presets serialize and deserialize without loss of data integrity', () => {
    const presets: EventData[] = [
      createInitialDemoFestival(),
      createWeddingPreset(),
      createBirthdayPreset(),
      createCommunityPreset(),
    ];

    for (const preset of presets) {
      const serialized = JSON.stringify(preset);
      const parsed: EventData = JSON.parse(serialized);

      assert.equal(parsed.id, preset.id);
      assert.equal(parsed.name, preset.name);
      assert.equal(parsed.category, preset.category);
      assert.equal(parsed.totalBudget, preset.totalBudget);
      assert.equal(parsed.expenses.length, preset.expenses.length);
      assert.equal(parsed.tasks.length, preset.tasks.length);
      assert.equal(parsed.vendors.length, preset.vendors.length);
      assert.equal(parsed.layoutObjects.length, preset.layoutObjects.length);
      assert.equal(parsed.schedule.length, preset.schedule.length);
      assert.equal(parsed.versions.length, preset.versions.length);
    }
  });

  test('resilience against corrupted or invalid storage data', () => {
    const safeParseStorage = (raw: string | null): EventData[] | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
          return parsed;
        }
      } catch {
        // Fallback gracefully
      }
      return null;
    };

    assert.equal(safeParseStorage(null), null);
    assert.equal(safeParseStorage(''), null);
    assert.equal(safeParseStorage('not-json'), null);
    assert.equal(safeParseStorage('{"single":"object"}'), null);
    assert.equal(safeParseStorage('[]'), null);
    assert.equal(safeParseStorage('[{"corrupt":true}]'), null);

    const valid = [createWeddingPreset()];
    const result = safeParseStorage(JSON.stringify(valid));
    assert.ok(result);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, valid[0].id);
  });

  test('version snapshots are fully isolated deep copies', () => {
    const event = createWeddingPreset();
    const snapshot = createVersionSnapshot(event, 'Pre-modification baseline');

    // Mutate the active event deeply
    event.expenses[0].unitCost = 9999999;
    event.tasks[0].status = 'blocked';
    event.layoutObjects[0].position = [100, 100, 100];
    event.vendors[0].bookingStatus = 'cancelled';

    // Verify snapshot was not mutated
    assert.notEqual(snapshot.expenses[0].unitCost, 9999999);
    assert.notEqual(snapshot.tasks[0].status, 'blocked');
    assert.notDeepEqual(snapshot.layoutObjects[0].position, [100, 100, 100]);
    assert.notEqual(snapshot.vendors[0].bookingStatus, 'cancelled');
  });
});
