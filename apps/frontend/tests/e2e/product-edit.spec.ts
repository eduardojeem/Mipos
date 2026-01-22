import { test, expect } from '@playwright/test'

test.describe('Edición de producto', () => {
  test('carga, valida, confirma y redirige a vista', async ({ page }) => {
    const id = 'test-123'

    await page.route(`**/api/products/${id}`, async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          json: {
            product: {
              id,
              name: 'Producto Demo',
              sku: 'SKU-TEST',
              description: 'Desc demo',
              sale_price: 50,
              cost_price: 20,
              stock_quantity: 10,
              min_stock: 2,
              category_id: 'cat1',
              brand: 'Marca',
              barcode: '1234567890123',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              image_url: 'https://via.placeholder.com/600x220?text=Producto'
            }
          }
        })
      } else if (method === 'PUT') {
        await route.fulfill({
          json: {
            product: {
              id,
              name: 'Producto Demo',
              sku: 'SKU-TEST',
              description: 'Desc demo actualizada',
              sale_price: 60,
              cost_price: 30,
              stock_quantity: 12,
              min_stock: 3,
              category_id: 'cat1',
              brand: 'Marca',
              barcode: '1234567890123',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              image_url: 'https://via.placeholder.com/600x220?text=Producto'
            }
          }
        })
      } else {
        await route.continue()
      }
    })

    // Silenciar endpoints de polling/health para evitar errores en UI durante la prueba
    const silence = async (route: any, payload: any = {}) => {
      await route.fulfill({ json: payload })
    }
    await page.route('**/api/health', (route) => silence(route, { ok: true }))
    await page.route('**/api/products', (route) => silence(route, { products: [] }))
    await page.route('**/api/categories', (route) => silence(route, { categories: [] }))
    await page.route('**/api/customers', (route) => silence(route, { customers: [] }))
    await page.route('**/api/sales', (route) => silence(route, { sales: [] }))
    await page.route('**/api/inventory/movements', (route) => silence(route, { movements: [] }))

    await page.goto(`/dashboard/products/edit/${id}`)

    await page.waitForSelector('#name', { state: 'visible', timeout: 10000 })

    await page.fill('#name', 'Producto Demo')
    await page.fill('#sku', 'SKU-TEST')
    await page.fill('#category', 'cat1')
    await page.fill('#price', '60')
    await page.fill('#cost', '30')

    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(`/dashboard/products/view/${id}`)

    await expect(page.getByText(/Información del Producto/i)).toBeVisible()
    await expect(page.getByText(/Información de Precios/i)).toBeVisible()
  })
})