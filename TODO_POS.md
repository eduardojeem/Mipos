# 📋 TODO LIST - Módulo POS

**Fecha de creación**: 7 de febrero de 2026  
**Última actualización**: 7 de febrero de 2026  
**Prioridad**: ALTA

---

## 🔴 PRIORIDAD CRÍTICA (Sprint 1 - 2 semanas)

### 1. Refactorizar ProcessSaleModal

**Estado**: ⏳ Pendiente  
**Complejidad**: Alta  
**Tiempo estimado**: 5 días  
**Asignado a**: -

**Descripción**: El componente `ProcessSaleModal.tsx` tiene 1344 líneas y es demasiado complejo para mantener.

**Tareas**:

- [ ] Crear carpeta `apps/frontend/src/components/pos/sale-steps/`
- [ ] Crear `ProductsStep.tsx` (~200 líneas)
  - [ ] Mover lógica de visualización de productos
  - [ ] Mover validaciones de productos
  - [ ] Agregar tests unitarios
- [ ] Crear `DiscountsStep.tsx` (~250 líneas)
  - [ ] Mover lógica de descuentos
  - [ ] Mover lógica de cupones
  - [ ] Mover validaciones de descuentos
  - [ ] Agregar tests unitarios
- [ ] Crear `PaymentStep.tsx` (~300 líneas)
  - [ ] Mover lógica de métodos de pago
  - [ ] Mover validación de efectivo
  - [ ] Mover cálculo de cambio
  - [ ] Agregar tests unitarios
- [ ] Crear `ConfirmationStep.tsx` (~150 líneas)
  - [ ] Mover resumen final
  - [ ] Mover botón de confirmación
  - [ ] Agregar tests unitarios
- [ ] Crear `hooks/useSaleWizard.ts`
  - [ ] Mover lógica de navegación entre pasos
  - [ ] Mover estado compartido
  - [ ] Agregar tests unitarios
- [ ] Refactorizar `ProcessSaleModal.tsx` como coordinador (~150 líneas)
- [ ] Actualizar imports en `OptimizedPOSLayout.tsx`
- [ ] Probar flujo completo de venta
- [ ] Documentar cambios

**Archivos afectados**:

- `apps/frontend/src/components/pos/ProcessSaleModal.tsx`
- `apps/frontend/src/components/pos/sale-steps/ProductsStep.tsx` (nuevo)
- `apps/frontend/src/components/pos/sale-steps/DiscountsStep.tsx` (nuevo)
- `apps/frontend/src/components/pos/sale-steps/PaymentStep.tsx` (nuevo)
- `apps/frontend/src/components/pos/sale-steps/ConfirmationStep.tsx` (nuevo)
- `apps/frontend/src/components/pos/hooks/useSaleWizard.ts` (nuevo)

---

### 2. Implementar Tests Unitarios

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 5 días  
**Asignado a**: -

**Descripción**: Actualmente solo hay 15% de cobertura de tests. Necesitamos llegar al 80%.

**Tareas**:

#### 2.1 Tests para `useCart.ts`

- [ ] Configurar Jest y React Testing Library
- [ ] Test: `addToCart` agrega producto correctamente
- [ ] Test: `addToCart` valida stock disponible
- [ ] Test: `addToCart` aplica precio mayorista cuando corresponde
- [ ] Test: `addToCart` actualiza cantidad si producto ya existe
- [ ] Test: `updateQuantity` actualiza cantidad correctamente
- [ ] Test: `updateQuantity` remueve item si cantidad es 0
- [ ] Test: `updateQuantity` valida stock disponible
- [ ] Test: `removeFromCart` elimina producto
- [ ] Test: `clearCart` limpia el carrito
- [ ] Test: `cartTotals` calcula subtotal correctamente
- [ ] Test: `cartTotals` calcula descuento correctamente
- [ ] Test: `cartTotals` calcula IVA correctamente
- [ ] Test: Recalcula precios al cambiar modo mayorista
- [ ] Test: Aplica descuento de cliente mayorista
- [ ] **Meta**: 80% de cobertura

#### 2.2 Tests para `calculations.ts`

