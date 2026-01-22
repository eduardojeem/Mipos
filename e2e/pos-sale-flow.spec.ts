import { test, expect } from '@playwright/test';

/**
 * Test del flujo completo de venta en el POS
 * 
 * Flujo:
 * 1. Navegar al POS
 * 2. Buscar un producto
 * 3. Agregar al carrito
 * 4. Verificar que aparece en el carrito
 * 5. Procesar la venta
 * 6. Verificar que la venta se procesó correctamente
 */

test.describe('POS - Flujo Completo de Venta', () => {
    test.beforeEach(async ({ page }) => {
        // TODO: Agregar autenticación si es necesaria
        // await page.goto('/login');
        // await page.fill('[name="email"]', 'test@example.com');
        // await page.fill('[name="password"]', 'password');
        // await page.click('button[type="submit"]');

        // Navegar al POS
        await page.goto('/dashboard/pos');

        // Esperar a que cargue
        await page.waitForSelector('[id="product-search"]', { timeout: 10000 });
    });

    test('debe permitir buscar un producto y agregarlo al carrito', async ({ page }) => {
        // 1. Buscar producto
        const searchInput = page.locator('[id="product-search"]');
        await searchInput.fill('producto'); // Ajustar según productos de prueba

        // Esperar resultados de búsqueda
        await page.waitForTimeout(500); // Esperar debounce

        // 2. Verificar que hay productos
        const productCards = page.locator('[aria-label*="Agregar"]').first();
        await expect(productCards).toBeVisible({ timeout: 5000 });

        // 3. Agregar al carrito
        await productCards.click();

        // 4. Verificar toast de confirmación
        await expect(page.locator('text=agregado')).toBeVisible({ timeout: 3000 });

        // 5. Verificar que el carrito tiene items
        const cartBadge = page.locator('text=/\\d+ artículo/');
        await expect(cartBadge).toBeVisible();
    });

    test('debe permitir procesar una venta completa', async ({ page }) => {
        // Setup: Agregar un producto al carrito primero
        const searchInput = page.locator('[id="product-search"]');
        await searchInput.fill('producto');
        await page.waitForTimeout(500);

        const addButton = page.locator('[aria-label*="Agregar"]').first();
        await addButton.click();
        await page.waitForTimeout(1000);

        // 1. Click en "Procesar Venta"
        const processButton = page.locator('text=Procesar Venta');
        await expect(processButton).toBeVisible();
        await processButton.click();

        // 2. Verificar que se abre el modal
        await expect(page.locator('text=Procesando Venta')).toBeVisible({ timeout: 3000 });

        // 3. Verificar que muestra el total
        await expect(page.locator('text=/Total.*\\$/i')).toBeVisible();

        // 4. Confirmar la venta
        const confirmButton = page.locator('button:has-text("Confirmar")');
        await expect(confirmButton).toBeEnabled();
        await confirmButton.click();

        // 5. Verificar éxito
        await expect(page.locator('text=/Venta.*procesada/i')).toBeVisible({ timeout: 10000 });
    });

    test('debe permitir poner una venta en espera y restaurarla', async ({ page }) => {
        // Setup: Agregar producto
        const searchInput = page.locator('[id="product-search"]');
        await searchInput.fill('producto');
        await page.waitForTimeout(500);

        const addButton = page.locator('[aria-label*="Agregar"]').first();
        await addButton.click();
        await page.waitForTimeout(1000);

        // 1. Click en "Espera"
        const holdButton = page.locator('button:has-text("Espera")');
        await holdButton.click();

        // 2. Verificar que se limpió el carrito
        await expect(page.locator('text=El carrito está vacío')).toBeVisible();

        // 3. Verificar indicador de ventas en espera
        await expect(page.locator('text=/\\d+ en espera/')).toBeVisible();

        // 4. Abrir modal de ventas en espera
        const heldSalesButton = page.locator('text=/\\d+ en espera/');
        await heldSalesButton.click();

        // 5. Restaurar venta
        const restoreButton = page.locator('button:has-text("Retomar")').first();
        await restoreButton.click();

        // 6. Verificar que se restauró el carrito
        await expect(page.locator('text=/\\d+ artículo/')).toBeVisible();
    });

    test('debe permitir agregar un item personalizado', async ({ page }) => {
        // 1. Click en "Item Manual"
        const customItemButton = page.locator('button:has-text("Item Manual")');
        await customItemButton.click();

        // 2. Verificar que se abre el modal
        await expect(page.locator('text=Agregar Item Personalizado')).toBeVisible();

        // 3. Llenar formulario
        await page.fill('[id="name"]', 'Servicio de Prueba');
        await page.fill('[id="price"]', '100');
        await page.fill('[id="quantity"]', '2');

        // 4. Agregar al carrito
        const addToCartButton = page.locator('button:has-text("Agregar al Carrito")');
        await addToCartButton.click();

        // 5. Verificar que se agregó
        await expect(page.locator('text=Servicio de Prueba')).toBeVisible();
    });

    test('debe mostrar error si intenta procesar venta sin items', async ({ page }) => {
        // Asegurar que el carrito está vacío
        const clearButton = page.locator('button:has-text("Limpiar")');
        if (await clearButton.isVisible()) {
            await clearButton.click();
        }

        // Intentar procesar venta
        const processButton = page.locator('text=Procesar Venta');
        if (await processButton.isVisible()) {
            await processButton.click();

            // Verificar mensaje de error
            await expect(page.locator('text=/carrito.*vacío/i')).toBeVisible({ timeout: 3000 });
        }
    });
});
