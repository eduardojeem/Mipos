'use client';

/**
 * SkipNavigation Component
 * 
 * Provides a skip link for keyboard users to bypass navigation
 * and jump directly to main content. Improves accessibility
 * by reducing navigation time for screen reader users.
 * 
 * WCAG 2.1 Level A - Bypass Blocks
 */
export function SkipNavigation() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
        >
            Saltar al contenido principal
        </a>
    );
}
