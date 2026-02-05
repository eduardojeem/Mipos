# Design Document: Dashboard System Settings Multitenancy Fix

## Overview

This design addresses critical multitenancy compliance issues in the `/api/system/settings` endpoint. The endpoint currently queries the `business_config` table without organization context, creating data isolation vulnerabilities where any authenticated user can read and modify organization-wide business configuration.

The fix follows the proven pattern from the `/admin/settings` migration (score improved from 2.5/10 to 9.5/10), which migrated from the legacy `business_config` table to a new `settings` table with proper RLS policies and organization_id scoping.

**Key Changes:**
- Migrate from `business_config` table to `settings` table
- Add organization_id filtering to all queries
- Implement authentication and authorization checks
- Use RLS-enabled client instead of admin client
- Add per-organization caching with TTL
- Implement audit logging for configuration changes
- Validate configuration data before updates

## Architecture

### Current Architecture (Problematic)

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: /dashboard/settings                               │
│ - SystemTab.tsx calls /api/system/settings                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ API: /api/system/settings/route.ts                          │
│ ❌ No authentication check                                   │
│ ❌ No organization context extraction                        │
│ ❌ Queries business_config without organization_id          │
│ ❌ Uses .single() without org filter                        │
│ ❌ Upsert without organization_id                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Database: business_config table                             │
│ ❌ No organization_id column                                 │
│ ❌ Global singleton record (id=1)                           │
│ ❌ Shared across all organizations                          │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (Compliant)

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: /dashboard/settings                               │
│ - SystemTab.tsx calls /api/system/settings                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ API: /api/system/settings/route.ts                          │
│ ✅ assertAdmin() - verify authentication & role             │
│ ✅ getUserOrganizationId() - extract org context            │
│ ✅ Check per-org cache before DB query                      │
│ ✅ Query settings table with organization_id filter         │
│ ✅ Validate config data before update                       │
│ ✅ Update per-org cache after successful update             │
│ ✅ Log audit trail with organization context                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Database: settings table                                    │
│ ✅ Has organization_id column (FK to organizations)         │
│ ✅ Unique constraint on (organization_id, key)              │
│ ✅ RLS policies enforce organization isolation              │
│ ✅ Indexes on organization_id and (organization_id, key)    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**GET Request Flow:**
1. Request arrives at `/api/system/settings`
2. `assertAdmin()` verifies authentication and admin role
3. Extract `userId` from auth token
4. `getUserOrganizationId(userId)` retrieves organization_id
5. Check cache: `getCachedConfig(organizationId)`
6. If cache hit: return cached config
7. If cache miss: query `settings` table with `organization_id` and `key='business_config'`
8. If no record found: return `defaultBusinessConfig`
9. Store result in cache with 5-minute TTL
10. Return config to client

**PUT Request Flow:**
1. Request arrives at `/api/system/settings` with config data
2. `assertAdmin()` verifies authentication and admin role
3. Extract `userId` from auth token
4. `getUserOrganizationId(userId)` retrieves organization_id
5. Parse request body
6. `validateBusinessConfig()` validates config structure
7. If validation fails: return 400 with error details
8. Query current config for audit trail
9. Upsert to `settings` table with `organization_id` and `key='business_config'`
10. Update cache: `setCachedConfig(organizationId, newConfig)`
11. `logAudit()` records change with old/new values
12. Return success response

## Components and Interfaces

### API Endpoint: `/api/system/settings/route.ts`

**Responsibilities:**
- Handle GET and PUT requests for organization business configuration
- Enforce authentication and authorization
- Extract organization context from authenticated user
- Query/update settings table with organization_id filtering
- Manage per-organization cache
- Validate configuration data
- Log audit trail

**Dependencies:**
- `@/lib/supabase/server` - `createClient()` for RLS-enabled queries
- `@/app/api/_utils/auth` - `assertAdmin()` for authentication/authorization
- `@/app/api/_utils/organization` - `getUserOrganizationId()` for org context
- `@/app/api/admin/_utils/business-config-validation` - `validateBusinessConfig()` for validation
- `@/app/api/admin/_utils/audit` - `logAudit()` for audit logging
- `@/types/business-config` - `BusinessConfig` type and `defaultBusinessConfig`

**Interface:**

