/**
 * Axe-core configuration for accessibility testing
 * 
 * This configuration ensures WCAG 2.1 Level AA compliance
 */

import { injectAxe, checkA11y, configureAxe } from '@axe-core/playwright';
import { Page } from '@playwright/test';

/**
 * Default axe configuration
 */
export const defaultAxeConfig = {
  rules: {
    // WCAG 2.1 Level AA rules
    'color-contrast': { enabled: true },
    'valid-aria-attr': { enabled: true },
    'aria-roles': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-viewport': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
    'tabindex': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
    'video-description': { enabled: true },
  },
};

/**
 * Initialize axe on a page
 */
export async function initializeAxe(page: Page): Promise<void> {
  await injectAxe(page);
  await configureAxe(page, defaultAxeConfig);
}

/**
 * Run accessibility checks on a page
 */
export async function runAccessibilityChecks(
  page: Page,
  options?: {
    include?: string[];
    exclude?: string[];
    detailedReport?: boolean;
  }
): Promise<void> {
  await checkA11y(
    page,
    options?.include,
    {
      detailedReport: options?.detailedReport ?? true,
      detailedReportOptions: {
        html: true,
      },
    },
    false,
    'v2'
  );
}

/**
 * Check specific element for accessibility issues
 */
export async function checkElementAccessibility(
  page: Page,
  selector: string
): Promise<void> {
  await checkA11y(page, selector, {
    detailedReport: true,
  });
}
