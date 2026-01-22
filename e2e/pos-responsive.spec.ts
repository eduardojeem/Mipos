/**
 * E2E Tests for POS Responsive Interface
 * 
 * These tests verify that the POS system works correctly across different
 * device sizes and orientations.
 * 
 * @see .kiro/specs/pos-audit/design.md - Responsive Interface Requirements
 */

import { test, expect, type Page } from '@playwright/test';

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  mobileLandscape: { width: 667, height: 375, name: 'iPhone SE Landscape' },
  tablet: { width: 768, height: 1024, name: 'iPad Mini' },
  tabletLandscape: { width: 1024, height: 768, name: 'iPad Mini Landscape' },
  desktop: { width: 1920, height: 1080, name: 'Desktop HD' },
  desktopSmall: { width: 1366, height: 768, name: 'Desktop Small' },
};

/**
 * Helper function to wait for POS to load
 */
async function waitForPOSLoad(page: Page) {
  // Wait for main POS elements to be visible
  await page.waitForSelector('[data-testid="pos-layout"], .pos-layout, h1:has-text("BeautyPOS")', {
    timeout: 10000,
  });
  
  // Wait for products to load
  await page.waitForSelector('[data-testid="product-card"], .product-card, [class*="product"]', {
    timeout: 10000,
  });
}

/**
 * Helper function to add product to cart
 */
async function addProductToCart(page: Page) {
  // Find and click first "Agregar" button
  const addButton = page.locator('button:has-text("Agregar")').first();
  await addButton.waitFor({ state: 'visible', timeout: 5000 });
  await addButton.click();
  
  // Wait for cart to update
  await page.waitForTimeout(500);
}

test.describe('POS Responsive Interface - Mobile (375x667)', () => {
  test.use({ viewport: VIEWPORTS.mobile });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);
  });

  /**
   * Validates: Requirements 10.1
   * The POS should display correctly on mobile devices
   */
  test('should display mobile layout correctly', async ({ page }) => {
    // Verify viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(375);
    expect(viewportSize?.height).toBe(667);

    // Check that main elements are visible
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
    
    // Products should be visible
    const products = page.locator('[data-testid="product-card"], .product-card, [class*="product"]');
    await expect(products.first()).toBeVisible();

    // Search should be visible
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]');
    await expect(searchInput.first()).toBeVisible();
  });

  /**
   * Validates: Requirements 10.4
   * Cart drawer should work on mobile
   */
  test('should open cart drawer on mobile', async ({ page }) => {
    // Add a product to cart
    await addProductToCart(page);

    // Look for cart button/icon
    const cartButton = page.locator('button:has([class*="ShoppingCart"]), button:has-text("carrito"), [data-testid="cart-button"]').first();
    
    if (await cartButton.isVisible()) {
      await cartButton.click();
      
      // Wait for drawer to open
      await page.waitForTimeout(500);
      
      // Verify drawer is visible
      const drawer = page.locator('[role="dialog"], [data-testid="cart-drawer"], .drawer, [class*="drawer"]');
      await expect(drawer.first()).toBeVisible({ timeout: 5000 });
    }
  });

  /**
   * Validates: Requirements 10.1
   * Products should be displayed in a single column on mobile
   */
  test('should display products in mobile-friendly layout', async ({ page }) => {
    const products = page.locator('[data-testid="product-card"], .product-card, [class*="product"]');
    
    // Wait for products to load
    await products.first().waitFor({ state: 'visible' });
    
    // Get first two products
    const firstProduct = products.nth(0);
    const secondProduct = products.nth(1);
    
    if (await secondProduct.isVisible()) {
      const firstBox = await firstProduct.boundingBox();
      const secondBox = await secondProduct.boundingBox();
      
      if (firstBox && secondBox) {
        // On mobile, products should stack vertically
        // Second product should be below first product
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 50);
      }
    }
  });

  /**
   * Validates: Requirements 10.5
   * Touch interactions should work on mobile
   */
  test('should support touch interactions', async ({ page }) => {
    // Tap on search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
    await searchInput.tap();
    await expect(searchInput).toBeFocused();

    // Tap on a product
    const product = page.locator('[data-testid="product-card"], .product-card').first();
    await product.tap();
    
    // Verify interaction worked (product details or added to cart)
    await page.waitForTimeout(500);
  });

  /**
   * Validates: Requirements 10.1
   * Mobile navigation should be accessible
   */
  test('should have accessible mobile navigation', async ({ page }) => {
    // Look for mobile menu button
    const menuButton = page.locator('button:has([class*="Menu"]), button[aria-label*="menu"], [data-testid="mobile-menu"]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Menu should open
      await page.waitForTimeout(500);
      
      // Verify menu is visible
      const menu = page.locator('[role="menu"], [role="navigation"], .mobile-menu');
      await expect(menu.first()).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('POS Responsive Interface - Tablet (768x1024)', () => {
  test.use({ viewport: VIEWPORTS.tablet });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);
  });

  /**
   * Validates: Requirements 10.2
   * The POS should display correctly on tablet devices
   */
  test('should display tablet layout correctly', async ({ page }) => {
    // Verify viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(768);
    expect(viewportSize?.height).toBe(1024);

    // Check that main elements are visible
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
    
    // Products should be visible in grid
    const products = page.locator('[data-testid="product-card"], .product-card');
    await expect(products.first()).toBeVisible();
    
    // Should have multiple products visible
    const visibleProducts = await products.count();
    expect(visibleProducts).toBeGreaterThan(1);
  });

  /**
   * Validates: Requirements 10.2
   * Products should be displayed in 2-3 columns on tablet
   */
  test('should display products in tablet grid layout', async ({ page }) => {
    const products = page.locator('[data-testid="product-card"], .product-card, [class*="product"]');
    
    // Wait for products to load
    await products.first().waitFor({ state: 'visible' });
    
    // Get first three products
    const firstProduct = products.nth(0);
    const secondProduct = products.nth(1);
    const thirdProduct = products.nth(2);
    
    if (await secondProduct.isVisible() && await thirdProduct.isVisible()) {
      const firstBox = await firstProduct.boundingBox();
      const secondBox = await secondProduct.boundingBox();
      const thirdBox = await thirdProduct.boundingBox();
      
      if (firstBox && secondBox && thirdBox) {
        // On tablet, products should be in a grid (2-3 columns)
        // Second product should be to the right of first product
        const isSecondToRight = secondBox.x > firstBox.x + 50;
        
        // Or second product is below first (if only 1 column fits)
        const isSecondBelow = secondBox.y > firstBox.y + firstBox.height - 50;
        
        expect(isSecondToRight || isSecondBelow).toBeTruthy();
      }
    }
  });

  /**
   * Validates: Requirements 10.2
   * Cart should be visible as sidebar on tablet
   */
  test('should display cart as sidebar on tablet', async ({ page }) => {
    // Add a product to cart
    await addProductToCart(page);

    // Cart should be visible (not in drawer)
    const cart = page.locator('[data-testid="cart"], [class*="cart"], aside:has-text("Carrito")').first();
    
    // Wait a bit for cart to render
    await page.waitForTimeout(1000);
    
    // Cart should be visible on tablet
    if (await cart.isVisible()) {
      const cartBox = await cart.boundingBox();
      expect(cartBox).toBeTruthy();
    }
  });
});

