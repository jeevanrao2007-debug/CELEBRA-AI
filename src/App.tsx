/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { EventData } from './types';
import {
  createInitialDemoFestival,
  createWeddingPreset,
  createBirthdayPreset,
  createCommunityPreset,
} from './data/demoEvents';
import { LandingPage } from './components/landing/LandingPage';
import { LiveAnnouncer } from './components/common/LiveAnnouncer';

const MainDashboard = lazy(() =>
  import('./components/dashboard/MainDashboard').then((m) => ({ default: m.MainDashboard }))
);
const EventCommandCenter = lazy(() =>
  import('./components/command/EventCommandCenter').then((m) => ({ default: m.EventCommandCenter }))
);
const EventWizardModal = lazy(() =>
  import('./components/wizard/EventWizardModal').then((m) => ({ default: m.EventWizardModal }))
);

const STORAGE_KEY = 'celebraai_events_store_v1';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'command'>('landing');
  const [events, setEvents] = useState<EventData[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage retrieval note:', e);
    }
    return [
      createInitialDemoFestival(),
      createWeddingPreset(),
      createBirthdayPreset(),
      createCommunityPreset(),
    ];
  });

  const [activeEventId, setActiveEventId] = useState<string>(() => {
    return events[0]?.id || 'event_demo_college_fest_2026';
  });

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Sync to local storage whenever events mutate
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn('Storage persistence note:', e);
    }
  }, [events]);

  const activeEvent =
    events.find((e) => e.id === activeEventId) || events[0] || createInitialDemoFestival();

  const handleUpdateActiveEvent = (updated: EventData) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleCreateEvent = (newEvent: EventData) => {
    setEvents((prev) => [newEvent, ...prev]);
    setActiveEventId(newEvent.id);
    setView('command');
  };

  const handleLoadPreset = (preset: 'festival' | 'wedding' | 'birthday' | 'community') => {
    let targetEvent: EventData;
    if (preset === 'wedding') {
      targetEvent = createWeddingPreset();
    } else if (preset === 'birthday') {
      targetEvent = createBirthdayPreset();
    } else if (preset === 'community') {
      targetEvent = createCommunityPreset();
    } else {
      targetEvent = createInitialDemoFestival();
    }

    setEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== targetEvent.id);
      return [targetEvent, ...filtered];
    });
    setActiveEventId(targetEvent.id);
    setView('command');
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => {
      const remaining = prev.filter((e) => e.id !== eventId);
      if (remaining.length === 0) {
        return [createInitialDemoFestival()];
      }
      return remaining;
    });
    if (activeEventId === eventId) {
      setActiveEventId(events.find((e) => e.id !== eventId)?.id || 'event_demo_college_fest_2026');
    }
  };

  const handleResetDefaults = () => {
    const defaults = [
      createInitialDemoFestival(),
      createWeddingPreset(),
      createBirthdayPreset(),
      createCommunityPreset(),
    ];
    setEvents(defaults);
    setActiveEventId(defaults[0].id);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181B1E] selection:bg-[#0D3B2E] selection:text-white">
      {/* WCAG 2.1 AAA Skip to Content Accessibility Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0D3B2E] focus:text-white focus:rounded-lg focus:shadow-lg focus:font-semibold text-xs transition-transform"
      >
        Skip to main content
      </a>

      {/* Polite Screen Reader Live Region */}
      <LiveAnnouncer />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {view === 'landing' && (
          <LandingPage
            onOpenDemo={() => handleLoadPreset('festival')}
            onOpenPreset={handleLoadPreset}
            onOpenWizard={() => setIsWizardOpen(true)}
            onOpenDashboard={() => setView('dashboard')}
          />
        )}

        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center p-8 bg-[#FAF8F5]">
              <div className="flex flex-col items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[#0D3B2E]/20" />
                <p className="text-xs text-[#7D858D] font-medium">Loading workspace module...</p>
              </div>
            </div>
          }
        >
          {view === 'dashboard' && (
            <div className="min-h-screen p-6">
              <MainDashboard
                events={events}
                onSelectEvent={(evt) => {
                  setActiveEventId(evt.id);
                  setView('command');
                }}
                onDeleteEvent={handleDeleteEvent}
                onResetDefaults={handleResetDefaults}
                onOpenWizard={() => setIsWizardOpen(true)}
                onLoadDemo={() => handleLoadPreset('festival')}
                onLoadPreset={handleLoadPreset}
              />
            </div>
          )}

          {view === 'command' && (
            <EventCommandCenter
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
              onBackToDashboard={() => setView('dashboard')}
            />
          )}

          {/* Global Event Creation Wizard Modal */}
          {isWizardOpen && (
            <EventWizardModal
              isOpen={isWizardOpen}
              onClose={() => setIsWizardOpen(false)}
              onCreateEvent={handleCreateEvent}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
};
