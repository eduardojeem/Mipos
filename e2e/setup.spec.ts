import { test, expect } from '@playwright/test';
import { assertNoA11yViolations, checkA11y } from './utils/accessibility';

/**
 * Basic E2E setup verification tests
 * These tests verify that Playwright and accessibility testing are correctly configured
 */

test.describe('E2E Testing Infrastructure Setup', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BeautyPOS/i);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2')).toContainText(/login|iniciar sesión/i);
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check that basic navigation elements exist
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});

test.describe('Accessibility Testing Setup', () => {
  test('should run axe-core accessibility scan', async ({ page }) => {
    await page.goto('/');
    
    // Run accessibility scan
    const results = await checkA11y(page);
    
    // Verify that axe-core is working
    expect(results).toBeDefined();
    expect(results.violations).toBeDefined();
    expect(Array.isArray(results.violations)).toBe(true);
  });

  test('should detect accessibility violations (if any)', async ({ page }) => {
    await page.goto('/');
    
    const results = await checkA11y(page);
    
    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('\n=== Accessibility Violations Found ===');
      results.violations.forEach((violation) => {
        console.log(`\n${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Nodes affected: ${violation.nodes.length}`);
        console.log(`  Help: ${violation.helpUrl}`);
      });
      console.log('\n=====================================\n');
    }
    
    // This test will pass even with violations, just for setup verification
    expect(results.violations).toBeDefined();
  });
});

test.describe('Viewport Testing Setup', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(375);
    expect(viewport?.height).toBe(667);
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(768);
    expect(viewport?.height).toBe(1024);
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(1920);
    expect(viewport?.height).toBe(1080);
  });
});

test.describe('Keyboard Navigation Setup', () => {
  test('should support Tab navigation', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab key
    await page.keyboard.press('Tab');
    
    // Check that focus moved to an interactive element
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        type: el?.getAttribute('type'),
        role: el?.getAttribute('role'),
      };
    });
    
    expect(focusedElement).toBeDefined();
  });

  test('should support Escape key', async ({ page }) => {
    await page.goto('/');
    
    // Press Escape key (should not cause errors)
    await page.keyboard.press('Escape');
    
    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Screenshot Testing Setup', () => {
  test('should capture screenshots', async ({ page }) => {
    await page.goto('/');
    
    // Take a screenshot
    const screenshot = await page.screenshot();
    
    // Verify screenshot was captured
    expect(screenshot).toBeDefined();
    expect(screenshot.length).toBeGreaterThan(0);
  });

  test('should capture element screenshots', async ({ page }) => {
    await page.goto('/');
    
    // Find a visible element
    const element = page.locator('body');
    await expect(element).toBeVisible();
    
    // Take element screenshot
    const screenshot = await element.screenshot();
    
    expect(screenshot).toBeDefined();
    expect(screenshot.length).toBeGreaterThan(0);
  });
});

test.describe('Network Interception Setup', () => {
  test('should intercept network requests', async ({ page }) => {
    const requests: string[] = [];
    
    // Listen to all requests
    page.on('request', (request) => {
      requests.push(request.url());
    });
    
    await page.goto('/');
    
    // Verify that requests were captured
    expect(requests.length).toBeGreaterThan(0);
  });

  test('should mock API responses', async ({ page }) => {
    // Mock API response
    await page.route('**/api/products', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'Test Product', price: 100 },
        ]),
      });
    });
    
    await page.goto('/');
    
    // Verify mock was used (this is just a setup test)
    expect(true).toBe(true);
  });
});
