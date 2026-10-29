/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

const ANNOUNCE_EVENT = 'celebraai:announce';

/**
 * Triggers a polite screen-reader accessible announcement from anywhere in the application.
 */
export function announceToScreenReader(message: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ANNOUNCE_EVENT, { detail: { message } }));
  }
}

/**
 * Screen reader live region component implementing WCAG 2.1 AAA aria-live standards.
 * Rendered at root level in App.tsx.
 */
export const LiveAnnouncer: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const handleAnnounce = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail?.message) {
        setAnnouncement(customEvent.detail.message);
      }
    };

    window.addEventListener(ANNOUNCE_EVENT, handleAnnounce);
    return () => window.removeEventListener(ANNOUNCE_EVENT, handleAnnounce);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only fixed -top-96 -left-96 w-1 h-1 overflow-hidden"
    >
      {announcement}
    </div>
  );
};

