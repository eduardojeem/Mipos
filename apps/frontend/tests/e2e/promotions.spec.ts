import { test, expect } from '@playwright/test'

test.describe('Promotions dashboard', () => {
  test('loads promotions page and shows carousel section', async ({ page }) => {
    await page.goto('/dashboard/promotions')
    await expect(page.getByText(/Carrusel de Ofertas|Carrusel/i)).toBeVisible()
  })
})