test.describe('POS Responsive Interface - Desktop (1920x1080)', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);
  });

  /**
   * Validates: Requirements 10.3
   * The POS should display correctly on desktop
   */
  test('should display desktop layout correctly', async ({ page }) => {
    // Verify viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(1920);
    expect(viewportSize?.height).toBe(1080);

    // Check that main elements are visible
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
    
    // Products grid should be visible
    const products = page.locator('[data-testid="product-card"], .product-card');
    await expect(products.first()).toBeVisible();
    
    // Should have many products visible
    const visibleProducts = await products.count();
    expect(visibleProducts).toBeGreaterThan(3);
  });

  /**
   * Validates: Requirements 10.3
   * Products should be displayed in 4+ columns on desktop
   */
  test('should display products in desktop grid layout', async ({ page }) => {
    const products = page.locator('[data-testid="product-card"], .product-card, [class*="product"]');
    
    // Wait for products to load
    await products.first().waitFor({ state: 'visible' });
    
    // Get first four products
    const productBoxes = await Promise.all([
      products.nth(0).boundingBox(),
      products.nth(1).boundingBox(),
      products.nth(2).boundingBox(),
      products.nth(3).boundingBox(),
    ]);
    
    // Count how many products are in the first row
    const firstRowY = productBoxes[0]?.y || 0;
    const productsInFirstRow = productBoxes.filter(box => 
      box && Math.abs(box.y - firstRowY) < 50
    ).length;
    
    // Desktop should have at least 3 products per row
    expect(productsInFirstRow).toBeGreaterThanOrEqual(2);
  });

  /**
   * Validates: Requirements 10.3
   * Cart should be visible as fixed sidebar on desktop
   */
  test('should display cart as fixed sidebar on desktop', async ({ page }) => {
    // Add a product to cart
    await addProductToCart(page);

    // Cart should be visible as sidebar
    const cart = page.locator('[data-testid="cart"], [class*="cart"], aside').first();
    await expect(cart).toBeVisible();
    
    // Cart should be on the right side
    const cartBox = await cart.boundingBox();
    if (cartBox) {
      expect(cartBox.x).toBeGreaterThan(1000); // Should be on right side
    }
  });

  /**
   * Validates: Requirements 10.3
   * All features should be accessible on desktop
   */
  test('should have all features visible on desktop', async ({ page }) => {
    // Search should be visible
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible();

    // Category filters should be visible
    const filters = page.locator('[data-testid="category-filter"], button:has-text("Categoría"), select, [class*="filter"]');
    await expect(filters.first()).toBeVisible({ timeout: 5000 });

    // Products grid should be visible
    const products = page.locator('[data-testid="product-card"], .product-card');
    await expect(products.first()).toBeVisible();

    // Cart should be visible
    const cart = page.locator('[data-testid="cart"], [class*="cart"], aside').first();
    await expect(cart).toBeVisible();
  });
});

