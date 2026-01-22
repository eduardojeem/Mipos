import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Run accessibility tests on a page using axe-core
 * @param page - Playwright page object
 * @param options - Optional configuration for axe
 * @returns Accessibility scan results
 */
export async function checkA11y(
  page: Page,
  options?: {
    include?: string[];
    exclude?: string[];
    rules?: Record<string, { enabled: boolean }>;
  }
) {
  const builder = new AxeBuilder({ page });

  if (options?.include) {
    builder.include(options.include);
  }

  if (options?.exclude) {
    builder.exclude(options.exclude);
  }

  if (options?.rules) {
    builder.options({ rules: options.rules });
  }

  // Run WCAG 2.1 AA compliance checks
  const results = await builder
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  return results;
}

/**
 * Assert that a page has no accessibility violations
 * @param page - Playwright page object
 * @param options - Optional configuration
 */
export async function assertNoA11yViolations(
  page: Page,
  options?: Parameters<typeof checkA11y>[1]
) {
  const results = await checkA11y(page, options);

  if (results.violations.length > 0) {
    const violationMessages = results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.description}\n` +
        `  Impact: ${violation.impact}\n` +
        `  Nodes: ${violation.nodes.length}\n` +
        `  Help: ${violation.helpUrl}\n`
    );

    throw new Error(
      `Accessibility violations found:\n\n${violationMessages.join('\n')}`
    );
  }

  return results;
}

/**
 * Get a summary of accessibility violations
 * @param page - Playwright page object
 * @returns Summary object with violation counts by impact
 */
export async function getA11ySummary(page: Page) {
  const results = await checkA11y(page);

  const summary = {
    total: results.violations.length,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    violations: results.violations,
  };

  results.violations.forEach((violation) => {
    switch (violation.impact) {
      case 'critical':
        summary.critical++;
        break;
      case 'serious':
        summary.serious++;
        break;
      case 'moderate':
        summary.moderate++;
        break;
      case 'minor':
        summary.minor++;
        break;
    }
  });

  return summary;
}

/**
 * Check keyboard navigation on a page
 * @param page - Playwright page object
 * @param selectors - Array of selectors to check
 */
export async function checkKeyboardNavigation(
  page: Page,
  selectors: string[]
) {
  const results: Array<{ selector: string; focusable: boolean }> = [];

  for (const selector of selectors) {
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.matches(selector);
    });

    results.push({
      selector,
      focusable: focusedElement || false,
    });
  }

  return results;
}

/**
 * Check color contrast ratios
 * @param page - Playwright page object
 * @param selector - Element selector to check
 */
export async function checkColorContrast(page: Page, selector: string) {
  const results = await checkA11y(page, {
    include: [selector],
    rules: {
      'color-contrast': { enabled: true },
    },
  });

  return results.violations.filter((v) => v.id === 'color-contrast');
}
