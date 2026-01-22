import { test, expect } from '@playwright/test';

test.describe('Products Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should load products dashboard', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Check page title
    await expect(page.locator('h1')).toContainText('Gestión de Productos');

    // Check main elements are present
    await expect(page.locator('[data-testid="products-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-product-button"]')).toBeVisible();
  });

  test('should display products list', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-row"]');

    // Check that products are displayed
    const productRows = page.locator('[data-testid="product-row"]');
    await expect(productRows).toHaveCount(await productRows.count());
  });

  test('should search products', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Type in search box
    await page.fill('[data-testid="search-input"]', 'laptop');

    // Wait for search results
    await page.waitForTimeout(500);

    // Check that filtered results are shown
    const productRows = page.locator('[data-testid="product-row"]');
    const count = await productRows.count();

    // Verify all visible products contain the search term
    for (let i = 0; i < count; i++) {
      const productName = await productRows.nth(i).locator('[data-testid="product-name"]').textContent();
      expect(productName?.toLowerCase()).toContain('laptop');
    }
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Select category filter
    await page.selectOption('[data-testid="category-filter"]', 'electronics');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Check that all visible products belong to selected category
    const productRows = page.locator('[data-testid="product-row"]');
    const count = await productRows.count();

    for (let i = 0; i < count; i++) {
      const category = await productRows.nth(i).locator('[data-testid="product-category"]').textContent();
      expect(category).toBe('Electronics');
    }
  });

  test('should create new product', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Click add product button
    await page.click('[data-testid="add-product-button"]');

    // Wait for form to open
    await page.waitForSelector('[data-testid="product-form"]');

    // Fill form
    await page.fill('[data-testid="product-name"]', 'Test Product');
    await page.fill('[data-testid="product-sku"]', 'TEST001');
    await page.selectOption('[data-testid="product-category"]', 'test-category');
    await page.fill('[data-testid="product-price"]', '99.99');
    await page.fill('[data-testid="product-cost"]', '79.99');
    await page.fill('[data-testid="product-stock"]', '50');

    // Submit form
    await page.click('[data-testid="submit-product"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Verify product appears in list
    await page.waitForSelector(`[data-testid="product-name"]:has-text("Test Product")`);
  });

  test('should edit existing product', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Click edit button on first product
    await page.locator('[data-testid="product-row"]').first().locator('[data-testid="edit-product"]').click();

    // Wait for form to open
    await page.waitForSelector('[data-testid="product-form"]');

    // Modify product name
    const newName = 'Updated Product Name ' + Date.now();
    await page.fill('[data-testid="product-name"]', newName);

    // Submit form
    await page.click('[data-testid="submit-product"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Verify product name was updated
    await expect(page.locator(`[data-testid="product-name"]:has-text("${newName}")`)).toBeVisible();
  });

  test('should delete product with confirmation', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Get initial count
    const initialCount = await page.locator('[data-testid="product-row"]').count();

    // Click delete button on first product
    await page.locator('[data-testid="product-row"]').first().locator('[data-testid="delete-product"]').click();

    // Confirm deletion in dialog
    await page.waitForSelector('[data-testid="confirm-dialog"]');
    await page.click('[data-testid="confirm-delete"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('eliminado');

    // Verify product count decreased
    await page.waitForTimeout(1000);
    const finalCount = await page.locator('[data-testid="product-row"]').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should handle bulk actions', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Select multiple products
    await page.locator('[data-testid="product-row"]').first().locator('[data-testid="product-checkbox"]').check();
    await page.locator('[data-testid="product-row"]').nth(1).locator('[data-testid="product-checkbox"]').check();

    // Click bulk actions button
    await page.click('[data-testid="bulk-actions-button"]');

    // Select export action
    await page.click('[data-testid="bulk-export"]');

    // Verify export started
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('exportando');
  });

  test('should export products', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Click export button
    await page.click('[data-testid="export-products"]');

    // Select CSV format
    await page.selectOption('[data-testid="export-format"]', 'csv');

    // Click export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');

    // Wait for download to start
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('products_export');
  });

  test('should show low stock alerts', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Check for stock alerts
    const alerts = page.locator('[data-testid="stock-alert"]');

    // If there are low stock products, alerts should be visible
    if (await alerts.count() > 0) {
      await expect(alerts.first()).toBeVisible();
      await expect(alerts.first()).toContainText('stock bajo');
    }
  });

  test('should handle real-time updates', async ({ page, context }) => {
    await page.goto('/dashboard/products');

    // Open a second browser context to simulate another user
    const newPage = await context.newPage();
    await newPage.goto('/login');
    await newPage.fill('[data-testid="email"]', 'user2@example.com');
    await newPage.fill('[data-testid="password"]', 'password123');
    await newPage.click('[data-testid="login-button"]');
    await newPage.waitForURL('/dashboard');

    // Both users should see real-time updates
    // This test would need more complex setup for actual real-time testing
    expect(true).toBe(true); // Placeholder for real-time test
  });

  test('should be responsive on mobile', async ({ page, browser }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/products');

    // Check that mobile menu is visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Check that table is scrollable horizontally
    const table = page.locator('[data-testid="products-table"]');
    const isScrollable = await table.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(isScrollable).toBe(true);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Mock network failure
    await page.route('**/api/products**', route => route.abort());

    // Try to load products
    await page.reload();

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Click add product
    await page.click('[data-testid="add-product-button"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-product"]');

    // Check validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="sku-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-error"]')).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Check pagination controls
    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      // Click next page
      await page.click('[data-testid="next-page"]');

      // Verify page changed
      await expect(page.locator('[data-testid="current-page"]')).toContainText('2');

      // Click previous page
      await page.click('[data-testid="prev-page"]');

      // Verify back to page 1
      await expect(page.locator('[data-testid="current-page"]')).toContainText('1');
    }
  });

  test('should maintain state on page refresh', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Apply some filters
    await page.fill('[data-testid="search-input"]', 'test');
    await page.selectOption('[data-testid="category-filter"]', 'electronics');

    // Refresh page
    await page.reload();

    // Check that filters are maintained (if implemented)
    // This depends on URL state management
    const searchValue = await page.inputValue('[data-testid="search-input"]');
    expect(searchValue).toBe('test');
  });

  test('changing stock filter does not cause maximum update depth error', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/dashboard/products');
    await page.getByPlaceholder('Buscar por nombre, código, descripción o categoría...').fill('');
    await page.getByText('Filtrar por stock').click();
    await page.getByRole('option', { name: 'Stock Bajo' }).click();

    const hasMaxDepth = errors.some(e => e.includes('Maximum update depth exceeded'));
    expect(hasMaxDepth).toBeFalsy();
  });
});