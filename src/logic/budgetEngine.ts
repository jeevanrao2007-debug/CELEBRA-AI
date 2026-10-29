/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetSummary, CurrencyCode, ExpenseCategory, ExpenseItem } from '../types';

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'venue',
  'catering',
  'decoration',
  'photography',
  'entertainment',
  'equipment',
  'transport',
  'staff',
  'contingency',
];

/**
 * Pure deterministic budget calculation engine.
 * Computes exact totals, allocations, remaining balances, and detects over-budget conditions.
 */
export function calculateBudgetSummary(
  totalBudget: number,
  expenses: ExpenseItem[],
  currency: CurrencyCode = 'INR'
): BudgetSummary {
  const safeTotalBudget = Math.max(0, Number(totalBudget) || 0);

  let plannedExpenditure = 0;
  let confirmedExpenditure = 0;

  // Initialize category trackers
  const categoryAllocations = ALL_EXPENSE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = { allocated: 0, spent: 0, percentage: 0 };
    return acc;
  }, {} as BudgetSummary['categoryAllocations']);

  for (const item of expenses) {
    const subtotal = Math.max(0, (Number(item.quantity) || 1) * (Number(item.unitCost) || 0));
    const confirmed = Math.max(0, Number(item.confirmedAmount) || 0);

    plannedExpenditure += subtotal;
    confirmedExpenditure += confirmed;

    if (categoryAllocations[item.category]) {
      categoryAllocations[item.category].allocated += subtotal;
      categoryAllocations[item.category].spent += confirmed;
    }
  }

  // Calculate percentages
  for (const cat of ALL_EXPENSE_CATEGORIES) {
    if (plannedExpenditure > 0) {
      categoryAllocations[cat].percentage = Math.round(
        (categoryAllocations[cat].allocated / plannedExpenditure) * 100
      );
    } else {
      categoryAllocations[cat].percentage = 0;
    }
  }

  const remainingBudget = safeTotalBudget - plannedExpenditure;
  const isOverBudget = plannedExpenditure > safeTotalBudget;
  const overBudgetAmount = isOverBudget ? plannedExpenditure - safeTotalBudget : 0;
  const utilizationPercentage =
    safeTotalBudget > 0
      ? Math.min(999, Math.round((plannedExpenditure / safeTotalBudget) * 100))
      : 0;

  // Explicit contingency category allocation if present, otherwise unallocated remainder
  const explicitContingency = categoryAllocations.contingency?.allocated || 0;
  const contingencyReserve = explicitContingency > 0 ? explicitContingency : Math.max(0, remainingBudget);

  return {
    currency,
    totalBudget: safeTotalBudget,
    plannedExpenditure,
    confirmedExpenditure,
    remainingBudget,
    contingencyReserve,
    utilizationPercentage,
    isOverBudget,
    overBudgetAmount,
    categoryAllocations,
  };
}

/**
 * Formats a currency amount with standard symbols and locale formatting.
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const rounded = Math.round(amount);
  switch (currency) {
    case 'INR':
      return `₹${rounded.toLocaleString('en-IN')}`;
    case 'USD':
      return `$${rounded.toLocaleString('en-US')}`;
    case 'EUR':
      return `€${rounded.toLocaleString('de-DE')}`;
    case 'GBP':
      return `£${rounded.toLocaleString('en-GB')}`;
    default:
      return `${currency} ${rounded.toLocaleString()}`;
  }
}

/**
 * Deterministically analyzes expense distributions to identify actionable savings opportunities.
 */
export function identifySavingsOpportunities(
  totalBudget: number,
  expenses: ExpenseItem[],
  currency: CurrencyCode = 'INR'
): import('../types').SavingsOpportunity[] {
  const summary = calculateBudgetSummary(totalBudget, expenses, currency);
  const opportunities: import('../types').SavingsOpportunity[] = [];

  // 1. Catering optimization
  const cateringAlloc = summary.categoryAllocations.catering?.allocated || 0;
  if (cateringAlloc > 25000) {
    const potential = Math.round(cateringAlloc * 0.15);
    opportunities.push({
      id: 'save_catering_buffet_streamline',
      category: 'catering',
      title: 'Buffet Menu Streamlining & Live Counters',
      potentialSavings: potential,
      description: 'Replace heavy multi-course sit-down service with high-throughput live interactive counters (e.g. Biryani/Pasta/Tapas) and seasonal desserts.',
      tradeOff: 'Fewer exotic imported ingredients; slightly more informal guest dining style.',
      impactLevel: 'low',
      actionType: 'reduce_scope',
    });
  }

  // 2. Floral & Decor seasonal substitutions
  const decorAlloc = summary.categoryAllocations.decoration?.allocated || 0;
  if (decorAlloc > 15000) {
    const potential = Math.round(decorAlloc * 0.20);
    opportunities.push({
      id: 'save_decor_seasonal_florals',
      category: 'decoration',
      title: 'Eco-Botanical & Seasonal Flower Sourcing',
      potentialSavings: potential,
      description: 'Switch from greenhouse imported cut orchids to locally sourced marigolds, eucalyptus foliage, brass candelabras, and architectural fabric draping.',
      tradeOff: 'Subtle shift from delicate pastel blossoms to rich warm architectural textures.',
      impactLevel: 'low',
      actionType: 'seasonal_swap',
    });
  }

  // 3. Equipment & Sound consolidation
  const equipAlloc = summary.categoryAllocations.equipment?.allocated || 0;
  if (equipAlloc > 20000) {
    const potential = Math.round(equipAlloc * 0.12);
    opportunities.push({
      id: 'save_equip_bundled_logistics',
      category: 'equipment',
      title: 'Integrated AV & Lighting Package Consolidation',
      potentialSavings: potential,
      description: 'Bundle stage audio, moving head lighting, and truss rigging under a single production vendor to eliminate duplicate freight and technician call-out charges.',
      tradeOff: 'Single supplier dependency for technical staging.',
      impactLevel: 'medium',
      actionType: 'switch_vendor',
    });
  }

  // 4. Printed Collateral & Paper Goods
  const staffOrMisc = summary.categoryAllocations.staff?.allocated || 0;
  if (totalBudget >= 100000) {
    opportunities.push({
      id: 'save_digital_guest_experience',
      category: 'staff',
      title: 'Digital QR Guide & Mobile Check-in',
      potentialSavings: 6000,
      description: 'Replace physical printed agendas, welcome booklets, and paper badge laminates with digital interactive mobile itinerary cards.',
      tradeOff: 'Requires guests to scan QR on mobile devices.',
      impactLevel: 'low',
      actionType: 'digital_alternative',
    });
  }

  return opportunities;
}