- [ ] Test: `calculateCartWithIva` con IVA no incluido
- [ ] Test: `calculateCartWithIva` con IVA incluido
- [ ] Test: `calculateCartWithIva` con descuento porcentual
- [ ] Test: `calculateCartWithIva` con descuento fijo
- [ ] Test: `calculateCartWithIva` con productos no gravables
- [ ] Test: `calculateCartWithIva` con IVA personalizado por producto
- [ ] Test: `calculateCartWithIva` clamp total a 0 si descuento excede
- [ ] Test: `calculateCartWithIva` redondeo preciso
- [ ] Test: `getFreeShippingThreshold` retorna umbral correcto
- [ ] **Meta**: 90% de cobertura

#### 2.3 Tests para `validation.ts`

- [ ] Test: Validación de descuento porcentual
- [ ] Test: Validación de descuento fijo
- [ ] Test: Validación de límites por rol
- [ ] Test: Validación de descuento negativo
- [ ] Test: Validación de descuento excesivo
- [ ] **Meta**: 85% de cobertura

#### 2.4 Tests para `useCashSessionValidation.ts`

- [ ] Test: `validateCashPayment` retorna true si sesión abierta
- [ ] Test: `validateCashPayment` retorna false si sesión cerrada
- [ ] Test: `validateCashPayment` retorna false si no hay sesión
- [ ] Test: `validateCashPayment` muestra toast si validación falla
- [ ] Test: `hasOpenSession` retorna estado correcto
- [ ] **Meta**: 80% de cobertura

**Archivos afectados**:

- `apps/frontend/src/hooks/__tests__/useCart.test.ts` (nuevo)
- `apps/frontend/src/lib/pos/__tests__/calculations.test.ts` (nuevo)
- `apps/frontend/src/lib/pos/__tests__/validation.test.ts` (nuevo)
- `apps/frontend/src/hooks/__tests__/useCashSessionValidation.test.ts` (nuevo)

---

### 3. Validación Backend de Descuentos

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días  
**Asignado a**: -

**Descripción**: Los límites de descuento solo se validan en frontend, permitiendo bypass.

**Tareas**:

- [ ] Crear servicio `apps/backend/src/sales/sales.service.ts`
- [ ] Implementar `validateDiscountLimits(userId, saleData)`
- [ ] Definir límites por rol:
  - [ ] CASHIER: max 200 fijo, 10%
  - [ ] MANAGER: max 1000 fijo, 25%
  - [ ] ADMIN: max 5000 fijo, 50%
  - [ ] SUPER_ADMIN: ilimitado
- [ ] Implementar `validateStockAvailability(items)`
- [ ] Agregar validación en endpoint POST `/sales`
- [ ] Implementar rate limiting (10 ventas/minuto)
- [ ] Agregar logging estructurado
- [ ] Agregar tests unitarios para validaciones
- [ ] Documentar límites en README

**Archivos afectados**:

- `apps/backend/src/sales/sales.service.ts` (nuevo)
- `apps/backend/src/sales/sales.controller.ts`
- `apps/backend/src/sales/sales.module.ts`

---

### 4. Rate Limiting en APIs

**Estado**: ⏳ Pendiente  
**Complejidad**: Baja  
**Tiempo estimado**: 1 día  
**Asignado a**: -

**Tareas**:

- [ ] Instalar `@nestjs/throttler`
- [ ] Configurar ThrottlerModule en app.module
- [ ] Aplicar @Throttle(10, 60) en POST /sales
- [ ] Aplicar @Throttle(20, 60) en GET /products
- [ ] Aplicar @Throttle(20, 60) en GET /customers
- [ ] Agregar tests de rate limiting
- [ ] Documentar límites en API docs

**Archivos afectados**:

- `apps/backend/src/app.module.ts`
- `apps/backend/src/sales/sales.controller.ts`
- `apps/backend/package.json`

---

## 🟡 PRIORIDAD ALTA (Sprint 2 - 2 semanas)

### 5. Mejorar Accesibilidad

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 4 días  
**Asignado a**: -

**Descripción**: Faltan ARIA labels y navegación por teclado en varios componentes.

**Tareas**:

#### 5.1 ProductCard

- [ ] Agregar `role="article"` al contenedor
- [ ] Agregar `aria-labelledby` con ID del nombre
- [ ] Agregar `aria-describedby` con descripción del producto
- [ ] Agregar `aria-label` al botón de agregar
- [ ] Agregar `aria-live="polite"` para stock
- [ ] Mejorar contraste de colores (WCAG AA)

#### 5.2 CartPanel

