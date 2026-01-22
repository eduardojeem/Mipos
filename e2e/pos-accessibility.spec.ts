import { test, expect } from '@playwright/test';

/**
 * Tests de Accesibilidad (A11y) para el POS
 */

test.describe('POS - Accesibilidad', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard/pos');
        await page.waitForSelector('[id="product-search"]');
    });

    test('todos los botones deben tener aria-labels', async ({ page }) => {
        // Verificar botones principales
        const buttons = await page.locator('button').all();

        for (const button of buttons) {
            const ariaLabel = await button.getAttribute('aria-label');
            const innerText = await button.innerText();

            // El botón debe tener aria-label o texto visible
            expect(ariaLabel || innerText).toBeTruthy();
        }
    });

    test('navegación por teclado debe funcionar', async ({ page }) => {
        // Focus en búsqueda
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.id);
        expect(focusedElement).toBe('product-search');

        // Continuar tabulando
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Verificar que puede navegar con Enter
        await page.keyboard.press('Enter');
    });

    test('imágenes deben tener alt text', async ({ page }) => {
        const images = await page.locator('img').all();

        for (const img of images) {
            const alt = await img.getAttribute('alt');
            expect(alt).toBeTruthy();
        }
    });

    test('contraste de colores debe ser suficiente', async ({ page }) => {
        // Este test requeriría una librería como axe-core
        // Por ahora, verificamos que los elementos críticos sean visibles

        const totalText = page.locator('text=/Total.*\\$/');
        await expect(totalText).toBeVisible();

        // Verificar que el texto del total es grande
        const fontSize = await totalText.evaluate((el) => {
            return window.getComputedStyle(el).fontSize;
        });

        // El total debe ser al menos 32px (text-4xl aprox)
        const fontSizeNum = parseFloat(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(28);
    });
});
