/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  UserCheck,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { EventData, ExpenseCategory, Vendor, VendorStatus } from '../../types';
import { ALL_EXPENSE_CATEGORIES, formatCurrency } from '../../logic/budgetEngine';
import {
  simulateVendorDropout,
  mobilizeStandbyVendor,
  calculateVendorFinancials,
  validateVendorRecord,
} from '../../logic/vendorEngine';
import { AddVendorModal } from './AddVendorModal';

interface VendorViewProps {
  event: EventData;
  onUpdateVendors: (newVendors: Vendor[]) => void;
}

export const VendorView: React.FC<VendorViewProps> = ({ event, onUpdateVendors }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredVendors = event.vendors.filter((v) => {
    if (filterCategory !== 'all' && v.category !== filterCategory) return false;
    return true;
  });

  const handleAddVendor = (newVendor: Vendor) => {
    onUpdateVendors([...event.vendors, newVendor]);
    setShowAddModal(false);
  };

  const handleUpdateStatus = (vendorId: string, newStatus: VendorStatus) => {
    const updated = event.vendors.map((v) =>
      v.id === vendorId ? { ...v, bookingStatus: newStatus } : v
    );
    onUpdateVendors(updated);
  };

  const handleDeleteVendor = (vendorId: string) => {
    onUpdateVendors(event.vendors.filter((v) => v.id !== vendorId));
  };

  const { totalQuoted, confirmedCount, cancelledCount, standbyCount } =
    calculateVendorFinancials(event.vendors);

  const handleSimulateDropout = (vendorId: string) => {
    const updated = simulateVendorDropout(event.vendors, vendorId);
    onUpdateVendors(updated);
  };

  const handleActivateStandby = (vendorId: string) => {
    const result = mobilizeStandbyVendor(event.vendors, vendorId);
    onUpdateVendors(result.updatedVendors);
  };

  return (
    <div className="space-y-6">
      {/* Vendor Health & Standby Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Contracted Suppliers</div>
          <div className="text-2xl font-bold text-[#181B1E] tabular-nums">{event.vendors.length}</div>
          <div className="text-xs text-[#7D858D] mt-1">{confirmedCount} fully confirmed</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Total Committed Fees</div>
          <div className="text-2xl font-bold text-[#0D3B2E] tabular-nums font-mono">
            {formatCurrency(totalQuoted, event.currency)}
          </div>
          <div className="text-xs text-[#7D858D] mt-1">Vendor quote commitments</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Standby Network Partners</div>
          <div className="text-2xl font-bold text-[#C59B27] tabular-nums font-mono">
            {standbyCount} Ready
          </div>
          <div className="text-xs text-[#7D858D] mt-1">45-min mobilization SLA</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Disruption Status</div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              cancelledCount > 0 ? 'text-red-700' : 'text-[#0D3B2E]'
            }`}
          >
            {cancelledCount > 0 ? `${cancelledCount} Cancelled` : 'All Active'}
          </div>
          <div className="text-xs text-[#7D858D] mt-1">
            {cancelledCount > 0 ? 'Standby swap required' : 'No supplier default'}
          </div>
        </div>
      </div>

      {/* Disclaimer Banner: Real vs Demo Entities */}
      <div className="p-4 bg-stone-50 border border-[rgba(26,29,32,0.08)] rounded-xl flex items-center justify-between text-xs text-[#4A5056]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0D3B2E] shrink-0" />
          <span>
            CelebraAI strictly labels fictional demonstration suppliers. Real vendor contracts are recorded as user-entered or confirmed entries without fabricated bookings.
          </span>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[rgba(26,29,32,0.08)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#181B1E]">Supplier & Contractor Registry</span>
            <span className="text-xs text-[#7D858D] font-mono tabular-nums">
              ({filteredVendors.length} suppliers)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2.5 py-1.5 rounded-lg text-[#4A5056] capitalize"
            >
              <option value="all">All Specialties</option>
              {ALL_EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D3B2E] text-white rounded-lg text-xs font-medium hover:bg-[#165342] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Register Vendor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                vendor.bookingStatus === 'cancelled'
                  ? 'border-red-300 bg-red-50/40 shadow-xs'
                  : 'border-[rgba(26,29,32,0.08)] bg-white hover:border-[#0D3B2E]/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#181B1E]">{vendor.name}</h4>
                    <div className="text-xs text-[#7D858D] capitalize">{vendor.category}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    {vendor.bookingStatus === 'cancelled' ? (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                        Cancelled
                      </span>
                    ) : vendor.isDemoEntity ? (
                      <span className="text-[10px] font-medium bg-[#F3EFEA] text-[#7D858D] px-1.5 py-0.5 rounded">
                        Demo Entity
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="text-xs text-[#4A5056] mb-3 line-clamp-2">{vendor.notes}</p>

                <div className="space-y-1.5 text-xs text-[#4A5056] border-t border-[rgba(26,29,32,0.06)] pt-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-[#7D858D]">Contact:</span>
                    <span className="font-medium text-[#181B1E]">{vendor.contactPerson}</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex justify-between">
                      <span className="text-[#7D858D]">Phone:</span>
                      <span className="font-mono text-[#181B1E]">{vendor.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#7D858D]">Quoted Fee:</span>
                    <span className="font-semibold text-[#0D3B2E] tabular-nums font-mono">
                      {formatCurrency(vendor.quotedPrice, event.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7D858D]">Capacity Limit:</span>
                    <span className="tabular-nums font-mono text-[#181B1E]">
                      {vendor.capacityLimit} guests
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Status select, Simulate Dropout, and Standby Deploy */}
              <div className="pt-2 border-t border-[rgba(26,29,32,0.06)] space-y-2">
                <div className="flex items-center justify-between">
                  <select
                    value={vendor.bookingStatus}
                    onChange={(e) => handleUpdateStatus(vendor.id, e.target.value as VendorStatus)}
                    className="text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2 py-1 rounded-md text-[#181B1E] font-medium capitalize"
                  >
                    <option value="suggested">Suggested</option>
                    <option value="user_entered">User Entered</option>
                    <option value="contacted">Contacted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    {vendor.bookingStatus !== 'cancelled' ? (
                      <button
                        onClick={() => handleSimulateDropout(vendor.id)}
                        className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-medium transition-colors"
                        title="Simulate vendor cancellation"
                      >
                        Simulate Dropout
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateStandby(vendor.id)}
                        className="px-2 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors"
                        title="Deploy standby partner"
                      >
                        Deploy Standby
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="text-[#7D858D] hover:text-red-700 p-1"
                      title="Remove vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredVendors.length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-[#7D858D]">
              No vendors registered under this specialty.
            </div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      <AddVendorModal
        isOpen={showAddModal}
        currency={event.currency}
        onAdd={handleAddVendor}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};
