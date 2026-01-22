/**
 * Custom hook for tracking which section is currently visible in viewport
 * Uses IntersectionObserver API for efficient scroll tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseScrollSpyOptions {
  sectionIds: string[];
  rootMargin?: string;
  threshold?: number;
}

interface UseScrollSpyReturn {
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
}

/**
 * Hook to track active section and provide smooth scroll navigation
 * 
 * @param options - Configuration options
 * @param options.sectionIds - Array of section IDs to observe
 * @param options.rootMargin - Root margin for IntersectionObserver (default: '0px 0px -60% 0px')
 * @param options.threshold - Intersection threshold (default: 0.2)
 * @returns Active section ID and scroll function
 */
export function useScrollSpy({
  sectionIds,
  rootMargin = '0px 0px -60% 0px',
  threshold = 0.2,
}: UseScrollSpyOptions): UseScrollSpyReturn {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const currentSectionRef = useRef(activeSection);

  // Keep ref in sync with state
  useEffect(() => {
    currentSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    // Get all section elements
    const elements = sectionIds
      .map((id) => ({
        id,
        element: document.getElementById(id),
      }))
      .filter((item): item is { id: string; element: HTMLElement } => 
        item.element !== null
      );

    if (elements.length === 0) {
      return;
    }

    // Create IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const found = elements.find((e) => e.element === entry.target);
            
            if (found && found.id !== currentSectionRef.current) {
              setActiveSection(found.id);
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    // Observe all section elements
    elements.forEach(({ element }) => {
      observerRef.current?.observe(element);
    });

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [sectionIds, rootMargin, threshold]);

  /**
   * Scrolls smoothly to a section by ID
   * Updates active section state immediately for responsive UI
   */
  const scrollToSection = useCallback((sectionId: string) => {
    // Update active section immediately for responsive UI
    setActiveSection(sectionId);

    // Scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  return {
    activeSection,
    scrollToSection,
  };
}
