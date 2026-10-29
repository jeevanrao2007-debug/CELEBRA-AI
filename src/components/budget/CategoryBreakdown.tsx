/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CurrencyCode, ExpenseCategory } from '../../types';
import { ALL_EXPENSE_CATEGORIES, formatCurrency } from '../../logic/budgetEngine';

interface CategoryBreakdownProps {
  categoryAllocations: Record<ExpenseCategory, { allocated: number; percentage: number }>;
  currency: CurrencyCode;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categoryAllocations,
  currency,
}) => {
  return (
    <div className="p-6 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#181B1E]">Category Allocation Breakdown</h3>
        <span className="text-xs text-[#7D858D]">Deterministic calculation engine</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
        {ALL_EXPENSE_CATEGORIES.map((cat) => {
          const data = categoryAllocations[cat];
          if (!data || data.allocated === 0) return null;
          return (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#181B1E] capitalize">{cat}</span>
                <span className="text-[#4A5056] tabular-nums font-mono">
                  {formatCurrency(data.allocated, currency)} ({data.percentage}%)
                </span>
              </div>
              <div className="w-full bg-[#F3EFEA] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0D3B2E] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, data.percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

