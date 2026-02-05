# Design Document: Admin Settings SaaS Multitenancy

## 1. Overview

This design document provides detailed solutions for implementing proper multitenancy in the `/admin/settings` section. The goal is to ensure complete data isolation between organizations while maintaining functionality for both regular admins and super admins.

**Feature**: audit-admin-settings-saas  
**Status**: Design Phase  
**Priority**: High  
**Created**: 2026-02-05

## 2. Architecture Overview

### 2.1 Current Architecture (Problematic)

```
┌─────────────────┐
│  Admin UI       │
│  /admin/settings│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API: /api/business-config      │
│  Uses: createAdminClient()      │ ❌ Bypasses RLS
│  Storage: settings table        │
│  Key: 'business_config'         │
│  Scope: GLOBAL (no org_id)      │ ❌ Shared across orgs
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  In-Memory Cache                │
│  g.__BUSINESS_CONFIG__          │ ❌ Global cache
│  Shared across all orgs         │
└─────────────────────────────────┘
```

### 2.2 Target Architecture (Secure)

```
┌─────────────────┐
│  Admin UI       │
│  /admin/settings│
│  Shows: Org Name│ ✅ Context visible
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API: /api/business-config      │
│  Auth: assertAdmin()            │ ✅ Validates role
│  Extract: organizationId        │ ✅ Gets org context
│  Uses: createClient()           │ ✅ Respects RLS
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Database: settings table       │
│  Columns: key, value, org_id    │ ✅ Org-scoped
│  RLS: Filter by org_id          │ ✅ DB-level security
│  Index: (organization_id, key)  │ ✅ Performance
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Per-Org Cache (Optional)       │
│  Map<orgId, BusinessConfig>     │ ✅ Isolated cache
└─────────────────────────────────┘
```

## 3. Database Schema Changes

### 3.1 Settings Table Migration

**Current Schema:**
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Target Schema:**
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, key)  -- Unique per org
);

