/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  simulateVendorDropout,
  mobilizeStandbyVendor,
  calculateVendorFinancials,
  validateVendorRecord,
  syncVendorToExpenses,
} from '../src/logic/vendorEngine.ts';
import {
  validatePlanInput,
  validateAssistantInput,
  validateGeneratedAiPlan,
} from '../src/logic/validationEngine.ts';
import { ExpenseItem, Vendor } from '../src/types/index.ts';

describe('CelebraAI Vendor Management & Standby Replacement Engine', () => {
  const sampleVendors: Vendor[] = [
    {
      id: 'v_sound',
      name: 'Sonic Acoustics',
      category: 'equipment',
      contactPerson: 'Arun M.',
      quotedPrice: 50000,
      capacityLimit: 1000,
      bookingStatus: 'confirmed',
      isDemoEntity: true,
      cancellationTerms: '48h notice',
      notes: 'Line array audio system',
      affectedTaskIds: ['t_soundcheck'],
    },
    {
      id: 'v_caterer',
      name: 'Royal Heritage Kitchens',
      category: 'catering',
      contactPerson: 'Meera S.',
      quotedPrice: 120000,
      capacityLimit: 400,
      bookingStatus: 'confirmed',
      isDemoEntity: true,
      cancellationTerms: '72h notice',
      notes: 'Gourmet buffet service',
      affectedTaskIds: ['t_buffet_setup'],
    },
    {
      id: 'v_standby_caterer',
      name: 'Apex Culinary (Standby)',
      category: 'catering',
      contactPerson: 'Deepak V.',
      quotedPrice: 130000,
      capacityLimit: 500,
      bookingStatus: 'suggested',
      isDemoEntity: true,
      cancellationTerms: 'Emergency standby SLA',
      notes: 'Pre-vetted emergency reserve',
      affectedTaskIds: [],
    },
  ];

  test('simulates vendor dropout with disruption reason and cancelled status', () => {
    const updated = simulateVendorDropout(sampleVendors, 'v_caterer', 'Kitchen electrical failure');
    const dropped = updated.find((v) => v.id === 'v_caterer')!;

    assert.equal(dropped.bookingStatus, 'cancelled');
    assert.ok(dropped.notes.includes('Kitchen electrical failure'));
  });

  test('mobilizes standby partner with 10% SLA surcharge and confirmed status', () => {
    // First drop the caterer
    const droppedVendors = simulateVendorDropout(sampleVendors, 'v_caterer');
    // Now mobilize standby
    const result = mobilizeStandbyVendor(droppedVendors, 'v_caterer', { surchargePercentage: 0.1 });

    assert.equal(result.costDelta, 12000); // 10% of 120000
    assert.ok(result.mobilizedVendor);
    assert.equal(result.mobilizedVendor.quotedPrice, 132000);
    assert.equal(result.mobilizedVendor.bookingStatus, 'confirmed');
    assert.ok(result.mobilizedVendor.notes.includes('Emergency replacement deployed'));
  });

  test('calculates accurate aggregate vendor financials and disruption rate', () => {
    const dropped = simulateVendorDropout(sampleVendors, 'v_caterer');
    const stats = calculateVendorFinancials(dropped);

    assert.equal(stats.totalQuoted, 300000);
    assert.equal(stats.confirmedCount, 1);
    assert.equal(stats.cancelledCount, 1);
    assert.equal(stats.pendingCount, 1);
    assert.equal(stats.disruptionRate, 33);
  });

  test('validates vendor record data quality constraints', () => {
    const valid = validateVendorRecord({
      name: 'Luxe Decorators',
      quotedPrice: 45000,
      capacityLimit: 300,
      email: 'team@luxedecor.com',
    });
    assert.equal(valid.isValid, true);
    assert.equal(valid.errors.length, 0);

    const invalid = validateVendorRecord({
      name: '',
      quotedPrice: -500,
      email: 'not-an-email',
    });
    assert.equal(invalid.isValid, false);
    assert.ok(invalid.errors.some((e) => e.includes('Vendor name cannot be empty')));
    assert.ok(invalid.errors.some((e) => e.includes('non-negative number')));
    assert.ok(invalid.errors.some((e) => e.includes('Invalid email')));
  });

  test('synchronizes vendor pricing adjustments into budget expense records', () => {
    const initialExpenses: ExpenseItem[] = [
      {
        id: 'exp_1',
        category: 'equipment',
        description: 'Sonic Acoustics Sound Contract',
        quantity: 1,
        unitCost: 50000,
        subtotal: 50000,
        confirmedAmount: 50000,
        status: 'contracted',
      },
    ];

    const mobilizedVendor: Vendor = {
      ...sampleVendors[0],
      quotedPrice: 55000, // Mobilized with surcharge
      bookingStatus: 'confirmed',
    };

    const synced = syncVendorToExpenses(initialExpenses, mobilizedVendor, 'INR');
    assert.equal(synced.length, 1);
    assert.equal(synced[0].subtotal, 55000);
    assert.equal(synced[0].confirmedAmount, 55000);
  });
});

