/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * WCAG 2.1 AAA compliant keyboard focus trap hook for dialogs and modals.
 * - Restores previous document activeElement on close
 * - Traps Tab navigation cycle within the modal boundary
 * - Closes modal on Escape key press
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions
) {
  const containerRef = useRef<T | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!options.isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Focus first focusable element or container
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && options.onClose) {
        e.preventDefault();
        options.onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const elements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null); // Visible elements only

      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === container) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [options.isOpen, options.onClose]);

  return containerRef;
}

