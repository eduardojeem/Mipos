import { test, expect } from '@playwright/test'

test.describe('POS (/dashboard/pos)', () => {
  test('Carga estructura básica y elementos clave', async ({ page }) => {
    await page.goto('/dashboard/pos')

    await expect(page.getByRole('heading', { name: /BeautyPOS/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Buscar/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cobrar/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cliente/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Abrir carrito|Cerrar carrito/i })).toBeVisible()
  })

  test('Interacciones básicas de carrito', async ({ page }) => {
    await page.goto('/dashboard/pos')
    // Abre carrito si está cerrado
    const cartToggle = page.getByRole('button', { name: /Abrir carrito|Cerrar carrito/i })
    await cartToggle.click()
    // Verifica presencia de resumen y botón de cobro
    await expect(page.getByRole('button', { name: /Cobrar/i })).toBeVisible()
  })
})