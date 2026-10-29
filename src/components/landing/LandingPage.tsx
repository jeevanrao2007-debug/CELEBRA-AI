/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Box,
  Layers,
  Zap,
  CheckCircle,
  Calendar,
  Users,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '../../logic/budgetEngine';

interface LandingPageProps {
  onOpenDemo: () => void;
  onOpenPreset?: (preset: 'festival' | 'wedding' | 'birthday') => void;
  onOpenWizard: () => void;
  onOpenDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenDemo,
  onOpenPreset,
  onOpenWizard,
  onOpenDashboard,
}) => {
  const [activeScenario, setActiveScenario] = React.useState<'festival' | 'wedding' | 'birthday'>('festival');

  const scenarios = {
    festival: {
      tag: 'College Cultural Fest',
      title: 'Horizon Fest 2026 — Annual Campus Celebration',
      description: 'A dual-zone campus celebration combining an indoor Jubilee Auditorium and outdoor Amphitheatre Lawn with 500 students.',
      budget: '₹2,00,000',
      pax: 500,
      step1: '500 attendees planned across indoor auditorium and outdoor amphitheatre stage. Budget locked at ₹2,00,000.',
      step1Meta: 'Status: Operational · Seating: 504 pax',
      step2: 'Torrential downpour floods the outdoor lawn. Concert stage, line arrays, and 240 lawn seats become unusable.',
      step2Meta: 'Capacity Delta: -240 pax · Impact: Severe',
      step3: 'Autonomous pivot: stage relocated to indoor hall podium, reserve deployed for acoustic baffles, schedule updated.',
      step3Meta: 'Feasibility: 100% Passed · Incremental Cost: +₹12,000',
    },
    wedding: {
      tag: 'Royal Heritage Wedding',
      title: "Aria & Rohan's Emerald & Champagne Sangeet",
      description: 'A high-end 350-guest celebration across the Grand Imperial Ballroom and Open Courtyard with live royal catering.',
      budget: '₹12,00,000',
      pax: 350,
      step1: '350 VIP guests planned across ballroom dining and courtyard dance floor. Budget locked at ₹12,00,000.',
      step1Meta: 'Status: Operational · Seating: 360 pax',
      step2: 'Lead catering supplier faces transport breakdown 3 hours prior to guest arrival. 350 meals jeopardized.',
      step2Meta: 'Supply Deficit: 350 meals · Risk: Catastrophic',
      step3: 'Contingency protocol: Emergency standby partner mobilized with live Chaat & Biryani counters for ₹45,000 from reserve.',
      step3Meta: 'Feasibility: 100% Passed · Guest Delight Preserved',
    },
    birthday: {
      tag: 'Milestone 50th Jubilee',
      title: "Kabir's 50th Golden Jubilee Lounge",
      description: 'An intimate 120-guest celebration in a glasshouse panoramic lounge with live acoustic jazz and curated dinner.',
      budget: '₹3,50,000',
      pax: 120,
      step1: '120 close friends & family in Glasshouse Lounge. Curated acoustic trio and champagne bar.',
      step1Meta: 'Status: Operational · Seating: 128 pax',
      step2: 'Sudden attendance surge: 35 unexpected extended family members RSVP on day of event (155 total pax).',
      step2Meta: 'Capacity Surge: +29% · Deficit: 27 seats',
      step3: 'Spatial reconfiguration: Relocate perimeter cocktail tables to terrace, expand seating by 32 pax within safe egress bounds.',
      step3Meta: 'Feasibility: 100% Passed · Buffer Absorbed',
    },
  };

  const curr = scenarios[activeScenario];
  const launchCurrentPreset = () => {
    if (onOpenPreset) {
      onOpenPreset(activeScenario);
    } else {
      onOpenDemo();
    }
  };
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181B1E] flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 (Brand Wordmark, 4-5 single-line nav links, 1 primary action) */}
      <header className="flex items-center justify-between gap-8 px-8 py-5 border-b border-[rgba(26,29,32,0.08)] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0D3B2E] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            C
          </div>
          <span className="text-xl font-bold tracking-tight text-[#181B1E]">
            Celebra<span className="text-[#0D3B2E]">AI</span>
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A5056]">
          <a href="#simulation" className="hover:text-[#0D3B2E] transition-colors whitespace-nowrap shrink-0">
            Crisis Simulator
          </a>
          <a href="#3d-venue" className="hover:text-[#0D3B2E] transition-colors whitespace-nowrap shrink-0">
            3D Spatial Editor
          </a>
          <a href="#rewind" className="hover:text-[#0D3B2E] transition-colors whitespace-nowrap shrink-0">
            Event Rewind
          </a>
          <a href="#engine" className="hover:text-[#0D3B2E] transition-colors whitespace-nowrap shrink-0">
            Budget Engine
          </a>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenDashboard}
            className="px-3.5 py-2 text-xs font-semibold text-[#181B1E] bg-white border border-[rgba(26,29,32,0.12)] rounded-lg hover:bg-[#FAF8F5] transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dashboard
          </button>
          <button
            onClick={onOpenDemo}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0D3B2E] rounded-lg hover:bg-[#165342] transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Explore Demo Festival
          </button>
        </div>
      </header>

      {/* Hero Section: Spacious editorial layout */}
      <section className="px-6 py-20 max-w-6xl mx-auto w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#0D3B2E] bg-[#EBF4F0] px-3.5 py-1.5 rounded-md">
          <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
          Autonomous Event Command Center
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#181B1E] max-w-4xl mx-auto leading-tight" style={{ textWrap: 'balance' }}>
          Plan beautifully. <span className="text-[#0D3B2E]">Prepare for anything.</span>
        </h1>

        <p className="text-base md:text-lg text-[#4A5056] max-w-2xl mx-auto font-normal leading-relaxed">
          The first event management platform that combines generative planning, interactive 3D venue layout, real-time crisis injection, and non-destructive event version rewind.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenDemo}
            className="px-6 py-3.5 bg-[#0D3B2E] hover:bg-[#165342] text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            Launch College Festival Demo
            <ArrowRight className="w-4 h-4 text-[#C59B27]" />
          </button>

          <button
            onClick={onOpenWizard}
            className="px-6 py-3.5 bg-white hover:bg-[#FAF8F5] text-[#181B1E] border border-[rgba(26,29,32,0.15)] rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            Create New Custom Event
          </button>
        </div>

        {/* Quiet unboxed metadata strip (Anti-slop: zero pill enclosures) */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[#7D858D]">
          <span>Full 3D WebGL Simulation</span>
          <span aria-hidden="true">·</span>
          <span>Deterministic Budget & Capacity Rules</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Latency Event Rewind</span>
          <span aria-hidden="true">·</span>
          <span>Gemini Strategic Integration</span>
        </div>
      </section>

      {/* Featured Demonstration Scenario Card with Multi-Category Switcher */}
      <section id="simulation" className="px-6 py-12 max-w-6xl mx-auto w-full">
        {/* Scenario Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveScenario('festival')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeScenario === 'festival'
                ? 'bg-[#0D3B2E] text-white shadow-xs'
                : 'bg-white text-[#4A5056] border border-[rgba(26,29,32,0.12)] hover:bg-[#FAF8F5]'
            }`}
          >
            College Cultural Fest
          </button>
          <button
            onClick={() => setActiveScenario('wedding')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeScenario === 'wedding'
                ? 'bg-[#0D3B2E] text-white shadow-xs'
                : 'bg-white text-[#4A5056] border border-[rgba(26,29,32,0.12)] hover:bg-[#FAF8F5]'
            }`}
          >
            Royal Heritage Wedding
          </button>
          <button
            onClick={() => setActiveScenario('birthday')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeScenario === 'birthday'
                ? 'bg-[#0D3B2E] text-white shadow-xs'
                : 'bg-white text-[#4A5056] border border-[rgba(26,29,32,0.12)] hover:bg-[#FAF8F5]'
            }`}
          >
            Milestone 50th Birthday
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[rgba(26,29,32,0.08)] shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(26,29,32,0.08)] pb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C59B27]">
                Live Resilience Showcase · {curr.tag}
              </span>
              <h2 className="text-2xl font-bold text-[#181B1E] mt-1">{curr.title}</h2>
              <p className="text-xs text-[#7D858D] mt-1 max-w-2xl">{curr.description}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-[#7D858D]">Budget / Scale</div>
                <div className="text-xs font-bold text-[#181B1E] font-mono">
                  {curr.budget} · {curr.pax} pax
                </div>
              </div>
              <button
                onClick={launchCurrentPreset}
                className="px-4 py-2.5 bg-[#0D3B2E] text-white rounded-xl text-xs font-semibold hover:bg-[#165342] transition-colors cursor-pointer"
              >
                Launch Command Center
              </button>
            </div>
          </div>

          {/* 3-Step Core Differentiation Visual Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Baseline */}
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[rgba(26,29,32,0.06)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#181B1E]">01. Baseline State</span>
                <span className="text-[11px] font-mono text-[#0D3B2E] font-semibold">Version 1</span>
              </div>
              <p className="text-xs text-[#4A5056] leading-relaxed">{curr.step1}</p>
              <div className="text-xs font-mono text-[#7D858D] pt-2 border-t border-[rgba(26,29,32,0.06)]">
                {curr.step1Meta}
              </div>
            </div>

            {/* Step 2: Crisis Injection */}
            <div className="p-5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">02. Incident Injected</span>
                <span className="text-[11px] font-mono text-amber-800 font-semibold">Disruption</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">{curr.step2}</p>
              <div className="text-xs font-mono text-amber-700 pt-2 border-t border-amber-200/60">
                {curr.step2Meta}
              </div>
            </div>

            {/* Step 3: Feasible Recovery & Rewind */}
            <div className="p-5 rounded-xl bg-[#EBF4F0] border border-[#0D3B2E]/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0D3B2E]">03. Feasible Recovery</span>
                <span className="text-[11px] font-mono text-[#0D3B2E] font-semibold">Version 2</span>
              </div>
              <p className="text-xs text-[#0D3B2E] leading-relaxed">{curr.step3}</p>
              <div className="text-xs font-mono text-[#0D3B2E] pt-2 border-t border-[#0D3B2E]/15">
                {curr.step3Meta}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid: 4 Core Pillars */}
      <section id="engine" className="px-6 py-16 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-[#181B1E]">
            Engineered for Event Operational Integrity
          </h2>
          <p className="text-xs text-[#7D858D] max-w-xl mx-auto">
            Unlike static checklists or pure chat wrappers, CelebraAI couples procedural spatial reasoning with deterministic mathematical validation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div id="3d-venue" className="p-6 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF4F0] text-[#0D3B2E] flex items-center justify-center font-bold">
              <Box className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#181B1E]">Interactive 3D Venue</h3>
            <p className="text-xs text-[#4A5056] leading-relaxed">
              Explore multi-zone indoor and outdoor venues in Three.js with composite procedural models, PBR reflections, and boundaries.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#181B1E]">Crisis Simulator</h3>
            <p className="text-xs text-[#4A5056] leading-relaxed">
              Inject weather disasters, caterer dropouts, attendance surges, and budget cuts with multi-dimensional impact analysis.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#181B1E]">Deterministic Validator</h3>
            <p className="text-xs text-[#4A5056] leading-relaxed">
              Real mathematical calculation for expenses, capacity limits, and task dependencies. Infeasible plans are strictly rejected.
            </p>
          </div>

          <div id="rewind" className="p-6 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 text-[#181B1E] flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#181B1E]">Event Rewind</h3>
            <p className="text-xs text-[#4A5056] leading-relaxed">
              Immutable version control for events. Compare differential layouts, budgets, and tasks, and restore prior baselines safely.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[rgba(26,29,32,0.08)] bg-white px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#7D858D]">
          <div>
            © 2026 CelebraAI Command Center. Plan beautifully. Prepare for anything.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenDashboard} className="hover:text-[#0D3B2E] transition-colors cursor-pointer">
              Dashboard
            </button>
            <span>·</span>
            <button onClick={onOpenDemo} className="hover:text-[#0D3B2E] transition-colors cursor-pointer">
              Explore Demo
            </button>
            <span>·</span>
            <button onClick={onOpenWizard} className="hover:text-[#0D3B2E] transition-colors cursor-pointer">
              Create Event
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
