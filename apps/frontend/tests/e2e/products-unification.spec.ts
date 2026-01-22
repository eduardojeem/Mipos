import { test, expect } from '@playwright/test'

test.describe('Unificación de rutas de Productos', () => {
  test('Accede a /dashboard/products con pestañas y UI principal', async ({ page }) => {
    await page.goto('/dashboard/products')

    await expect(page.locator('text=Gestión de Productos')).toBeVisible()
    await expect(page.locator('role=tab[name="Resumen"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Análisis"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Productos"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Gestión"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Reportes"]')).toBeVisible()
  })

  test('Navega directamente a la pestaña de productos vía query string', async ({ page }) => {
    await page.goto('/dashboard/products?tab=products')
    await expect(page.locator('text=Gestión de Productos')).toBeVisible()
    await expect(page.locator('button:has-text("Personalizar columnas")')).toBeVisible()
  })

  test('Redirección desde /dashboard/products/dashboard preserva parámetros', async ({ page }) => {
    await page.goto('/dashboard/products/dashboard?tab=management&search=laptop')
    await expect(page).toHaveURL(/\/dashboard\/products\?/) // debe contener query
    await expect(page.locator('text=Gestión de Productos')).toBeVisible()
  })
})