describe('CelebraAI Server-Side Input Validation & Security Engine', () => {
  test('validates and sanitizes compliant event planning requests', () => {
    const raw = {
      name: '  Annual Gala Night  ',
      category: 'community',
      date: '2026-11-20',
      city: 'Bangalore, KA',
      expectedAttendance: '350',
      totalBudget: '500000',
      currency: 'INR',
      venueType: 'hybrid',
      styleTheme: 'Modern Gala',
    };

    const result = validatePlanInput(raw);
    assert.equal(result.isValid, true);
    assert.ok(result.sanitized);
    assert.equal(result.sanitized.name, 'Annual Gala Night');
    assert.equal(result.sanitized.expectedAttendance, 350);
    assert.equal(result.sanitized.totalBudget, 500000);
  });

  test('rejects out-of-range budget, invalid category, and impossible attendance', () => {
    const badInput = {
      name: 'Broken Event',
      category: 'unknown_party',
      expectedAttendance: -50,
      totalBudget: 500, // Below minimum 1000
    };

    const result = validatePlanInput(badInput);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Invalid event category')));
    assert.ok(result.errors.some((e) => e.includes('attendance must be a positive integer')));
    assert.ok(result.errors.some((e) => e.includes('Total budget must be a positive number')));
  });

  test('validates contextual assistant input and clamps oversized prompts', () => {
    const valid = validateAssistantInput({
      prompt: 'How do I handle catering delays?',
      context: {
        eventName: 'Fest 2026',
        expectedAttendance: 500,
        totalBudget: 200000,
        plannedSpend: 180000,
        contingencyReserve: 20000,
        isOverBudget: false,
        taskCount: 12,
      },
    });

    assert.equal(valid.isValid, true);
    assert.equal(valid.sanitized?.prompt, 'How do I handle catering delays?');

    const oversized = validateAssistantInput({
      prompt: 'a'.repeat(1500), // Exceeds 1000 limit
      context: {},
    });

    assert.equal(oversized.isValid, false);
    assert.ok(oversized.errors.some((e) => e.includes('exceeds maximum limit of 1000')));
  });
});

describe('CelebraAI Untrusted AI Response Sanitization Engine', () => {
  test('accepts structured AI response and sanitizes expense subtotals', () => {
    const rawAiResponse = {
      theme: { name: 'Emerald Spark' },
      expenses: [
        {
          id: 'exp_1',
          category: 'venue',
          description: 'Grand Hall',
          quantity: 1,
          unitCost: 80000,
          status: 'contracted',
        },
        {
          id: 'exp_2',
          category: 'catering',
          description: 'Dinner Service',
          quantity: 200,
          unitCost: 300,
          status: 'planned',
        },
      ],
      layoutObjects: [
        {
          id: 'obj_1',
          type: 'stage',
          name: 'Main Stage',
          zone: 'indoor',
          position: [0, 0, 5],
          capacity: 0,
        },
      ],
      tasks: [
        {
          id: 't_1',
          title: 'Sign Venue Contract',
          priority: 'high',
          status: 'todo',
        },
      ],
    };

    const result = validateGeneratedAiPlan(rawAiResponse, 200000);
    assert.equal(result.isValid, true);
    assert.ok(result.sanitizedPlan);
    assert.equal(result.sanitizedPlan.expenses.length, 2);
    assert.equal(result.sanitizedPlan.expenses[0].subtotal, 80000);
    assert.equal(result.sanitizedPlan.expenses[1].subtotal, 60000);
  });

  test('rejects AI output that exceeds total budget by >5%', () => {
    const overSpendingAiResponse = {
      expenses: [
        {
          id: 'exp_1',
          category: 'venue',
          description: 'Ultra Palace',
          quantity: 1,
          unitCost: 350000,
        },
      ],
      layoutObjects: [],
      tasks: [],
    };

    const result = validateGeneratedAiPlan(overSpendingAiResponse, 200000);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('exceed maximum event budget')));
  });

  test('rejects empty or corrupt AI output missing expenses', () => {
    const emptyAi = {
      theme: 'Invalid',
    };

    const result = validateGeneratedAiPlan(emptyAi, 100000);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('must include an array of expenses')));
  });
});