```typescript
// GET /api/system/settings
// Query params: organizationId (optional, super admin only)
// Returns: { success: true, config: BusinessConfig }
// Errors: 401 (not authenticated), 403 (not admin or no org), 500 (server error)

// PUT /api/system/settings
// Query params: organizationId (optional, super admin only)
// Body: BusinessConfig (partial or full)
// Returns: { success: true, config: BusinessConfig }
// Errors: 400 (validation failed), 401 (not authenticated), 403 (not admin or no org), 500 (server error)
```

### Authentication Utility: `assertAdmin()`

**Location:** `@/app/api/_utils/auth`

**Responsibilities:**
- Verify user is authenticated via Supabase session
- Check user has ADMIN or SUPER_ADMIN role
- Return user_id, organization_id, and isSuperAdmin flag
- Log authentication attempts for audit

**Interface:**

```typescript
function assertAdmin(request: NextRequest): Promise<
  | { ok: true; userId: string; organizationId: string | null; isSuperAdmin: boolean }
  | { ok: false; status: number; body: { error: string } }
>
```

### Organization Utility: `getUserOrganizationId()`

**Location:** `@/app/api/_utils/organization`

**Responsibilities:**
- Query `organization_members` table for user's organization
- Return organization_id or null if user has no organization

**Interface:**

```typescript
function getUserOrganizationId(userId: string): Promise<string | null>
```

### Validation Utility: `validateBusinessConfig()`

**Location:** `@/app/api/admin/_utils/business-config-validation`

**Responsibilities:**
- Validate BusinessConfig structure and field types
- Check required fields are present
- Validate field constraints (email format, phone format, numeric ranges, URL formats)
- Return validation result with error details

**Interface:**

```typescript
function validateBusinessConfig(cfg: BusinessConfig): 
  | { ok: true } 
  | { ok: false; errors: Record<string, string> }
```

### Audit Utility: `logAudit()`

**Location:** `@/app/api/admin/_utils/audit`

**Responsibilities:**
- Create audit log entries for configuration changes
- Store action type, entity type, entity ID, old/new data, user info

**Interface:**

```typescript
function logAudit(
  action: string,
  details: {
    entityType: string;
    entityId: string;
    oldData?: any;
    newData?: any;
  },
  user: {
    id: string;
    email: string;
    role: string;
  }
): Promise<void>
```

### Cache Management

**Responsibilities:**
- Store configuration per organization with TTL
- Reduce database queries for frequently accessed configs
- Invalidate cache on updates

**Implementation:**

```typescript
type CachedConfig = { config: BusinessConfig; expiresAt: number }
const configCache = new Map<string, CachedConfig>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedConfig(orgId: string): BusinessConfig | null
function setCachedConfig(orgId: string, config: BusinessConfig): void
```

## Data Models

### Settings Table