- [ ] Agregar `role="region"` con `aria-label="Carrito de compras"`
- [ ] Agregar `aria-live="polite"` para total
- [ ] Agregar `aria-label` a botones de cantidad
- [ ] Agregar `aria-label` a botón de eliminar
- [ ] Mejorar navegación por teclado

#### 5.3 ProcessSaleModal

- [ ] Agregar `aria-label` a cada paso
- [ ] Agregar `aria-current="step"` al paso activo
- [ ] Mejorar navegación por teclado entre pasos
- [ ] Agregar `aria-invalid` a campos con error
- [ ] Agregar `aria-describedby` para mensajes de error

#### 5.4 CartAnnouncer

- [ ] Crear componente `CartAnnouncer.tsx`
- [ ] Anunciar cuando se agrega producto
- [ ] Anunciar cuando se elimina producto
- [ ] Anunciar cambios en total
- [ ] Usar `aria-live="polite"` y `aria-atomic="true"`

#### 5.5 Auditoría

- [ ] Ejecutar Lighthouse accessibility audit
- [ ] Corregir todos los issues críticos
- [ ] Alcanzar score de 90+ en accesibilidad
- [ ] Documentar mejoras

**Archivos afectados**:

- `apps/frontend/src/components/pos/ProductCard.tsx`
- `apps/frontend/src/components/pos/CartPanel.tsx`
- `apps/frontend/src/components/pos/ProcessSaleModal.tsx`
- `apps/frontend/src/components/pos/CartAnnouncer.tsx` (nuevo)

---

### 6. Code Splitting y Optimización

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días  
**Asignado a**: -

**Descripción**: ProcessSaleModal y ReceiptModal son muy pesados (78KB y 32KB).

**Tareas**:

- [ ] Implementar dynamic import para ProcessSaleModal
- [ ] Implementar dynamic import para ReceiptModal
- [ ] Implementar dynamic import para OpenCashSessionModal
- [ ] Crear ModalSkeleton component
- [ ] Configurar prefetching para modales comunes
- [ ] Medir impacto en bundle size
- [ ] Medir impacto en LCP
- [ ] Documentar mejoras

**Meta**: Reducir bundle de 285KB a ~200KB

**Archivos afectados**:

- `apps/frontend/src/components/pos/OptimizedPOSLayout.tsx`
- `apps/frontend/src/components/pos/ModalSkeleton.tsx` (nuevo)

---

### 7. Virtualización de ProductGrid

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días  
**Asignado a**: -

**Descripción**: Con más de 100 productos, el grid se vuelve lento.

**Tareas**:

- [ ] Instalar `react-window` o `react-virtual`
- [ ] Crear `VirtualizedProductGrid.tsx`
- [ ] Implementar virtualización con altura dinámica
- [ ] Mantener funcionalidad de búsqueda
- [ ] Mantener funcionalidad de categorías
- [ ] Agregar tests de rendimiento
- [ ] Documentar uso

**Meta**: Renderizar solo 20-30 productos visibles a la vez

**Archivos afectados**:

- `apps/frontend/src/components/pos/ProductGrid.tsx`
- `apps/frontend/package.json`

---

### 8. Tests de Integración

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días  
**Asignado a**: -

**Tareas**:

- [ ] Test: Flujo completo de venta (agregar productos → descuento → pago → confirmación)
- [ ] Test: Aplicación de cupón válido
- [ ] Test: Rechazo de cupón inválido
- [ ] Test: Validación de stock insuficiente
- [ ] Test: Validación de sesión de caja cerrada
- [ ] Test: Cálculo correcto de cambio
- [ ] Test: Generación de recibo
- [ ] Configurar CI/CD para ejecutar tests

**Archivos afectados**:

- `apps/frontend/src/__tests__/integration/pos-sale-flow.test.tsx` (nuevo)
- `.github/workflows/test.yml`

---

## 🟢 PRIORIDAD MEDIA (Sprint 3 - 1 semana)

### 9. Modal de Ayuda con Atajos

**Estado**: ⏳ Pendiente  
**Complejidad**: Baja  
**Tiempo estimado**: 1 día  
**Asignado a**: -

**Tareas**:

- [ ] Crear `KeyboardShortcutsModal.tsx`
- [ ] Listar todos los atajos disponibles
- [ ] Agregar botón "?" en header para abrir modal
- [ ] Agregar atajo F1 para abrir modal
- [ ] Diseño premium con categorías
- [ ] Agregar tests

