/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CurrencyCode, ExpenseCategory, ExpenseItem } from '../../types';
import { ALL_EXPENSE_CATEGORIES } from '../../logic/budgetEngine';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AddExpenseModalProps {
  isOpen: boolean;
  currency: CurrencyCode;
  onAdd: (expense: ExpenseItem) => void;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  currency,
  onAdd,
  onClose,
}) => {
  const trapRef = useFocusTrap({ isOpen, onClose });
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('catering');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('5000');
  const [status, setStatus] = useState<ExpenseItem['status']>('planned');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    const quantity = Math.max(1, parseInt(qty, 10) || 1);
    const unitCostNum = Math.max(0, parseFloat(unitCost) || 0);
    const subtotal = quantity * unitCostNum;

    const newExpense: ExpenseItem = {
      id: `exp_${Date.now()}`,
      category,
      description: desc.trim(),
      quantity,
      unitCost: unitCostNum,
      subtotal,
      confirmedAmount: status === 'paid' || status === 'contracted' ? subtotal : 0,
      status,
    };

    onAdd(newExpense);
    setDesc('');
    setQty('1');
    setUnitCost('5000');
    setStatus('planned');
    onClose();
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-modal-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[rgba(26,29,32,0.12)]">
        <h3 id="add-expense-modal-title" className="text-base font-semibold text-[#181B1E] mb-4">
          Add Budget Expense
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#4A5056] font-medium mb-1">Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Microphones & Audio Snake"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs capitalize"
              >
                {ALL_EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseItem['status'])}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs capitalize"
              >
                <option value="planned">Planned</option>
                <option value="contracted">Contracted</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[#4A5056] font-medium mb-1">
                Unit Cost ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-medium text-[#4A5056] hover:bg-[#FAF8F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0D3B2E] text-white rounded-lg text-xs font-medium hover:bg-[#165342]"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