**Schema:**

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_org_key_unique UNIQUE(organization_id, key)
);
```

**Indexes:**
- `idx_settings_org_id` - Queries by organization
- `idx_settings_org_key` - Queries by organization + key (most common pattern)
- `idx_settings_key` - Queries by key

**RLS Policies:**
- `settings_read_tenant` - Users can read settings from their organizations
- `settings_insert_admin` - Admins can insert settings for their organizations
- `settings_update_admin` - Admins can update settings for their organizations
- `settings_delete_admin` - Admins can delete settings for their organizations

**Key for Business Config:** `'business_config'`

**Value Structure:** JSONB containing the full `BusinessConfig` object

### BusinessConfig Type

**Location:** `@/types/business-config.ts`

**Structure:** Complex nested object with sections for:
- Basic business information (name, tagline, hero content)
- Legal information (RUC, business type, tax regime)
- Contact information (phone, email, whatsapp, website)
- Address (street, neighborhood, city, department, country, map data)
- Social media links
- Business hours
- Branding (colors, logo, favicon)
- Store settings (currency, tax rate, payment methods, inventory tracking)
- System settings (backup, security, email configuration)
- Carousel configuration
- Notifications preferences
- Regional settings (timezone, date format, language)
- Metadata (createdAt, updatedAt)

**Default Configuration:** `defaultBusinessConfig` provides sensible defaults for Paraguay-based businesses

### Organization Members Table

**Schema:**

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role_id UUID REFERENCES roles(id),
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Usage:** Lookup table to map users to their organizations

### Cache Data Structure

**In-Memory Map:**

```typescript
Map<string, CachedConfig>
// Key: organization_id
// Value: { config: BusinessConfig, expiresAt: number }
```

**TTL:** 5 minutes (300,000 milliseconds)

**Eviction:** Automatic on expiration check, manual on update


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication and Organization Context Extraction

*For any* authenticated request to the System_Settings_API, the system should extract the user_id from the authentication token and retrieve the corresponding organization_id from the organization_members table, ensuring that users without organizations receive a 403 error.

**Validates: Requirements 1.1, 1.2, 1.3, 2.1**

### Property 2: Super Admin Organization Override

*For any* Super_Admin user making a request with an organizationId query parameter, the system should use the provided organization_id instead of the user's own organization_id, while for non-super-admin users, the query parameter should be ignored and their own organization_id should be used.

**Validates: Requirements 1.4, 1.5**

### Property 3: Admin Role Authorization

*For any* GET or PUT request to the System_Settings_API, the system should verify that the authenticated user has an admin role (ADMIN or SUPER_ADMIN), and reject requests from non-admin users with a 403 Forbidden error.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 4: Organization-Scoped Database Queries

*For any* query to the Settings_Table for business_config, the system should include both an organization_id filter and the key 'business_config' in the WHERE clause, use createClient() instead of createAdminClient(), and never use .single() without organization context.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6, 10.1**

### Property 5: Organization-Scoped Upsert Operations

*For any* upsert operation to the Settings_Table, the system should include organization_id in the upsert data and use the conflict resolution strategy `onConflict: 'organization_id,key'`, storing the configuration as JSONB in the 'value' column.

**Validates: Requirements 3.4, 3.5, 10.3**

### Property 6: Default Configuration Handling

*For any* query that returns no configuration record (PGRST116 error), the system should return the defaultBusinessConfig without creating a database record, and the default configuration should include currency='PYG', timezone='America/Asuncion', and language='es-PY'.

**Validates: Requirements 4.1, 4.3**

### Property 7: Cache-First Retrieval

*For any* GET request to the System_Settings_API, the system should check the per-organization cache (keyed by organization_id) before querying the database, and return cached values that have not expired (TTL < 5 minutes).

**Validates: Requirements 5.1, 5.3, 5.4**

### Property 8: Cache Population and Invalidation

*For any* configuration retrieved from the database, the system should store it in the cache with a 5-minute TTL, and when a PUT request successfully updates configuration, the system should update the cache for that organization_id.

**Validates: Requirements 5.2, 5.5**

### Property 9: Comprehensive Audit Logging

*For any* successful PUT request that updates configuration, the system should create an audit log entry with action type 'business_config.update', entityId set to organization_id, oldData containing the previous configuration, newData containing the new configuration, and user information (id, email, role).

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 10: Configuration Validation

*For any* PUT request with a configuration payload, the system should validate the request body against the BusinessConfig schema, checking that required fields are present and field types are correct, and return a 400 Bad Request error with validation errors if validation fails, or proceed with the database update if validation succeeds.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 11: Error Response Format

*For any* database query failure or unexpected exception, the system should return a 500 Internal Server Error with an appropriate error message, and all error responses should include an 'error' field in the JSON response body.

**Validates: Requirements 8.2, 8.3, 8.4**

### Property 12: Success Response Format

*For any* successful GET or PUT request, the system should return JSON with format `{ success: true, config: <BusinessConfig> }`, and for any failed request, the system should return JSON with format `{ error: <string> }` and appropriate HTTP status codes (200 for success, 400 for validation, 401 for auth, 403 for authorization, 500 for server errors).

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 13: Legacy Table Isolation

*For any* configuration operation (read or write), the system should query or update only the Settings_Table using the key 'business_config', and should never create new records in the Business_Config_Table.

**Validates: Requirements 10.2, 10.5**

## Error Handling

### Authentication Errors

**Scenario:** User is not authenticated
- **Response:** 401 Unauthorized
- **Body:** `{ error: "No autorizado" }`
- **Logging:** Audit log with reason 'no_user' or 'auth_error'

**Scenario:** User does not have admin role
- **Response:** 403 Forbidden
- **Body:** `{ error: "Acceso denegado" }` or `{ error: "Acceso denegado: se requiere rol de administrador" }`
- **Logging:** Audit log with reason 'role_not_allowed'

**Scenario:** User has no organization
- **Response:** 403 Forbidden
- **Body:** `{ error: "Usuario no pertenece a ninguna organización" }`
- **Logging:** Audit log with reason 'admin_without_org'

### Validation Errors

**Scenario:** Invalid configuration data
- **Response:** 400 Bad Request
- **Body:** `{ success: false, errors: { [field]: "error message", ... } }`
- **Examples:**
  - Missing business name: `{ "businessName": "El nombre del negocio es requerido" }`
  - Invalid email: `{ "contact.email": "Email inválido" }`
  - Invalid tax rate: `{ "storeSettings.taxRate": "IVA debe estar entre 0 y 1 (ej. 0.10)" }`

### Database Errors

**Scenario:** Database query fails (non-PGRST116)
- **Response:** 500 Internal Server Error
- **Body:** `{ error: "Error al obtener configuración" }` (GET) or `{ error: "Error al actualizar configuración" }` (PUT)
- **Logging:** Console error with error details

**Scenario:** No configuration found (PGRST116)
- **Response:** 200 OK
- **Body:** `{ success: true, config: defaultBusinessConfig }`
- **Behavior:** Return default configuration without creating database record

### Unexpected Errors

**Scenario:** Unhandled exception
- **Response:** 500 Internal Server Error
- **Body:** `{ error: <exception message> }` or `{ error: "Error interno del servidor" }`
- **Logging:** Console error with stack trace

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of valid and invalid configurations
- Edge cases (users without organizations, expired cache entries)
- Error conditions (authentication failures, validation failures, database errors)
- Integration points (auth utilities, organization utilities, validation utilities)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that must be maintained across all operations

Together, unit tests catch concrete bugs while property tests verify general correctness.

### Property-Based Testing Configuration

**Library:** Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `Feature: audit-dashboard-system-settings, Property {number}: {property_text}`

**Example Property Test Structure:**

```typescript
import fc from 'fast-check'

