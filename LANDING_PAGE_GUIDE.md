# Guía de Inicio Rápido - Landing Page SaaS

## Para probar la landing page

1. **Iniciar el servidor de desarrollo**:
   ```bash
   cd apps/frontend
   npm run dev
   ```

2. **Acceder a la landing**:
   - Abrir navegador en `http://localhost:3001`
   - La página raíz (`/`) redirigirá automáticamente a `/inicio`

3. **Flujo de prueba**:
   - Scroll por las secciones (Hero, Cómo Funciona, Planes)
   - Click en "Negocios Asociados" en el header
   - Seleccionar un plan
   - Completar el formulario de registro
   - Verificar redirección a `/onboarding`
   - Click en "Ir al Dashboard"

## Estructura creada

```
apps/frontend/src/
├── app/
│   ├── inicio/                      # Landing page
│   │   ├── components/
│   │   │   ├── LandingHeader.tsx    # Header con login
│   │   │   ├── HeroSection.tsx      # Hero principal
│   │   │   ├── PricingSection.tsx   # Grid de planes
│   │   │   ├── PricingCard.tsx      # Tarjeta de plan
│   │   │   ├── HowItWorksSection.tsx
│   │   │   ├── RegistrationSection.tsx
│   │   │   ├── RegistrationForm.tsx # Formulario registro
│   │   │   ├── AssociatedBusinesses.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── index.ts
│   │   ├── landing.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── onboarding/
│   │   └── page.tsx                 # Página bienvenida
│   │
│   └── api/
│       ├── organizations/public/
│       │   └── route.ts             # GET: Negocios asociados
│       └── auth/register/
│           └── route.ts             # POST: Registro usuarios
```

## Customización

### Cambiar colores
Editar gradientes en `landing.css`:
```css
.gradient-pink-purple {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

### Agregar/modificar planes
Los planes se gestionan en Supabase:
```sql
-- Ver planes actuales
SELECT * FROM saas_plans WHERE is_active = true;

-- Agregar nuevo plan
INSERT INTO saas_plans (name, slug, price_monthly, price_yearly, features)
VALUES ('Nuevo Plan', 'nuevo', 99.00, 990.00, '["Feature 1", "Feature 2"]'::jsonb);
```

### Modificar textos
- Hero: `apps/frontend/src/app/inicio/components/HeroSection.tsx`
- Planes: directamente en la base de datos
- Footer: `apps/frontend/src/app/inicio/components/Footer.tsx`

## Próximos pasos sugeridos

1. **Agregar imágenes reales**
   - Reemplazar placeholders de logos
   - Agregar screenshots del producto

2. **Configurar emails**
   - Email de confirmación de registro
   - Email de bienvenida

3. **Optimizar SEO**
   - Completar meta tags
   - Agregar sitemap.xml
   - Configurar robots.txt

4. **Analytics**
   - Integrar Google Analytics
   - Tracking de conversiones

5. **Testing**
   - Probar en dispositivos móviles reales
   - Cross-browser testing
   - Performance optimization
