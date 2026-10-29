/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  TrendingDown,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  PieChart as PieChartIcon,
  CheckCircle2,
  Filter,
  Sparkles,
  Lightbulb,
  Edit2,
  Check,
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { CurrencyCode, EventData, ExpenseCategory, ExpenseItem, SavingsOpportunity } from '../../types';
import {
  ALL_EXPENSE_CATEGORIES,
  calculateBudgetSummary,
  formatCurrency,
  identifySavingsOpportunities,
} from '../../logic/budgetEngine';
import { CategoryBreakdown } from './CategoryBreakdown';
import { AddExpenseModal } from './AddExpenseModal';

interface BudgetViewProps {
  event: EventData;
  onUpdateExpenses: (newExpenses: ExpenseItem[]) => void;
  onUpdateTotalBudget: (newBudget: number) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  event,
  onUpdateExpenses,
  onUpdateTotalBudget,
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'savings'>('ledger');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudgetInput, setTempBudgetInput] = useState(event.totalBudget.toString());
  const [appliedSavingsIds, setAppliedSavingsIds] = useState<string[]>([]);
  const [savingsSuccessNotice, setSavingsSuccessNotice] = useState<string | null>(null);

  // Inline editing row state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const budgetSummary = calculateBudgetSummary(
    event.totalBudget,
    event.expenses,
    event.currency
  );

  const filteredExpenses = event.expenses.filter((e) => {
    if (filterCategory === 'all') return true;
    return e.category === filterCategory;
  });

  const handleAddExpense = (newExpense: ExpenseItem) => {
    onUpdateExpenses([...event.expenses, newExpense]);
    setShowAddModal(false);
  };

  const handleDeleteExpense = (id: string) => {
    onUpdateExpenses(event.expenses.filter((e) => e.id !== id));
  };

  const handleSaveBudget = () => {
    const parsed = Math.max(0, parseFloat(tempBudgetInput) || 0);
    onUpdateTotalBudget(parsed);
    setEditingBudget(false);
  };

  const savingsOpportunities = identifySavingsOpportunities(
    event.totalBudget,
    event.expenses,
    event.currency
  );

  const handleApplySavings = (opp: SavingsOpportunity) => {
    const matchingExpenses = event.expenses.filter((e) => e.category === opp.category);
    if (matchingExpenses.length === 0) return;

    const categoryTotal = matchingExpenses.reduce((s, e) => s + e.subtotal, 0);
    if (categoryTotal <= 0) return;

    const discountRatio = Math.max(0.5, (categoryTotal - opp.potentialSavings) / categoryTotal);

    const updatedExpenses = event.expenses.map((e) => {
      if (e.category === opp.category) {
        const newUnitCost = Math.round(e.unitCost * discountRatio);
        const newSubtotal = newUnitCost * e.quantity;
        return {
          ...e,
          unitCost: newUnitCost,
          subtotal: newSubtotal,
          confirmedAmount: Math.min(e.confirmedAmount, newSubtotal),
          notes: e.notes ? `${e.notes} · Optimized: ${opp.title}` : `Optimized: ${opp.title}`,
        };
      }
      return e;
    });

    onUpdateExpenses(updatedExpenses);
    setAppliedSavingsIds((prev) => [...prev, opp.id]);
    setSavingsSuccessNotice(
      `Successfully applied "${opp.title}": Saved ~${formatCurrency(opp.potentialSavings, event.currency)} to contingency reserve!`
    );
    setTimeout(() => setSavingsSuccessNotice(null), 5000);
  };

  const handleStartInlineEdit = (item: ExpenseItem) => {
    setEditingItemId(item.id);
    setEditDesc(item.description);
    setEditQty(item.quantity.toString());
    setEditUnitCost(item.unitCost.toString());
  };

  const handleCancelInlineEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveInlineEdit = (id: string) => {
    const qty = Math.max(1, parseInt(editQty, 10) || 1);
    const unitCost = Math.max(0, parseFloat(editUnitCost) || 0);
    const subtotal = qty * unitCost;

    const updated = event.expenses.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          description: editDesc.trim() || e.description,
          quantity: qty,
          unitCost,
          subtotal,
          confirmedAmount:
            e.status === 'paid' || e.status === 'contracted' ? subtotal : e.confirmedAmount,
        };
      }
      return e;
    });

    onUpdateExpenses(updated);
    setEditingItemId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Approved Budget */}
        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Approved Budget</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#181B1E] tabular-nums">
              {formatCurrency(event.totalBudget, event.currency)}
            </span>
            <button
              onClick={() => {
                setTempBudgetInput(event.totalBudget.toString());
                setEditingBudget(!editingBudget);
              }}
              className="text-xs text-[#0D3B2E] font-medium hover:underline"
            >
              {editingBudget ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingBudget && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                value={tempBudgetInput}
                onChange={(e) => setTempBudgetInput(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-[rgba(26,29,32,0.15)] rounded-md font-mono"
              />
              <button
                onClick={handleSaveBudget}
                className="px-3 py-1.5 bg-[#0D3B2E] text-white text-xs font-medium rounded-md hover:bg-[#165342]"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Planned Spend */}
        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Planned Expenditure</div>
          <div className="text-2xl font-bold text-[#181B1E] tabular-nums">
            {formatCurrency(budgetSummary.plannedExpenditure, event.currency)}
          </div>
          <div className="text-xs text-[#7D858D] mt-1 tabular-nums">
            {budgetSummary.utilizationPercentage}% of budget allocated
          </div>
        </div>

        {/* Remaining / Contingency Reserve */}
        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Contingency Reserve</div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              budgetSummary.isOverBudget ? 'text-red-700' : 'text-[#0D3B2E]'
            }`}
          >
            {formatCurrency(budgetSummary.remainingBudget, event.currency)}
          </div>
          <div className="text-xs text-[#7D858D] mt-1">
            {budgetSummary.isOverBudget
              ? `Deficit of ${formatCurrency(budgetSummary.overBudgetAmount, event.currency)}`
              : 'Available for crisis absorption'}
          </div>
        </div>

        {/* Confirmed / Contracted Spend */}
        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Contracted & Paid</div>
          <div className="text-2xl font-bold text-[#181B1E] tabular-nums">
            {formatCurrency(budgetSummary.confirmedExpenditure, event.currency)}
          </div>
          <div className="text-xs text-[#7D858D] mt-1">
            {Math.round(
              (budgetSummary.confirmedExpenditure / (budgetSummary.plannedExpenditure || 1)) * 100
            )}
            % of planned commitments verified
          </div>
        </div>
      </div>

      {/* Over-budget Deficit Warning Callout if applicable */}
      {budgetSummary.isOverBudget && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Budget Limit Exceeded</div>
            <p className="text-xs text-red-700 mt-0.5">
              Current commitments exceed the approved total budget by{' '}
              <strong className="font-mono">
                {formatCurrency(budgetSummary.overBudgetAmount, event.currency)}
              </strong>
              . Rebalance allocations in Crisis Simulator or trim discretionary items below.
            </p>
          </div>
        </div>
      )}

      {/* Category Allocation Horizontal Bars */}
      <CategoryBreakdown
        categoryAllocations={budgetSummary.categoryAllocations}
        currency={event.currency}
      />

      {/* Success banner when savings are applied */}
      <AnimatePresence>
        {savingsSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900"
          >
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savingsSuccessNotice}</span>
            </div>
            <button
              onClick={() => setSavingsSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tab Navigation: Ledger vs Savings Opportunities */}
      <div className="flex items-center justify-between border-b border-[rgba(26,29,32,0.08)] pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'ledger'
                ? 'border-[#0D3B2E] text-[#0D3B2E]'
                : 'border-transparent text-[#7D858D] hover:text-[#181B1E]'
            }`}
          >
            Expense Ledger ({filteredExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'savings'
                ? 'border-[#0D3B2E] text-[#0D3B2E]'
                : 'border-transparent text-[#7D858D] hover:text-[#181B1E]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>Savings Opportunities</span>
            <span className="text-[10px] bg-[#EBF4F0] text-[#0D3B2E] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {savingsOpportunities.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW A: SAVINGS OPPORTUNITIES */}
      {activeTab === 'savings' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[rgba(26,29,32,0.06)] text-xs text-[#4A5056] flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#181B1E]">
                Deterministic & Strategic Cost Optimization
              </span>
              <p className="text-[11px] text-[#7D858D] mt-0.5">
                Calculates actionable substitutions across catering, seasonal florals, and staging packages to expand your emergency contingency reserve without hurting guest perception.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#7D858D]">Potential Total Savings</span>
              <div className="text-lg font-bold text-[#0D3B2E] font-mono">
                {formatCurrency(
                  savingsOpportunities.reduce((s, o) => s + o.potentialSavings, 0),
                  event.currency
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savingsOpportunities.map((opp) => {
              const isApplied = appliedSavingsIds.includes(opp.id);
              return (
                <motion.div
                  key={opp.id}
                  layout
                  className={`p-5 rounded-xl border transition-all ${
                    isApplied
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-white border-[rgba(26,29,32,0.08)] shadow-sm hover:border-[#0D3B2E]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#4A5056] border border-[rgba(26,29,32,0.08)]">
                        {opp.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${
                          opp.impactLevel === 'low'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {opp.impactLevel} risk
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#0D3B2E] font-mono tabular-nums">
                      Save ~{formatCurrency(opp.potentialSavings, event.currency)}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-[#181B1E] mb-1">{opp.title}</h4>
                  <p className="text-xs text-[#4A5056] mb-3 leading-relaxed">{opp.description}</p>

                  <div className="p-3 bg-[#FAF8F5] rounded-lg text-[11px] mb-4 space-y-1 border border-[rgba(26,29,32,0.06)]">
                    <div className="font-semibold text-[#181B1E]">Strategic Trade-off:</div>
                    <div className="text-[#7D858D]">{opp.tradeOff}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,29,32,0.06)]">
                    <span className="text-[10px] text-[#7D858D] font-mono">
                      Type: {opp.actionType.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleApplySavings(opp)}
                      disabled={isApplied}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        isApplied
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-[#0D3B2E] hover:bg-[#165342] text-white cursor-pointer'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Applied
                        </>
                      ) : (
                        <>
                          Apply Recommendation <ArrowRight className="w-3.5 h-3.5 text-[#C59B27]" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: EXPENSE LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[rgba(26,29,32,0.08)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#181B1E]">Expense Ledger</span>
              <span className="text-xs text-[#7D858D] font-mono tabular-nums">
                ({filteredExpenses.length} items)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Category */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2.5 py-1.5 rounded-lg text-[#4A5056]"
              >
                <option value="all">All Categories</option>
                {ALL_EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D3B2E] text-white rounded-lg text-xs font-medium hover:bg-[#165342] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Expense
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#4A5056] border-b border-[rgba(26,29,32,0.08)]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Description</th>
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Unit Cost</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Subtotal</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(26,29,32,0.06)]">
                {filteredExpenses.map((exp) => {
                  const isEditing = editingItemId === exp.id;
                  if (isEditing) {
                    return (
                      <tr key={exp.id} className="bg-amber-50/50">
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full px-2 py-1 border border-[rgba(26,29,32,0.2)] rounded text-xs bg-white"
                          />
                        </td>
                        <td className="py-2 px-4 capitalize text-[#4A5056]">{exp.category}</td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            min="1"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-16 px-2 py-1 border border-[rgba(26,29,32,0.2)] rounded text-xs text-right font-mono bg-white"
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editUnitCost}
                            onChange={(e) => setEditUnitCost(e.target.value)}
                            className="w-24 px-2 py-1 border border-[rgba(26,29,32,0.2)] rounded text-xs text-right font-mono bg-white"
                          />
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-semibold text-[#181B1E]">
                          {formatCurrency(
                            (parseInt(editQty, 10) || 1) * (parseFloat(editUnitCost) || 0),
                            event.currency
                          )}
                        </td>
                        <td className="py-2 px-4 capitalize">{exp.status}</td>
                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveInlineEdit(exp.id)}
                              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelInlineEdit}
                              className="p-1 text-[#7D858D] hover:bg-stone-200 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={exp.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#181B1E]">
                        {exp.description}
                        {exp.notes && (
                          <div className="text-[11px] text-[#7D858D] font-normal">{exp.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize text-[#4A5056]">{exp.category}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-mono text-[#4A5056]">
                        {exp.quantity}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-mono text-[#4A5056]">
                        {formatCurrency(exp.unitCost, event.currency)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-mono font-semibold text-[#181B1E]">
                        {formatCurrency(exp.subtotal, event.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                            exp.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-800'
                              : exp.status === 'contracted'
                              ? 'bg-blue-50 text-blue-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartInlineEdit(exp)}
                            className="text-[#7D858D] hover:text-[#0D3B2E] p-1 rounded transition-colors"
                            title="Edit inline"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-[#7D858D] hover:text-red-700 p-1 rounded transition-colors"
                            title="Remove expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#7D858D]">
                      No expense records found matching selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddModal}
        currency={event.currency}
        onAdd={handleAddExpense}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};