// Feature: audit-dashboard-system-settings, Property 4: Organization-Scoped Database Queries
test('all queries to settings table include organization_id filter', () => {
  fc.assert(
    fc.property(
      fc.uuid(), // organization_id
      fc.string(), // user_id
      async (organizationId, userId) => {
        // Setup: mock getUserOrganizationId to return organizationId
        // Execute: make GET request
        // Assert: verify query includes organization_id filter
        // Assert: verify query uses key='business_config'
        // Assert: verify createClient() was used, not createAdminClient()
      }
    ),
    { numRuns: 100 }
  )
})
```

### Unit Test Coverage

**Authentication and Authorization:**
- Test authenticated user with admin role → success
- Test unauthenticated user → 401 error
- Test authenticated user without admin role → 403 error
- Test admin user without organization → 403 error
- Test super admin with organizationId parameter → uses provided org
- Test regular admin with organizationId parameter → ignores parameter

**Configuration Retrieval:**
- Test GET with existing configuration → returns config
- Test GET with no configuration → returns default config
- Test GET with cached configuration → returns cached value without DB query
- Test GET with expired cache → queries database and updates cache

**Configuration Update:**
- Test PUT with valid configuration → updates database and cache
- Test PUT with invalid configuration → returns 400 with validation errors
- Test PUT creates audit log with old and new values
- Test PUT with missing required fields → validation error
- Test PUT with wrong field types → validation error

**Cache Management:**
- Test cache stores config with 5-minute TTL
- Test cache returns unexpired values
- Test cache evicts expired values
- Test cache updates on PUT

**Error Handling:**
- Test database error → 500 response
- Test validation error → 400 response with error details
- Test authentication error → 401 response
- Test authorization error → 403 response

### Integration Testing

**End-to-End Flows:**
1. Admin logs in → GET config → receives default config → PUT new config → GET config → receives updated config
2. Super admin queries org1 config → PUT update → queries org2 config → verifies isolation
3. Regular user attempts to access endpoint → receives 403 error
4. Admin from org1 attempts to query org2 with parameter → parameter ignored, receives org1 config

**Database Integration:**
- Verify RLS policies enforce organization isolation
- Verify unique constraint on (organization_id, key)
- Verify cascade delete when organization is deleted

**Cache Integration:**
- Verify cache reduces database queries
- Verify cache invalidation on updates
- Verify cache isolation between organizations