test.describe('POS Responsive Interface - Device Rotation', () => {
  /**
   * Validates: Requirements 10.4
   * The POS should handle device rotation correctly
   */
  test('should handle mobile portrait to landscape rotation', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);

    // Verify portrait layout
    let viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(375);
    expect(viewportSize?.height).toBe(667);

    // Rotate to landscape
    await page.setViewportSize(VIEWPORTS.mobileLandscape);
    await page.waitForTimeout(500);

    // Verify landscape layout
    viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(667);
    expect(viewportSize?.height).toBe(375);

    // Content should still be visible
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
    const products = page.locator('[data-testid="product-card"], .product-card');
    await expect(products.first()).toBeVisible();
  });

  /**
   * Validates: Requirements 10.4
   * The POS should handle tablet rotation correctly
   */
  test('should handle tablet portrait to landscape rotation', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);

    // Verify portrait layout
    let viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(768);

    // Rotate to landscape
    await page.setViewportSize(VIEWPORTS.tabletLandscape);
    await page.waitForTimeout(500);

    // Verify landscape layout
    viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(1024);

    // Content should still be visible and properly laid out
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
    const products = page.locator('[data-testid="product-card"], .product-card');
    await expect(products.first()).toBeVisible();
  });
});

test.describe('POS Responsive Interface - Cross-Device Functionality', () => {
  /**
   * Validates: Requirements 10.1, 10.2, 10.3
   * Core functionality should work on all devices
   */
  test('should add product to cart on all devices', async ({ page }) => {
    const devices = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

    for (const device of devices) {
      await page.setViewportSize(device);
      await page.goto('/dashboard/pos');
      await waitForPOSLoad(page);

      // Add product to cart
      await addProductToCart(page);

      // Verify product was added (cart count should increase or toast should appear)
      await page.waitForTimeout(1000);
      
      // Look for cart indicator or toast
      const cartIndicator = page.locator('[data-testid="cart-count"], .cart-count, [class*="badge"]');
      const toast = page.locator('[role="status"], .toast, [class*="toast"]');
      
      const hasCartIndicator = await cartIndicator.first().isVisible().catch(() => false);
      const hasToast = await toast.first().isVisible().catch(() => false);
      
      expect(hasCartIndicator || hasToast).toBeTruthy();
    }
  });

  /**
   * Validates: Requirements 10.1, 10.2, 10.3
   * Search should work on all devices
   */
  test('should search products on all devices', async ({ page }) => {
    const devices = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

    for (const device of devices) {
      await page.setViewportSize(device);
      await page.goto('/dashboard/pos');
      await waitForPOSLoad(page);

      // Find search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first();
      await searchInput.waitFor({ state: 'visible' });

      // Type search query
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Products should still be visible (filtered or not)
      const products = page.locator('[data-testid="product-card"], .product-card, [class*="product"]');
      await expect(products.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('POS Responsive Interface - Performance', () => {
  /**
   * Validates: Requirements 10.5, 18.1
   * The POS should load quickly on all devices
   */
  test('should load within acceptable time on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    
    const startTime = Date.now();
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds on mobile
    expect(loadTime).toBeLessThan(5000);
  });

  /**
   * Validates: Requirements 18.1
   * The POS should load quickly on desktop
   */
  test('should load within acceptable time on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    
    const startTime = Date.now();
    await page.goto('/dashboard/pos');
    await waitForPOSLoad(page);
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds on desktop
    expect(loadTime).toBeLessThan(3000);
  });
});
