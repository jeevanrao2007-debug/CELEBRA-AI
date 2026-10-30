/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudgetSummary, formatCurrency, ALL_EXPENSE_CATEGORIES } from '../src/logic/budgetEngine';
import { ExpenseItem } from '../src/types';

describe('CelebraAI Financial & Mathematical Invariants Engine', () => {
  test('handles empty expenses array safely without NaN or division by zero', () => {
    const summary = calculateBudgetSummary(500000, [], 'INR');

    assert.equal(summary.totalBudget, 500000);
    assert.equal(summary.plannedExpenditure, 0);
    assert.equal(summary.confirmedExpenditure, 0);
    assert.equal(summary.remainingBudget, 500000);
    assert.equal(summary.utilizationPercentage, 0);
    assert.equal(summary.isOverBudget, false);
    assert.equal(summary.overBudgetAmount, 0);

    // All standard expense categories must be present with 0 spent
    for (const cat of ALL_EXPENSE_CATEGORIES) {
      assert.ok(cat in summary.categoryAllocations);
      assert.equal(summary.categoryAllocations[cat].spent, 0);
      assert.equal(summary.categoryAllocations[cat].percentage, 0);
    }
  });

  test('boundary test: exactly 1 unit over budget flips isOverBudget with exact delta', () => {
    const budget = 100000;
    const boundaryExpenses: ExpenseItem[] = [
      {
        id: 'exp_1',
        category: 'catering',
        description: 'Buffet',
        quantity: 1,
        unitCost: 100001,
        subtotal: 100001,
        confirmedAmount: 100001,
        status: 'contracted',
      },
    ];

    const summary = calculateBudgetSummary(budget, boundaryExpenses, 'INR');
    assert.equal(summary.isOverBudget, true);
    assert.equal(summary.overBudgetAmount, 1);
    assert.equal(summary.remainingBudget, -1);
    assert.ok(summary.utilizationPercentage >= 100);
  });

  test('sum of all category allocated expenditures strictly equals plannedExpenditure', () => {
    const expenses: ExpenseItem[] = [
      { id: '1', category: 'venue', description: 'Hall', quantity: 1, unitCost: 80000, subtotal: 80000, confirmedAmount: 80000, status: 'contracted' },
      { id: '2', category: 'catering', description: 'Dinner', quantity: 200, unitCost: 450, subtotal: 90000, confirmedAmount: 90000, status: 'contracted' },
      { id: '3', category: 'decoration', description: 'Florals', quantity: 1, unitCost: 25000, subtotal: 25000, confirmedAmount: 0, status: 'planned' },
      { id: '4', category: 'photography', description: 'Photos', quantity: 1, unitCost: 35000, subtotal: 35000, confirmedAmount: 35000, status: 'contracted' },
      { id: '5', category: 'entertainment', description: 'DJ Rig', quantity: 1, unitCost: 15000, subtotal: 15000, confirmedAmount: 0, status: 'planned' },
      { id: '6', category: 'equipment', description: 'Lights', quantity: 1, unitCost: 12000, subtotal: 12000, confirmedAmount: 0, status: 'planned' },
      { id: '7', category: 'transport', description: 'Shuttle', quantity: 2, unitCost: 6000, subtotal: 12000, confirmedAmount: 0, status: 'planned' },
      { id: '8', category: 'staff', description: 'Marshalls', quantity: 4, unitCost: 2500, subtotal: 10000, confirmedAmount: 10000, status: 'contracted' },
      { id: '9', category: 'contingency', description: 'Reserve', quantity: 1, unitCost: 20000, subtotal: 20000, confirmedAmount: 0, status: 'planned' },
    ];

    const expectedTotal = 80000 + 90000 + 25000 + 35000 + 15000 + 12000 + 12000 + 10000 + 20000;
    const summary = calculateBudgetSummary(350000, expenses, 'INR');

    assert.equal(summary.plannedExpenditure, expectedTotal);
    assert.equal(summary.confirmedExpenditure, 80000 + 90000 + 35000 + 10000);

    const sumCategories = Object.values(summary.categoryAllocations).reduce(
      (sum, cat) => sum + cat.allocated,
      0
    );
    assert.equal(sumCategories, expectedTotal);
  });

  test('currency formatter generates proper locale symbols and handles boundary amounts', () => {
    assert.ok(formatCurrency(100000, 'INR').includes('₹') || formatCurrency(100000, 'INR').includes('1,00,000'));
    assert.ok(formatCurrency(5000, 'USD').includes('$') || formatCurrency(5000, 'USD').includes('5,000'));
    assert.ok(formatCurrency(0, 'INR').includes('0'));
    assert.ok(formatCurrency(-500, 'INR').includes('-'));
  });
});
