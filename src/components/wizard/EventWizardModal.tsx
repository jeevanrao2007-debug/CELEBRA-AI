/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Wallet,
  CheckCircle,
  Building,
} from 'lucide-react';
import { CurrencyCode, EventCategory, EventData, ExpenseItem, LayoutObject, Task, Vendor, ScheduleItem, EventTheme } from '../../types';
import { calculateBudgetSummary } from '../../logic/budgetEngine';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/** Shape of a raw AI-generated or fallback plan passed to buildAndSubmitEvent. */
interface GeneratedPlan {
  theme?: EventTheme;
  venue?: EventData['venue'];
  expenses?: ExpenseItem[];
  layoutObjects?: LayoutObject[];
  tasks?: Task[];
  vendors?: Vendor[];
  schedule?: ScheduleItem[];
}

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (newEvent: EventData) => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
}) => {
  const trapRef = useFocusTrap({ isOpen, onClose });
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EventCategory>('wedding');
  const [date, setDate] = useState('2026-11-15');
  const [startTime, setStartTime] = useState('11:00 AM');
  const [endTime, setEndTime] = useState('08:00 PM');
  const [city, setCity] = useState('Mumbai, MH');
  const [attendance, setAttendance] = useState('250');
  const [budget, setBudget] = useState('450000');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [venueType, setVenueType] = useState<'indoor' | 'outdoor' | 'hybrid'>('hybrid');
  const [styleTheme, setStyleTheme] = useState('Royal Champagne Elegance');
  const [dietary, setDietary] = useState('Vegetarian & Jain options required');
  const [accessibility, setAccessibility] = useState('Wheelchair ramp and level ground seating');
  const [constraints, setConstraints] = useState('No pyrotechnics after 9 PM due to residential zone');

  if (!isOpen) return null;

  const handleModalClose = () => {
    setStep(1);
    setName('');
    onClose();
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    const expectedAttendance = Math.max(10, parseInt(attendance, 10) || 100);
    const totalBudget = Math.max(10000, parseFloat(budget) || 100000);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || `${category.toUpperCase()} Celebration`,
          category,
          date,
          city,
          expectedAttendance,
          totalBudget,
          currency,
          venueType,
          styleTheme,
          dietary,
          accessibility,
          constraints,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const generatedPlan = await res.json();
      buildAndSubmitEvent(generatedPlan);
    } catch {
      // Deterministic Event Planning Fallback
      const fallbackPlan = createDeterministicGeneratedPlan(
        name || `${category.replace('_', ' ')} Celebration`,
        category,
        expectedAttendance,
        totalBudget,
        currency,
        venueType,
        styleTheme
      );
      buildAndSubmitEvent(fallbackPlan);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildAndSubmitEvent = (planData: GeneratedPlan) => {
    const expectedAttendance = Math.max(10, parseInt(attendance, 10) || 100);
    const totalBudget = Math.max(10000, parseFloat(budget) || 100000);

    const budgetSummary = calculateBudgetSummary(totalBudget, planData.expenses || [], currency);

    const initialSnapshot = {
      versionId: `v_1_${Date.now()}`,
      versionNumber: 1,
      timestamp: new Date().toISOString(),
      changeDescription: `Initial Plan Generated: ${name}`,
      author: 'CelebraAI Planner',
      budgetSummary,
      expenses: planData.expenses || [],
      layoutObjects: planData.layoutObjects || [],
      tasks: planData.tasks || [],
      vendors: planData.vendors || [],
      schedule: planData.schedule || [],
    };

    const newEvent: EventData = {
      id: `event_${Date.now()}`,
      name: name.trim() || `${category.replace('_', ' ')} Gala`,
      category,
      date,
      startTime,
      endTime,
      city,
      expectedAttendance,
      currency,
      totalBudget,
      styleTheme,
      dietaryPreferences: [dietary],
      accessibilityRequirements: [accessibility],
      specialConstraints: constraints,
      theme: planData.theme || {
        name: styleTheme,
        description: 'Bespoke event aesthetic with curated palette',
        primaryColor: '#0D3B2E',
        accentColor: '#C59B27',
        secondaryColor: '#FAF8F5',
        aestheticNotes: ['Warm ambient festoons', 'Ivory draped linens'],
      },
      venue: planData.venue || {
        name: `${city} Event Pavilion`,
        totalIndoorCapacity: Math.round(expectedAttendance * 1.1),
        totalOutdoorCapacity: Math.round(expectedAttendance * 1.2),
        indoorWidth: 26,
        indoorLength: 32,
        outdoorWidth: 30,
        outdoorLength: 36,
        hasBackupPower: true,
        weatherCovered: venueType === 'indoor',
        zones: [
          {
            id: 'zone_indoor',
            name: 'Grand Banquet Hall',
            type: 'indoor',
            maxCapacity: Math.round(expectedAttendance * 1.1),
            width: 26,
            length: 32,
            usable: true,
          },
          {
            id: 'zone_outdoor',
            name: 'Garden Terrace Lawn',
            type: 'outdoor',
            maxCapacity: Math.round(expectedAttendance * 1.2),
            width: 30,
            length: 36,
            usable: true,
          },
        ],
      },
      layoutObjects: planData.layoutObjects || [],
      expenses: planData.expenses || [],
      tasks: planData.tasks || [],
      vendors: planData.vendors || [],
      schedule: planData.schedule || [],
      currentVersionNumber: 1,
      versions: [initialSnapshot],
    };

    onCreateEvent(newEvent);
    handleModalClose();
  };

  // Helper for deterministic event plan generation
  const createDeterministicGeneratedPlan = (
    eventName: string,
    cat: EventCategory,
    guests: number,
    totalB: number,
    curr: CurrencyCode,
    venuePref: string,
    themeName: string
  ) => {
    const tableCount = Math.ceil(guests / 8);

    const layoutObjects: LayoutObject[] = [
      {
        id: `obj_stage_${Date.now()}`,
        type: 'stage',
        name: 'Main Presentation Stage',
        zone: venuePref === 'outdoor' ? 'outdoor' : 'indoor',
        position: [0, 0, venuePref === 'outdoor' ? -12 : -8],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        capacity: 0,
        status: 'operational',
      },
      {
        id: `obj_arch_${Date.now()}`,
        type: 'arch_entrance',
        name: 'Ceremonial Welcome Arch',
        zone: 'indoor',
        position: [0, 0, 12],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        capacity: 0,
        status: 'operational',
      },
      {
        id: `obj_buffet_${Date.now()}`,
        type: 'buffet_station',
        name: 'Guest Dining & Buffet Station',
        zone: 'indoor',
        position: [-8, 0, 0],
        rotation: [0, Math.PI / 2, 0],
        scale: [1, 1, 1],
        capacity: 0,
        status: 'operational',
      },
    ];

    // Add round banquet tables
    for (let i = 0; i < Math.min(10, tableCount); i++) {
      const zOffset = -2 + Math.floor(i / 2) * 3;
      const xOffset = i % 2 === 0 ? -4 : 4;
      layoutObjects.push({
        id: `obj_table_${i}_${Date.now()}`,
        type: 'round_table',
        name: `Banquet Dining Table ${i + 1}`,
        zone: venuePref === 'outdoor' && i >= 5 ? 'outdoor' : 'indoor',
        position: [xOffset, 0, zOffset],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        capacity: 8,
        status: 'operational',
      });
    }

    const expenses: ExpenseItem[] = [
      {
        id: `exp_venue_${Date.now()}`,
        category: 'venue',
        description: 'Venue Rental & Security Deposit',
        quantity: 1,
        unitCost: Math.round(totalB * 0.22),
        subtotal: Math.round(totalB * 0.22),
        confirmedAmount: Math.round(totalB * 0.22),
        status: 'contracted',
      },
      {
        id: `exp_catering_${Date.now()}`,
        category: 'catering',
        description: `Full Guest Catering Buffet (${guests} pax)`,
        quantity: guests,
        unitCost: Math.round((totalB * 0.38) / guests),
        subtotal: Math.round(totalB * 0.38),
        confirmedAmount: Math.round(totalB * 0.38),
        status: 'planned',
      },
      {
        id: `exp_decor_${Date.now()}`,
        category: 'decoration',
        description: 'Floral Arrangements, Entrance Arch & Table Accents',
        quantity: 1,
        unitCost: Math.round(totalB * 0.14),
        subtotal: Math.round(totalB * 0.14),
        confirmedAmount: 0,
        status: 'planned',
      },
      {
        id: `exp_av_${Date.now()}`,
        category: 'equipment',
        description: 'Concert Audio PA, Microphones & Atmospheric Lights',
        quantity: 1,
        unitCost: Math.round(totalB * 0.12),
        subtotal: Math.round(totalB * 0.12),
        confirmedAmount: 0,
        status: 'planned',
      },
    ];

    const tasks: Task[] = [
      {
        id: `task_venue_permit_${Date.now()}`,
        title: 'Sign Venue Contract & Facility Inspection',
        description: 'Verify sound permits, load-in hours, and generator backups.',
        category: 'Venue',
        assignedRole: 'Lead Organizer',
        startDate: date,
        dueDate: date,
        priority: 'high',
        status: 'completed',
        dependencies: [],
        estimatedCost: Math.round(totalB * 0.22),
      },
      {
        id: `task_caterer_${Date.now()}`,
        title: 'Tasting Session & Final Headcount Sign-off',
        description: 'Lock menu choices and confirm dietary allergen counters.',
        category: 'Catering',
        assignedRole: 'Hospitality Lead',
        startDate: date,
        dueDate: date,
        priority: 'high',
        status: 'todo',
        dependencies: [`task_venue_permit_${Date.now()}`],
        estimatedCost: Math.round(totalB * 0.38),
      },
      {
        id: `task_sound_setup_${Date.now()}`,
        title: 'Acoustic Sound Check & Stage Lighting',
        description: 'Rig speakers, calibrate wireless microphones, and run cues.',
        category: 'Production',
        assignedRole: 'Technical Lead',
        startDate: date,
        dueDate: date,
        priority: 'medium',
        status: 'todo',
        dependencies: [`task_venue_permit_${Date.now()}`],
        estimatedCost: Math.round(totalB * 0.12),
      },
    ];

    const vendors: Vendor[] = [
      {
        id: `ven_lead_caterer_${Date.now()}`,
        name: 'Grand Feast Hospitality (Demo Entity)',
        category: 'catering',
        contactPerson: 'Kunal Kapoor',
        quotedPrice: Math.round(totalB * 0.38),
        capacityLimit: Math.round(guests * 1.2),
        bookingStatus: 'suggested',
        isDemoEntity: true,
        cancellationTerms: '72 hours notice required',
        notes: 'Specialized in multi-cuisine banquets',
        affectedTaskIds: [],
      },
    ];

    const schedule: ScheduleItem[] = [
      {
        id: 'sch_1',
        startTime: startTime,
        endTime: '01:00 PM',
        title: 'Guest Arrival & Welcome Refreshments',
        zone: 'indoor',
        leadRole: 'Host',
        description: 'Registration desk open; background ambient music',
        isWeatherDependent: false,
      },
      {
        id: 'sch_2',
        startTime: '01:00 PM',
        endTime: '03:00 PM',
        title: 'Main Ceremony & Keynote Presentation',
        zone: venuePref === 'outdoor' ? 'outdoor' : 'indoor',
        leadRole: 'MC',
        description: 'Formal address and celebratory programming',
        isWeatherDependent: venuePref === 'outdoor',
      },
      {
        id: 'sch_3',
        startTime: '03:00 PM',
        endTime: endTime,
        title: 'Festive Banquet Dining & Social Evening',
        zone: 'indoor',
        leadRole: 'Hospitality',
        description: 'Full buffet service with celebratory toasts',
        isWeatherDependent: false,
      },
    ];

    return {
      expenses,
      layoutObjects,
      tasks,
      vendors,
      schedule,
    };
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[rgba(26,29,32,0.12)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(26,29,32,0.08)]">
          <div>
            <div className="text-[10px] font-bold text-[#0D3B2E] uppercase tracking-wider">
              Step {step} of 3
            </div>
            <h3 id="wizard-modal-title" className="text-base font-bold text-[#181B1E]">
              Event Creation Wizard
            </h3>
          </div>
          <button
            onClick={handleModalClose}
            aria-label="Close event creation wizard"
            className="p-1 text-[#7D858D] hover:text-[#181B1E] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="wizard-event-name" className="block text-[#4A5056] font-medium mb-1">
                  Event Name
                </label>
                <input
                  id="wizard-event-name"
                  type="text"
                  placeholder="e.g. Maya & Arjun's Sangeet Celebration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wizard-event-category" className="block text-[#4A5056] font-medium mb-1">
                    Event Category
                  </label>
                  <select
                    id="wizard-event-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs capitalize"
                  >
                    <option value="wedding">Wedding / Sangeet</option>
                    <option value="birthday">Birthday / Private</option>
                    <option value="community">Community Gathering</option>
                    <option value="college_fest">College Cultural Festival</option>
                    <option value="corporate">Corporate Gala</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wizard-event-date" className="block text-[#4A5056] font-medium mb-1">
                    Event Date
                  </label>
                  <input
                    id="wizard-event-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wizard-start-time" className="block text-[#4A5056] font-medium mb-1">
                    Start Time
                  </label>
                  <input
                    id="wizard-start-time"
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="wizard-end-time" className="block text-[#4A5056] font-medium mb-1">
                    End Time
                  </label>
                  <input
                    id="wizard-end-time"
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="wizard-city-region" className="block text-[#4A5056] font-medium mb-1">
                  City / Region
                </label>
                <input
                  id="wizard-city-region"
                  type="text"
                  placeholder="e.g. Mumbai, MH"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wizard-attendance" className="block text-[#4A5056] font-medium mb-1">
                    Expected Attendance
                  </label>
                  <input
                    id="wizard-attendance"
                    type="number"
                    min="10"
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="wizard-budget" className="block text-[#4A5056] font-medium mb-1">
                    Total Budget ({currency})
                  </label>
                  <input
                    id="wizard-budget"
                    type="number"
                    min="1000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wizard-currency" className="block text-[#4A5056] font-medium mb-1">
                    Currency
                  </label>
                  <select
                    id="wizard-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wizard-venue-pref" className="block text-[#4A5056] font-medium mb-1">
                    Venue Preference
                  </label>
                  <select
                    id="wizard-venue-pref"
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value as 'indoor' | 'outdoor' | 'hybrid')}
                    className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs capitalize"
                  >
                    <option value="hybrid">Hybrid (Indoor Hall + Lawn)</option>
                    <option value="indoor">Fully Indoor</option>
                    <option value="outdoor">Open-Air Outdoor</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="wizard-style-theme" className="block text-[#4A5056] font-medium mb-1">
                  Preferred Style / Theme
                </label>
                <input
                  id="wizard-style-theme"
                  type="text"
                  value={styleTheme}
                  onChange={(e) => setStyleTheme(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="wizard-dietary" className="block text-[#4A5056] font-medium mb-1">
                  Dietary Preferences & Allergens
                </label>
                <input
                  id="wizard-dietary"
                  type="text"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                />
              </div>

              <div>
                <label htmlFor="wizard-accessibility" className="block text-[#4A5056] font-medium mb-1">
                  Accessibility Requirements
                </label>
                <input
                  id="wizard-accessibility"
                  type="text"
                  value={accessibility}
                  onChange={(e) => setAccessibility(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                />
              </div>

              <div>
                <label htmlFor="wizard-constraints" className="block text-[#4A5056] font-medium mb-1">
                  Special Constraints & Permits
                </label>
                <textarea
                  id="wizard-constraints"
                  rows={2}
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-[#EBF4F0] border border-[#0D3B2E]/20 rounded-xl text-xs text-[#0D3B2E]">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" /> Ready to Synthesize Event
                </div>
                CelebraAI will generate a validated 3D layout, categorized budget allocations, supplier recommendations, and a chronological run-sheet.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-[rgba(26,29,32,0.08)] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-4 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-medium text-[#4A5056] hover:bg-[#FAF8F5]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-[#0D3B2E] text-white rounded-lg text-xs font-semibold hover:bg-[#165342]"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              disabled={isGenerating}
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0D3B2E] hover:bg-[#165342] text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[#C59B27]" /> Synthesizing
                  Event...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" /> Generate Event Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