**Archivos afectados**:

- `apps/frontend/src/components/pos/KeyboardShortcutsModal.tsx` (nuevo)
- `apps/frontend/src/components/pos/OptimizedPOSLayout.tsx`

---

### 10. Indicador de Sesión de Caja Mejorado

**Estado**: ✅ Completado (básico) / ⏳ Mejoras pendientes  
**Complejidad**: Baja  
**Tiempo estimado**: 1 día  
**Asignado a**: -

**Tareas completadas**:

- [x] Botón "Abrir Caja" cuando no hay sesión
- [x] Indicador "Caja Abierta" cuando hay sesión
- [x] Validación de organización seleccionada

**Tareas pendientes**:

- [ ] Mostrar balance actual en el indicador
- [ ] Agregar botón "Cerrar Caja" en el header
- [ ] Agregar tooltip con detalles de la sesión
- [ ] Agregar animación de pulso al indicador
- [ ] Agregar sonido al abrir/cerrar caja (opcional)

**Archivos afectados**:

- `apps/frontend/src/components/pos/OptimizedPOSLayout.tsx`
- `apps/frontend/src/components/pos/CashSessionIndicator.tsx` (nuevo)

---

### 11. Búsqueda por Código de Barras

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días  
**Asignado a**: -

**Tareas**:

- [ ] Agregar campo `barcode` a modelo Product
- [ ] Crear migración de base de datos
- [ ] Modificar SearchBar para detectar códigos de barras
- [ ] Implementar búsqueda por código de barras
- [ ] Agregar producto automáticamente si se encuentra
- [ ] Agregar soporte para scanner USB
- [ ] Agregar tests
- [ ] Documentar uso

