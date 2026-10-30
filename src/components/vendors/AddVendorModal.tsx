/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { CurrencyCode, ExpenseCategory, Vendor } from '../../types';
import { ALL_EXPENSE_CATEGORIES } from '../../logic/budgetEngine';
import { validateVendorRecord } from '../../logic/vendorEngine';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AddVendorModalProps {
  isOpen: boolean;
  currency: CurrencyCode;
  onAdd: (vendor: Vendor) => void;
  onClose: () => void;
}

export const AddVendorModal: React.FC<AddVendorModalProps> = ({
  isOpen,
  currency,
  onAdd,
  onClose,
}) => {
  const trapRef = useFocusTrap({ isOpen, onClose });
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('catering');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('25000');
  const [capacityLimit, setCapacityLimit] = useState('500');
  const [cancellationTerms] = useState('Standard 48-hour notice');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = parseFloat(quotedPrice) || 0;
    const parsedCapacity = parseInt(capacityLimit, 10) || 500;

    const validation = validateVendorRecord({
      name: name.trim(),
      quotedPrice: parsedPrice,
      capacityLimit: parsedCapacity,
      email: email.trim() || undefined,
    });

    if (!validation.isValid) {
      setFormError(validation.errors[0]);
      return;
    }

    const newVendor: Vendor = {
      id: `ven_${Date.now()}`,
      name: name.trim(),
      category,
      contactPerson: contactPerson.trim() || 'Vendor Lead',
      phone: phone.trim(),
      email: email.trim(),
      quotedPrice: parsedPrice,
      capacityLimit: parsedCapacity,
      bookingStatus: 'user_entered',
      isDemoEntity: false,
      cancellationTerms,
      notes,
      affectedTaskIds: [],
    };

    onAdd(newVendor);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setNotes('');
    setFormError(null);
    onClose();
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-modal-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[rgba(26,29,32,0.12)]">
        <h3 id="vendor-modal-title" className="text-base font-semibold text-[#181B1E] mb-4">
          Register New Supplier
        </h3>
        {formError && (
          <div
            role="alert"
            className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="vendor-name-input" className="block text-[#4A5056] font-medium mb-1">
              Company / Vendor Name
            </label>
            <input
              id="vendor-name-input"
              type="text"
              required
              placeholder="e.g. Apex Visuals & Pyrotechnics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-category-select" className="block text-[#4A5056] font-medium mb-1">
                Category
              </label>
              <select
                id="vendor-category-select"
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
              <label htmlFor="vendor-contact-input" className="block text-[#4A5056] font-medium mb-1">
                Contact Person
              </label>
              <input
                id="vendor-contact-input"
                type="text"
                placeholder="e.g. Rahul Sen"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-phone-input" className="block text-[#4A5056] font-medium mb-1">
                Phone
              </label>
              <input
                id="vendor-phone-input"
                type="text"
                placeholder="+91 98..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="vendor-email-input" className="block text-[#4A5056] font-medium mb-1">
                Email
              </label>
              <input
                id="vendor-email-input"
                type="email"
                placeholder="contact@supplier.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vendor-price-input" className="block text-[#4A5056] font-medium mb-1">
                Quoted Fee ({currency})
              </label>
              <input
                id="vendor-price-input"
                type="number"
                min="0"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="vendor-capacity-input" className="block text-[#4A5056] font-medium mb-1">
                Capacity Limit (pax)
              </label>
              <input
                id="vendor-capacity-input"
                type="number"
                min="1"
                value={capacityLimit}
                onChange={(e) => setCapacityLimit(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="vendor-notes-input" className="block text-[#4A5056] font-medium mb-1">
              Notes / Scope
            </label>
            <textarea
              id="vendor-notes-input"
              rows={2}
              placeholder="Equipment provided, SLA terms, delivery timing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
            />
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
              Save Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
