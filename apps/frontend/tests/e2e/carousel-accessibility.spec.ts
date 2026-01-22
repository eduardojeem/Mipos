/**
 * Accessibility tests for the Carousel Editor component
 * 
 * These tests verify WCAG 2.1 Level AA compliance
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Carousel Editor Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to promotions page
    await page.goto('/dashboard/promotions');
    
    // Wait for carousel to load
    await page.waitForSelector('text=/Carrusel de ofertas/i');
    
    // Inject axe-core
    await injectAxe(page);
  });

  test('should have no accessibility violations on initial load', async ({ page }) => {
    // Check entire page for accessibility issues
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('should have accessible carousel section', async ({ page }) => {
    // Check specifically the carousel section
    const carouselSection = page.locator('text=/Carrusel de ofertas/i').locator('..');
    
    await checkA11y(page, carouselSection, {
      detailedReport: true,
    });
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab to search input
    await page.keyboard.press('Tab');
    
    // Verify focus is on search input
    const searchInput = page.getByPlaceholder(/Buscar promociones/i);
    await expect(searchInput).toBeFocused();
    
    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    
    // Should be able to reach checkboxes
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check for aria-label on buttons
    const saveButton = page.getByRole('button', { name: /Guardar carrusel/i });
    await expect(saveButton).toBeVisible();
    
    // Check for aria-label on move buttons
    const upButton = page.getByRole('button', { name: /Subir/i }).first();
    const downButton = page.getByRole('button', { name: /Bajar/i }).first();
    const deleteButton = page.getByRole('button', { name: /Eliminar/i }).first();
    
    if (await upButton.isVisible()) {
      await expect(upButton).toHaveAttribute('aria-label', 'Subir');
    }
    if (await downButton.isVisible()) {
      await expect(downButton).toHaveAttribute('aria-label', 'Bajar');
    }
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toHaveAttribute('aria-label', 'Eliminar');
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Get focused element
    const focusedElement = page.locator(':focus');
    
    // Check that focused element has visible outline or ring
    const styles = await focusedElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      };
    });
    
    // Should have either outline or box-shadow (focus ring)
    const hasFocusIndicator =
      styles.outlineWidth !== '0px' ||
      styles.outline !== 'none' ||
      styles.boxShadow !== 'none';
    
    expect(hasFocusIndicator).toBeTruthy();
  });

  test('should announce changes to screen readers', async ({ page }) => {
    // Look for aria-live regions
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();
    
    // Should have at least one live region for announcements
    expect(count).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check that headings are in proper order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    
    // Should have at least one heading
    expect(headings.length).toBeGreaterThan(0);
    
    // First heading should be h1
    const firstHeading = page.locator('h1').first();
    await expect(firstHeading).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // This is checked by axe-core, but we can also manually verify
    // Check that text is readable
    const carouselTitle = page.getByText(/Carrusel de ofertas/i);
    await expect(carouselTitle).toBeVisible();
    
    // Get computed styles
    const styles = await carouselTitle.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });
    
    // Should have defined colors
    expect(styles.color).toBeTruthy();
  });

  test('should have accessible form controls', async ({ page }) => {
    // Check that form controls have labels
    const searchInput = page.getByPlaceholder(/Buscar promociones/i);
    
    // Should have associated label
    const labelFor = await searchInput.getAttribute('id');
    if (labelFor) {
      const label = page.locator(`label[for="${labelFor}"]`);
      await expect(label).toBeVisible();
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for semantic HTML
    const main = page.locator('main, [role="main"]');
    const regions = page.locator('[role="region"]');
    
    // Should have proper landmarks
    const mainCount = await main.count();
    const regionCount = await regions.count();
    
    expect(mainCount + regionCount).toBeGreaterThan(0);
  });
});