-- Index for performance
CREATE INDEX idx_settings_org_id ON settings(organization_id);
CREATE INDEX idx_settings_org_key ON settings(organization_id, key);
```

### 3.2 RLS Policies for Settings Table

```sql
-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Users can read settings from their organizations
CREATE POLICY "settings_read_tenant"
ON settings FOR SELECT
USING (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- Policy: Admins can insert settings for their organizations
CREATE POLICY "settings_insert_admin"
ON settings FOR INSERT
WITH CHECK (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- Policy: Admins can update settings for their organizations
CREATE POLICY "settings_update_admin"
ON settings FOR UPDATE
USING (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- Policy: Admins can delete settings for their organizations
CREATE POLICY "settings_delete_admin"
ON settings FOR DELETE
USING (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);
```

### 3.3 Data Migration Script

```sql
-- Migration: Add organization_id to settings table
-- Step 1: Add column as nullable
ALTER TABLE settings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Assign existing business_config to first organization (or default)
-- Option A: Assign to first organization
UPDATE settings
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE key = 'business_config' AND organization_id IS NULL;

-- Option B: Create copy for each organization
INSERT INTO settings (key, value, organization_id, created_at, updated_at)
SELECT 
  s.key,
  s.value,
  o.id as organization_id,
  NOW() as created_at,
  NOW() as updated_at
FROM settings s
CROSS JOIN organizations o
WHERE s.key = 'business_config' 
  AND s.organization_id IS NULL
  AND o.id != (SELECT id FROM organizations ORDER BY created_at LIMIT 1);

-- Step 3: Delete old global record
DELETE FROM settings WHERE key = 'business_config' AND organization_id IS NULL;

-- Step 4: Make organization_id NOT NULL
ALTER TABLE settings ALTER COLUMN organization_id SET NOT NULL;

-- Step 5: Drop old unique constraint and add new one
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE settings ADD CONSTRAINT settings_org_key_unique UNIQUE(organization_id, key);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_settings_org_id ON settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_org_key ON settings(organization_id, key);
```

## 4. API Endpoint Redesign

### 4.1 Business Config Route (`/api/business-config/route.ts`)

**Current Issues:**
- Uses `createAdminClient()` bypassing RLS
- No organization context extraction
- Global cache without organization scope
- Old assertAdmin format

**Solution:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getUserOrganizationId } from '@/app/api/_utils/organization'
import { validateBusinessConfig } from '@/app/api/admin/_utils/business-config'
import { logAudit } from '@/app/api/admin/_utils/audit'
import type { BusinessConfig } from '@/types/business-config'
import { defaultBusinessConfig } from '@/types/business-config'

// Per-organization cache with TTL
type CachedConfig = { config: BusinessConfig; expiresAt: number }
const configCache = new Map<string, CachedConfig>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedConfig(orgId: string): BusinessConfig | null {
  const cached = configCache.get(orgId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config
  }
  configCache.delete(orgId)
  return null
}

function setCachedConfig(orgId: string, config: BusinessConfig): void {
  configCache.set(orgId, {
    config,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export async function GET(request: NextRequest) {
  try {
    // ✅ Authentication and authorization
    const auth = await assertAdmin(request)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const userId = auth.userId as string
    const isSuperAdmin = auth.isSuperAdmin || false

    // ✅ Get organization context
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    
    let organizationId: string
    if (isSuperAdmin && orgFilter) {
      // Super admin can query any organization
      organizationId = orgFilter
    } else {
      // Regular admin gets their own organization
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Check cache first
    const cached = getCachedConfig(organizationId)
    if (cached) {
      return NextResponse.json({ success: true, config: cached })
    }

    // ✅ Query with RLS-enabled client
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching business config:', error)
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      )
    }

    // Return default config if not found
    const config = data?.value || defaultBusinessConfig
    setCachedConfig(organizationId, config)

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error('Error in GET /api/business-config:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ✅ Authentication and authorization
    const auth = await assertAdmin(request)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const userId = auth.userId as string
    const isSuperAdmin = auth.isSuperAdmin || false

    // ✅ Get organization context
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    
    let organizationId: string
    if (isSuperAdmin && orgFilter) {
      organizationId = orgFilter
    } else {
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateBusinessConfig(body)
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    // Get previous config for audit
    const supabase = await createClient()
    const { data: prevData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    const prevConfig = prevData?.value || null

    // ✅ Update with organization_id
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'business_config',
        value: body,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,key'
      })

    if (error) {
      console.error('Error updating business config:', error)
      return NextResponse.json(
        { error: 'Error al actualizar configuración' },
        { status: 500 }
      )
    }

    // Update cache
    setCachedConfig(organizationId, body)

    // Audit log
    await logAudit(
      'business_config.update',
      {
        entityType: 'BUSINESS_CONFIG',
        entityId: organizationId,
        oldData: prevConfig,
        newData: body
      },
      {
        id: userId,
        email: auth.userId,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'
      }
    )

    return NextResponse.json({ success: true, config: body })
  } catch (error: any) {
    console.error('Error in PUT /api/business-config:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### 4.2 Business Config Reset Route (`/api/business-config/reset/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getUserOrganizationId } from '@/app/api/_utils/organization'
import { defaultBusinessConfig } from '@/types/business-config'
import { logAudit } from '@/app/api/admin/_utils/audit'

export async function POST(request: NextRequest) {
  try {
    // ✅ Authentication and authorization
    const auth = await assertAdmin(request)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const userId = auth.userId as string
    const isSuperAdmin = auth.isSuperAdmin || false

    // ✅ Get organization context
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    
    let organizationId: string
    if (isSuperAdmin && orgFilter) {
      organizationId = orgFilter
    } else {
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Get current config for audit
    const supabase = await createClient()
    const { data: prevData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    const prevConfig = prevData?.value || null

    // ✅ Reset to defaults with organization_id
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'business_config',
        value: defaultBusinessConfig,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,key'
      })

    if (error) {
      console.error('Error resetting business config:', error)
      return NextResponse.json(
        { error: 'Error al restablecer configuración' },
        { status: 500 }
      )
    }

    // Audit log
    await logAudit(
      'business_config.reset',
      {
        entityType: 'BUSINESS_CONFIG',
        entityId: organizationId,
        oldData: prevConfig,
        newData: defaultBusinessConfig
      },
      {
        id: userId,
        email: auth.userId,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'
      }
    )

    return NextResponse.json({
      success: true,
      config: defaultBusinessConfig,
      message: 'Configuración restablecida a valores predeterminados'
    })
  } catch (error: any) {
    console.error('Error in POST /api/business-config/reset:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### 4.3 Business Config Utility Deprecation

**File**: `apps/frontend/src/app/api/admin/_utils/business-config.ts`

**Decision**: DEPRECATE this utility file

**Reasoning**:
- Global in-memory cache is incompatible with multitenancy
- `createAdminClient()` usage bypasses RLS
- Synchronous functions don't support organization context
- Better to handle directly in route handlers with proper context

**Migration Path**:
1. Move `validateBusinessConfig()` to a separate validation utility
2. Remove all cache-related functions
3. Remove `createAdminClient()` usage
4. Update all imports to use route handlers directly

## 5. Frontend Changes

### 5.1 Settings Page Header Enhancement

**File**: `apps/frontend/src/app/admin/settings/page.tsx`

**Changes**:
1. Display current organization name in header
2. Show organization context clearly
3. Add organization switcher for super admins (optional)

```typescript
// Add to component state
const [organizationName, setOrganizationName] = useState<string>('')
const [isSuperAdmin, setIsSuperAdmin] = useState(false)

// Fetch organization info on mount
useEffect(() => {
  async function fetchOrgInfo() {
    try {
      const response = await fetch('/api/user/profile')
      const data = await response.json()
      if (data.success) {
        setOrganizationName(data.organization?.name || 'Mi Organización')
        setIsSuperAdmin(data.role === 'SUPER_ADMIN')
      }
    } catch (error) {
      console.error('Error fetching org info:', error)
    }
  }
  fetchOrgInfo()
}, [])

// Update header to show organization
<motion.div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div className="space-y-1">
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg shadow-primary/20">
        <Settings className="w-6 h-6" />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Configuración
        </h1>
        {organizationName && (
          <p className="text-sm text-muted-foreground">
            {organizationName}
          </p>
        )}
      </div>
    </div>
  </div>
  {/* ... rest of header ... */}
</motion.div>
```

### 5.2 BusinessConfigContext Update

**File**: `apps/frontend/src/contexts/BusinessConfigContext.tsx`

**Changes**:
- Ensure API calls include organization context
- Handle organization-scoped caching
- Clear cache on organization switch (for super admins)

```typescript
// Update fetch to be organization-aware
const fetchConfig = async () => {
  try {
    const response = await fetch('/api/business-config')
    const data = await response.json()
    if (data.success) {
      setConfig(data.config)
    }
  } catch (error) {
    console.error('Error fetching business config:', error)
  }
}

// Update function remains the same - backend handles org context
const updateConfig = async (updates: Partial<BusinessConfig>) => {
  try {
    const response = await fetch('/api/business-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, ...updates })
    })
    const data = await response.json()
    if (data.success) {
      setConfig(data.config)
      return { persisted: true }
    }
    return { status: 'error', message: data.error }
  } catch (error) {
    return { status: 'error', message: (error as Error).message }
  }
}
```

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// Test: Organization isolation
describe('Business Config API', () => {
  it('should return config only for user organization', async () => {
    // Setup: Create 2 orgs with different configs
    // Test: User from org1 should only see org1 config
    // Assert: Cannot access org2 config
  })

  it('should prevent cross-organization updates', async () => {
    // Setup: User from org1 tries to update org2 config
    // Assert: Request is rejected with 403
  })

  it('should allow super admin to access any organization', async () => {
    // Setup: Super admin with organizationId query param
    // Assert: Can access specified organization's config
  })
})
```

### 6.2 Integration Tests

```typescript
// Test: End-to-end settings flow
describe('Settings Page Integration', () => {
  it('should load and save settings for correct organization', async () => {
    // 1. Login as admin of org1
    // 2. Navigate to /admin/settings
    // 3. Verify org1 name is displayed
    // 4. Change a setting
    // 5. Save
    // 6. Verify only org1 config was updated
    // 7. Login as admin of org2
    // 8. Verify org2 config is unchanged
  })
})
```

### 6.3 Manual Testing Checklist

- [ ] Create 2 test organizations
- [ ] Create admin user for each organization
- [ ] Login as org1 admin, change settings
- [ ] Verify org1 settings are saved
- [ ] Login as org2 admin
- [ ] Verify org2 has default/different settings
- [ ] Login as super admin
- [ ] Verify can access both organizations' settings
- [ ] Test organization switcher (if implemented)
- [ ] Verify audit logs capture organization context

## 7. Performance Considerations

### 7.1 Caching Strategy

**Per-Organization Cache**:
- Cache key: `${organizationId}:business_config`
- TTL: 5 minutes
- Invalidation: On update/reset
- Storage: In-memory Map (serverless-safe)

### 7.2 Database Indexes

```sql
-- Primary lookup: by organization and key
CREATE INDEX idx_settings_org_key ON settings(organization_id, key);

-- Organization-wide queries
CREATE INDEX idx_settings_org_id ON settings(organization_id);

-- Key-based lookups (less common)
CREATE INDEX idx_settings_key ON settings(key);
```

### 7.3 Query Optimization

- Use `.single()` for business_config queries (one per org)
- Leverage RLS for automatic filtering
- Cache frequently accessed configs
- Use connection pooling

## 8. Security Considerations

### 8.1 RLS Enforcement

- ✅ All settings tables have RLS enabled
- ✅ Policies check organization membership
- ✅ Super admin bypass is explicit and audited
- ✅ No direct table access without RLS

### 8.2 Audit Logging

All settings changes must be logged with:
- User ID and email
- Organization ID
- Action type (update/reset)
- Old and new values
- Timestamp
- IP address (optional)

### 8.3 Input Validation

- Validate all settings before saving
- Sanitize user inputs
- Check data types and ranges
- Prevent injection attacks
- Validate organization ownership

## 9. Migration Plan

### Phase 1: Database Migration (30 min)
1. Create backup of settings table
2. Run migration script to add organization_id
3. Assign existing configs to organizations
4. Enable RLS policies
5. Create indexes
6. Verify data integrity

### Phase 2: API Updates (1 hour)
1. Update `/api/business-config/route.ts`
2. Update `/api/business-config/reset/route.ts`
3. Deprecate `business-config.ts` utility
4. Update imports across codebase
5. Test API endpoints

### Phase 3: Frontend Updates (30 min)
1. Update settings page header
2. Update BusinessConfigContext
3. Test UI functionality
4. Verify organization display

### Phase 4: Testing (1 hour)
1. Run unit tests
2. Run integration tests
3. Manual testing with multiple orgs
4. Super admin testing
5. Performance testing

### Phase 5: Deployment (30 min)
1. Deploy database migration
2. Deploy API changes
3. Deploy frontend changes
4. Monitor for errors
5. Verify in production

**Total Estimated Time**: 3.5 hours

## 10. Rollback Plan

If issues are discovered:

1. **Database Rollback**:
   ```sql
   -- Remove RLS policies
   DROP POLICY IF EXISTS settings_read_tenant ON settings;
   DROP POLICY IF EXISTS settings_insert_admin ON settings;
   DROP POLICY IF EXISTS settings_update_admin ON settings;
   DROP POLICY IF EXISTS settings_delete_admin ON settings;
   
   -- Disable RLS
   ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
   
   -- Restore from backup if needed
   ```

2. **Code Rollback**:
   - Revert to previous commit
   - Redeploy previous version
   - Restore old utility functions

3. **Data Recovery**:
   - Restore settings from backup
   - Verify data integrity
   - Notify affected users

## 11. Success Criteria

### Must Have (P0)
- ✅ All settings queries filter by organization_id
- ✅ RLS policies enforce organization isolation
- ✅ No use of createAdminClient() for org-scoped data
- ✅ Settings page shows organization context
- ✅ Super admin can access any organization

### Should Have (P1)
- ✅ Per-organization caching
- ✅ Audit logging for all changes
- ✅ Migration script tested and verified
- ✅ Performance remains acceptable

### Nice to Have (P2)
- Organization switcher for super admins
- Settings comparison between organizations
- Bulk settings import/export
- Settings versioning/history

## 12. Correctness Properties

### Property 1: Organization Isolation
**Statement**: A user SHALL ONLY access settings for organizations they belong to

**Test Strategy**: Property-based test
```typescript
// For all users U and organizations O1, O2:
// IF U belongs to O1 AND U does not belong to O2
// THEN U can access O1 settings AND U cannot access O2 settings
```

**Validates**: Requirements 3.1.3, 3.3.2

### Property 2: Super Admin Override
**Statement**: A super admin SHALL access any organization's settings when organizationId is specified

**Test Strategy**: Example-based test
```typescript
// Given: Super admin user
// When: Request with organizationId=X
// Then: Returns settings for organization X
```

**Validates**: Requirements 2.2, 3.3.4

### Property 3: RLS Enforcement
**Statement**: Direct database queries SHALL respect organization boundaries

**Test Strategy**: Integration test
```typescript
// Given: Two organizations with different settings
// When: Query settings table directly with RLS enabled
// Then: Only returns settings for user's organizations
```

**Validates**: Requirements 3.1.4, 4.1.1, 4.1.3

### Property 4: Cache Isolation
**Statement**: Cached settings SHALL NOT leak between organizations

**Test Strategy**: Property-based test
```typescript
// For all organizations O1, O2:
// IF cache contains settings for O1
// THEN requesting settings for O2 SHALL NOT return O1's cached data
```

**Validates**: Requirements 4.1.4, 4.2.3

### Property 5: Audit Completeness
**Statement**: All settings mutations SHALL be logged with organization context

**Test Strategy**: Property-based test
```typescript
// For all settings updates:
// WHEN settings are modified
// THEN audit log SHALL contain: userId, organizationId, oldValue, newValue, timestamp
```

**Validates**: Requirements 4.1.2

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-05  
**Status**: Ready for Implementation