**Archivos afectados**:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/`
- `apps/frontend/src/components/pos/SearchBar.tsx`
- `apps/frontend/src/hooks/useBarcodeScanner.ts` (nuevo)

---

### 12. Documentación Completa

**Estado**: ⏳ Pendiente  
**Complejidad**: Baja  
**Tiempo estimado**: 1 día  
**Asignado a**: -

**Tareas**:

- [ ] Agregar JSDoc a todos los hooks
- [ ] Agregar JSDoc a todas las utilidades
- [ ] Crear `POS_USAGE_GUIDE.md`
- [ ] Crear `POS_ARCHITECTURE.md`
- [ ] Crear diagramas de flujo (Mermaid)
- [ ] Actualizar README principal
- [ ] Crear video tutorial (opcional)

**Archivos afectados**:

- `docs/POS_USAGE_GUIDE.md` (nuevo)
- `docs/POS_ARCHITECTURE.md` (nuevo)
- `README.md`

---

## 🔵 PRIORIDAD BAJA (Backlog)

### 13. Cerrar Caja desde POS

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días

**Tareas**:

- [ ] Crear `CloseCashSessionModal.tsx`
- [ ] Agregar conteo de efectivo
- [ ] Mostrar balance esperado vs. real
- [ ] Calcular diferencia
- [ ] Agregar campo de notas
- [ ] Integrar con `useCashMutations`
- [ ] Agregar validaciones
- [ ] Agregar tests

---

### 14. Ver Balance Actual de Caja

**Estado**: ⏳ Pendiente  
**Complejidad**: Baja  
**Tiempo estimado**: 1 día

**Tareas**:

- [ ] Crear `CashBalanceModal.tsx`
- [ ] Mostrar monto de apertura
- [ ] Mostrar ingresos totales
- [ ] Mostrar egresos totales
- [ ] Mostrar balance actual
- [ ] Mostrar últimos 5 movimientos
- [ ] Agregar botón en header
- [ ] Agregar tests

---

### 15. Historial de Movimientos Rápido

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días

**Tareas**:

- [ ] Crear `QuickMovementsModal.tsx`
- [ ] Mostrar últimos 20 movimientos
- [ ] Filtrar por tipo
- [ ] Búsqueda rápida
- [ ] Exportar a CSV
- [ ] Agregar paginación
- [ ] Agregar tests

---

### 16. Alertas de Caja Cerrada

**Estado**: ⏳ Pendiente  
**Complejidad**: Baja  
**Tiempo estimado**: 1 día

**Tareas**:

- [ ] Detectar intento de venta con caja cerrada
- [ ] Mostrar modal de advertencia
- [ ] Ofrecer abrir caja directamente
- [ ] Agregar configuración para deshabilitar alerta
- [ ] Agregar tests

---

### 17. Promociones Automáticas

**Estado**: ⏳ Pendiente  
**Complejidad**: Alta  
**Tiempo estimado**: 3 días

**Tareas**:

- [ ] Detectar promociones aplicables al carrito
- [ ] Aplicar descuentos automáticamente
- [ ] Mostrar badge de promoción en productos
- [ ] Mostrar resumen de promociones aplicadas
- [ ] Agregar tests

---

### 18. Historial de Ventas del Día

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días

**Tareas**:

- [ ] Crear `DailySalesModal.tsx`
- [ ] Mostrar ventas del día actual
- [ ] Mostrar total vendido
- [ ] Mostrar número de transacciones
- [ ] Mostrar ticket promedio
- [ ] Filtrar por método de pago
- [ ] Exportar a PDF/Excel
- [ ] Agregar tests

---

### 19. Envío de Recibo por SMS

**Estado**: ⏳ Pendiente  
**Complejidad**: Media  
**Tiempo estimado**: 2 días

**Tareas**:

- [ ] Integrar servicio de SMS (Twilio/AWS SNS)
- [ ] Agregar campo de teléfono en ProcessSaleModal
- [ ] Generar recibo en formato texto
- [ ] Enviar SMS al confirmar venta
- [ ] Agregar configuración de plantilla
- [ ] Agregar tests

---

### 20. Integración con Hardware

**Estado**: ⏳ Pendiente  
**Complejidad**: Alta  
**Tiempo estimado**: 5 días

**Tareas**:

- [ ] Integrar con impresora térmica
- [ ] Integrar con cajón de dinero
- [ ] Integrar con scanner de código de barras
- [ ] Integrar con lector de tarjetas
- [ ] Crear drivers/adaptadores
- [ ] Agregar configuración de dispositivos
- [ ] Agregar tests

---

### 21. Analytics Avanzado en Tiempo Real

**Estado**: ⏳ Pendiente  
**Complejidad**: Alta  
**Tiempo estimado**: 4 días

**Tareas**:

- [ ] Dashboard de métricas en tiempo real
- [ ] Ventas por hora del día
- [ ] Productos más vendidos
- [ ] Métodos de pago más usados
- [ ] Ticket promedio
- [ ] Gráficos interactivos
- [ ] Exportar reportes
- [ ] Agregar tests

---

## 📊 RESUMEN DE PROGRESO

### Por Prioridad

- 🔴 **Crítica**: 0/4 completadas (0%)
- 🟡 **Alta**: 0/4 completadas (0%)
- 🟢 **Media**: 1/4 completadas (25%)
- 🔵 **Baja**: 0/9 completadas (0%)

### Por Categoría

- **Refactoring**: 0/1 completadas (0%)
- **Testing**: 0/3 completadas (0%)
- **Seguridad**: 0/2 completadas (0%)
- **Accesibilidad**: 0/1 completadas (0%)
- **Rendimiento**: 0/2 completadas (0%)
- **UX/UI**: 1/5 completadas (20%)
- **Documentación**: 0/1 completadas (0%)
- **Features**: 0/6 completadas (0%)

### Total General

**1/21 tareas completadas (4.8%)**

---

## 🎯 OBJETIVOS POR SPRINT

### Sprint 1 (Semanas 1-2)

**Objetivo**: Mejorar mantenibilidad y testing  
**Tareas**: #1, #2, #3, #4  
**Meta**: Cobertura de tests 80%, ProcessSaleModal refactorizado

### Sprint 2 (Semanas 3-4)

**Objetivo**: Mejorar accesibilidad y rendimiento  
**Tareas**: #5, #6, #7, #8  
**Meta**: Accesibilidad 90%, Bundle -30%

### Sprint 3 (Semana 5)

**Objetivo**: Pulir UX y documentar  
**Tareas**: #9, #10, #11, #12  
**Meta**: Documentación completa, UX mejorada

---

## 📝 NOTAS

- Todas las tareas críticas deben completarse antes de la próxima release
- Los tests deben ejecutarse en CI/CD antes de merge a main
- Cada PR debe incluir tests para el código nuevo
- Documentar decisiones técnicas importantes en ADRs

---

**Última actualización**: 7 de febrero de 2026  
**Próxima revisión**: 14 de febrero de 2026
