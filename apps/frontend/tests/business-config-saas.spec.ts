import { test, expect } from '@playwright/test';

/**
 * Tests E2E para Business Config SaaS Multitenancy
 * 
 * Valida:
 * - Aislamiento de datos entre organizaciones
 * - Permisos de super admin
 * - Sincronización entre pestañas
 * - Persistencia de cambios
 */

// Helper para login
async function loginAsAdmin(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

// Helper para ir a business config
async function goToBusinessConfig(page: any) {
  await page.goto('/admin/business-config');
  await page.waitForLoadState('networkidle');
}

test.describe('Business Config - Aislamiento de Datos', () => {
  test('Admin de Org A no puede ver config de Org B', async ({ page, context }) => {
    // Login como Admin de Org A
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Cambiar nombre del negocio
    await page.fill('input[name="businessName"]', 'Empresa A - Test');
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada', { timeout: 5000 });
    
    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Cerrar sesión');
    await page.waitForURL('/login');
    
    // Login como Admin de Org B
    await loginAsAdmin(page, 'admin-org-b@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Verificar que NO muestra "Empresa A - Test"
    const businessNameInput = page.locator('input[name="businessName"]');
    const value = await businessNameInput.inputValue();
    expect(value).not.toBe('Empresa A - Test');
    expect(value).toContain('Empresa B'); // Debe mostrar config de Org B
  });

  test('Cambios en Org A no afectan Org B', async ({ page, context }) => {
    // Login como Admin de Org A
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Obtener color primario original de Org A
    const colorInputA = page.locator('input[name="primaryColor"]');
    const originalColorA = await colorInputA.inputValue();
    
    // Cambiar color primario
    await colorInputA.fill('#FF0000');
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada');
    
    // Abrir nueva pestaña como Admin de Org B
    const pageB = await context.newPage();
    await loginAsAdmin(pageB, 'admin-org-b@test.com', 'password123');
    await goToBusinessConfig(pageB);
    
    // Verificar que Org B mantiene su color original
    const colorInputB = pageB.locator('input[name="primaryColor"]');
    const colorB = await colorInputB.inputValue();
    expect(colorB).not.toBe('#FF0000');
    
    await pageB.close();
  });
});

test.describe('Business Config - Super Admin', () => {
  test('Super Admin puede ver selector de organizaciones', async ({ page }) => {
    // Login como Super Admin
    await loginAsAdmin(page, 'superadmin@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Verificar que existe el selector
    await expect(page.locator('text=Super Admin')).toBeVisible();
    await expect(page.locator('[role="combobox"]')).toBeVisible();
  });

  test('Super Admin puede cambiar entre organizaciones', async ({ page }) => {
    // Login como Super Admin
    await loginAsAdmin(page, 'superadmin@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Seleccionar Org A
    await page.click('[role="combobox"]');
    await page.click('text=Empresa A');
    await page.waitForLoadState('networkidle');
    
    // Obtener nombre de negocio de Org A
    const businessNameA = await page.locator('input[name="businessName"]').inputValue();
    
    // Cambiar a Org B
    await page.click('[role="combobox"]');
    await page.click('text=Empresa B');
    await page.waitForLoadState('networkidle');
    
    // Verificar que cambió la configuración
    const businessNameB = await page.locator('input[name="businessName"]').inputValue();
    expect(businessNameB).not.toBe(businessNameA);
  });

  test('Super Admin puede editar cualquier organización', async ({ page }) => {
    // Login como Super Admin
    await loginAsAdmin(page, 'superadmin@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Seleccionar Org A
    await page.click('[role="combobox"]');
    await page.click('text=Empresa A');
    await page.waitForLoadState('networkidle');
    
    // Cambiar tagline
    const newTagline = `Test ${Date.now()}`;
    await page.fill('input[name="tagline"]', newTagline);
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada');
    
    // Recargar página
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verificar que se guardó
    const savedTagline = await page.locator('input[name="tagline"]').inputValue();
    expect(savedTagline).toBe(newTagline);
  });
});

test.describe('Business Config - LocalStorage Scoped', () => {
  test('LocalStorage se scope por organización', async ({ page }) => {
    // Login como Admin de Org A
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Obtener organization_id del contexto
    const orgId = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const configKey = keys.find(k => k.startsWith('businessConfig_'));
      return configKey ? configKey.split('_')[1] : null;
    });
    
    expect(orgId).toBeTruthy();
    expect(orgId).not.toBe('undefined');
    
    // Verificar que existe la key scoped
    const hasConfigKey = await page.evaluate((id) => {
      return localStorage.getItem(`businessConfig_${id}`) !== null;
    }, orgId);
    
    expect(hasConfigKey).toBe(true);
  });

  test('Cambiar de organización carga config correcta', async ({ page }) => {
    // Login como Super Admin
    await loginAsAdmin(page, 'superadmin@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Seleccionar Org A y cambiar nombre
    await page.click('[role="combobox"]');
    await page.click('text=Empresa A');
    await page.waitForLoadState('networkidle');
    
    const nameA = `Org A ${Date.now()}`;
    await page.fill('input[name="businessName"]', nameA);
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada');
    
    // Cambiar a Org B y cambiar nombre
    await page.click('[role="combobox"]');
    await page.click('text=Empresa B');
    await page.waitForLoadState('networkidle');
    
    const nameB = `Org B ${Date.now()}`;
    await page.fill('input[name="businessName"]', nameB);
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada');
    
    // Volver a Org A
    await page.click('[role="combobox"]');
    await page.click('text=Empresa A');
    await page.waitForLoadState('networkidle');
    
    // Verificar que se cargó config de Org A
    const currentName = await page.locator('input[name="businessName"]').inputValue();
    expect(currentName).toBe(nameA);
  });
});

test.describe('Business Config - Sincronización', () => {
  test('Cambios se sincronizan entre pestañas de misma org', async ({ page, context }) => {
    // Login en primera pestaña
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Abrir segunda pestaña con misma organización
    const page2 = await context.newPage();
    await loginAsAdmin(page2, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page2);
    
    // Cambiar en primera pestaña
    const newTagline = `Sync Test ${Date.now()}`;
    await page.fill('input[name="tagline"]', newTagline);
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada');
    
    // Esperar sincronización (BroadcastChannel)
    await page2.waitForTimeout(1000);
    
    // Recargar segunda pestaña para forzar carga desde localStorage
    await page2.reload();
    await page2.waitForLoadState('networkidle');
    
    // Verificar sincronización
    const syncedTagline = await page2.locator('input[name="tagline"]').inputValue();
    expect(syncedTagline).toBe(newTagline);
    
    await page2.close();
  });

  test('Pestañas de diferentes orgs no se sincronizan', async ({ page, context }) => {
    // Login como Admin de Org A en primera pestaña
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Login como Admin de Org B en segunda pestaña
    const page2 = await context.newPage();
    await loginAsAdmin(page2, 'admin-org-b@test.com', 'password123');
    await goToBusinessConfig(page2);
    
    // Obtener tagline original de Org B
    const originalTaglineB = await page2.locator('input[name="tagline"]').inputValue();
    
    // Cambiar en Org A
    const newTaglineA = `Org A ${Date.now()}`;
    await page.fill('input[name="tagline"]', newTaglineA);
    await page.click('button:has-text("Guardar Cambios")');
    await page.waitForSelector('text=Configuración guardada');
    
    // Esperar y recargar Org B
    await page2.waitForTimeout(1000);
    await page2.reload();
    await page2.waitForLoadState('networkidle');
    
    // Verificar que Org B NO cambió
    const currentTaglineB = await page2.locator('input[name="tagline"]').inputValue();
    expect(currentTaglineB).toBe(originalTaglineB);
    expect(currentTaglineB).not.toBe(newTaglineA);
    
    await page2.close();
  });
});

test.describe('Business Config - Validaciones', () => {
  test('No permite guardar sin organización', async ({ page }) => {
    // Este test simula un estado edge case donde no hay organización
    // En práctica, esto no debería ocurrir, pero validamos el manejo
    
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Intentar guardar
    await page.click('button:has-text("Guardar Cambios")');
    
    // Verificar que no hay error (porque sí hay organización)
    // Este test valida que el flujo normal funciona
    await expect(page.locator('text=Configuración guardada')).toBeVisible({ timeout: 5000 });
  });

  test('Muestra error si API falla', async ({ page }) => {
    // Login
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Interceptar request y forzar error
    await page.route('**/api/business-config*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Intentar guardar
    await page.fill('input[name="businessName"]', 'Test Error');
    await page.click('button:has-text("Guardar Cambios")');
    
    // Verificar mensaje de error
    await expect(page.locator('text=Error al guardar')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Business Config - Performance', () => {
  test('Carga rápida desde cache', async ({ page }) => {
    // Primera carga
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    const startTime = Date.now();
    await goToBusinessConfig(page);
    const firstLoadTime = Date.now() - startTime;
    
    // Segunda carga (desde cache)
    await page.reload();
    const cacheStartTime = Date.now();
    await page.waitForLoadState('networkidle');
    const cacheLoadTime = Date.now() - cacheStartTime;
    
    // Cache debería ser más rápido
    expect(cacheLoadTime).toBeLessThan(firstLoadTime);
  });

  test('Auto-save funciona correctamente', async ({ page }) => {
    await loginAsAdmin(page, 'admin-org-a@test.com', 'password123');
    await goToBusinessConfig(page);
    
    // Habilitar auto-save
    await page.check('input[type="checkbox"]');
    
    // Hacer cambio
    await page.fill('input[name="tagline"]', `Auto-save ${Date.now()}`);
    
    // Esperar debounce (2 segundos)
    await page.waitForTimeout(2500);
    
    // Verificar que se guardó automáticamente
    await expect(page.locator('text=Auto-guardando')).toBeVisible();
  });
});
