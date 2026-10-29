/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExpenseCategory, ExpenseItem, Vendor, VendorStatus } from '../types/index.ts';

export interface VendorFinancialSummary {
  totalQuoted: number;
  confirmedCount: number;
  cancelledCount: number;
  pendingCount: number;
  standbyCount: number;
  disruptionRate: number; // percentage of cancelled vendors
}

export interface StandbyMobilizationResult {
  updatedVendors: Vendor[];
  costDelta: number;
  mobilizedVendor: Vendor | null;
}

/**
 * Simulates an unexpected vendor dropout / cancellation.
 * Marks vendor as 'cancelled' and records timestamped disruption reason.
 */
export function simulateVendorDropout(vendors: Vendor[], vendorId: string, reason?: string): Vendor[] {
  return vendors.map((v) => {
    if (v.id !== vendorId) return v;
    const disruptionNote = reason || 'EMERGENCY: Vendor cancelled on short notice';
    const existingNotes = v.notes ? `${v.notes} | ` : '';
    return {
      ...v,
      bookingStatus: 'cancelled' as VendorStatus,
      notes: `${existingNotes}[${disruptionNote}]`,
    };
  });
}

/**
 * Mobilizes an emergency verified standby partner to replace a cancelled or missing supplier.
 * Applies configured standby surcharge (default 10%) and confirms contract status.
 */
export function mobilizeStandbyVendor(
  vendors: Vendor[],
  vendorId: string,
  options: {
    surchargePercentage?: number;
    replacementLabel?: string;
  } = {}
): StandbyMobilizationResult {
  const surcharge = options.surchargePercentage ?? 0.1;
  const label = options.replacementLabel ?? 'Standby Partner Mobilized';
  let costDelta = 0;
  let mobilizedVendor: Vendor | null = null;

  const updatedVendors = vendors.map((v) => {
    if (v.id !== vendorId) return v;
    const originalPrice = v.quotedPrice || 0;
    const newPrice = Math.round(originalPrice * (1 + surcharge));
    costDelta = newPrice - originalPrice;

    mobilizedVendor = {
      ...v,
      name: v.name.includes('Standby Partner') ? v.name : `${v.name} (${label})`,
      bookingStatus: 'confirmed' as VendorStatus,
      quotedPrice: newPrice,
      notes: `Emergency replacement deployed via verified network reserve (+${Math.round(surcharge * 100)}% mobilization SLA).`,
    };
    return mobilizedVendor;
  });

  return {
    updatedVendors,
    costDelta,
    mobilizedVendor,
  };
}

/**
 * Calculates deterministic aggregate metrics for the vendor roster.
 */
export function calculateVendorFinancials(vendors: Vendor[]): VendorFinancialSummary {
  let totalQuoted = 0;
  let confirmedCount = 0;
  let cancelledCount = 0;
  let pendingCount = 0;
  let standbyCount = 0;

  for (const v of vendors) {
    totalQuoted += Math.max(0, v.quotedPrice || 0);
    if (v.bookingStatus === 'confirmed') confirmedCount++;
    else if (v.bookingStatus === 'cancelled') cancelledCount++;
    else pendingCount++;

    if (v.name.toLowerCase().includes('standby') || v.bookingStatus === 'suggested') {
      standbyCount++;
    }
  }

  const total = vendors.length;
  const disruptionRate = total > 0 ? Math.round((cancelledCount / total) * 100) : 0;

  return {
    totalQuoted,
    confirmedCount,
    cancelledCount,
    pendingCount,
    standbyCount,
    disruptionRate,
  };
}

/**
 * Validates a vendor record against data-quality constraints.
 */
export function validateVendorRecord(vendor: Partial<Vendor>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!vendor.name || vendor.name.trim().length === 0) {
    errors.push('Vendor name cannot be empty.');
  }
  if (vendor.name && vendor.name.length > 100) {
    errors.push('Vendor name cannot exceed 100 characters.');
  }
  if (typeof vendor.quotedPrice !== 'number' || isNaN(vendor.quotedPrice) || vendor.quotedPrice < 0) {
    errors.push('Quoted price must be a non-negative number.');
  }
  if (vendor.capacityLimit !== undefined && (typeof vendor.capacityLimit !== 'number' || vendor.capacityLimit < 0)) {
    errors.push('Capacity limit must be a positive number.');
  }
  if (vendor.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
    errors.push('Invalid email address format.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Synchronizes vendor pricing alterations into the itemized budget expenses.
 * Updates matching expense line item subtotal if exists, or appends a new confirmed line.
 */
export function syncVendorToExpenses(
  expenses: ExpenseItem[],
  vendor: Vendor,
  _eventCurrency: string = 'INR'
): ExpenseItem[] {
  const expenseId = `exp_ven_${vendor.id}`;
  const existingIndex = expenses.findIndex((e) => e.id === expenseId || e.description.includes(vendor.name));

  if (existingIndex >= 0) {
    const updated = [...expenses];
    const item = updated[existingIndex];
    updated[existingIndex] = {
      ...item,
      subtotal: vendor.quotedPrice,
      confirmedAmount: vendor.bookingStatus === 'confirmed' ? vendor.quotedPrice : item.confirmedAmount,
      status: vendor.bookingStatus === 'confirmed' ? 'contracted' : vendor.bookingStatus === 'cancelled' ? 'planned' : item.status,
    };
    return updated;
  }

  // If not found and vendor is confirmed, create a synced expense item
  if (vendor.bookingStatus === 'confirmed') {
    const newExpense: ExpenseItem = {
      id: expenseId,
      category: (vendor.category as ExpenseCategory) || 'staff',
      description: `Contract: ${vendor.name} (${vendor.contactPerson})`,
      quantity: 1,
      unitCost: vendor.quotedPrice,
      subtotal: vendor.quotedPrice,
      confirmedAmount: vendor.quotedPrice,
      status: 'contracted',
    };
    return [...expenses, newExpense];
  }

  return expenses;
}
