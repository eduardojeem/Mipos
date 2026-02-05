# Requirements: Audit Admin Settings for SaaS Multitenancy

## 1. Overview

**Feature Name**: audit-admin-settings-saas  
**Status**: Requirements Phase  
**Priority**: High  
**Created**: 2026-02-05

### Problem Statement
The `/admin/settings` section needs to be audited for SaaS multitenancy compliance. Currently, the settings page and its API endpoints may not properly isolate configuration data between organizations, which is critical for a multi-tenant SaaS application.

### Current Implementation Analysis
- **Frontend**: `/admin/settings/page.tsx` - Complex settings UI with multiple tabs (General, System, Security, Email, POS, Appearance)
- **API Endpoints**:
  - `/api/business-config` - Manages business configuration (GET/PUT)
  - `/api/user/settings` - Manages user-specific settings (GET/PUT)
  - `/api/system/settings` - System-level settings
- **Data Storage**:
  - `business_config` stored in `settings` table with key-value pattern
  - User settings stored in `user_settings` table
  - Uses `createAdminClient()` which bypasses RLS

### Key Concerns
1. **Global Configuration**: `business_config` appears to be global (not organization-scoped)
2. **Admin Client Usage**: Uses `createAdminClient()` which bypasses RLS policies
3. **No Organization Filtering**: Settings are not filtered by `organization_id`
4. **Shared Settings Table**: The `settings` table may be shared across all organizations

## 2. User Stories

### 2.1 As an Organization Admin
**I want to** configure my organization's settings independently  
**So that** my configuration doesn't affect or get affected by other organizations

**Acceptance Criteria**:
- Each organization has its own isolated business configuration
- Changes to settings only affect my organization
- I cannot see or modify settings from other organizations
- Settings are properly scoped by `organization_id`

### 2.2 As a Super Admin
**I want to** manage settings for any organization  
**So that** I can provide support and configure organizations as needed

**Acceptance Criteria**:
- Super admin can view settings for any organization
- Super admin can switch between organizations
- Super admin actions are properly audited
- Super admin cannot accidentally modify wrong organization's settings

### 2.3 As a Developer
**I want to** ensure settings data is properly isolated  
**So that** the system is secure and compliant with SaaS best practices

**Acceptance Criteria**:
- All settings queries filter by `organization_id`
- RLS policies enforce organization isolation
- No use of `createAdminClient()` for organization-scoped data
- Proper error handling for missing organization context

## 3. Functional Requirements

### 3.1 Business Configuration Multitenancy
- **FR-3.1.1**: System SHALL store business configuration per organization
- **FR-3.1.2**: System SHALL add `organization_id` column to relevant settings tables
- **FR-3.1.3**: System SHALL filter all business config queries by `organization_id`
- **FR-3.1.4**: System SHALL use `createClient()` instead of `createAdminClient()` for organization data

### 3.2 User Settings Isolation
- **FR-3.2.1**: User settings SHALL remain user-specific (not organization-scoped)
- **FR-3.2.2**: User settings SHALL include reference to user's current organization
- **FR-3.2.3**: System SHALL validate user belongs to organization before applying settings

### 3.3 API Endpoint Security
- **FR-3.3.1**: All settings endpoints SHALL use `assertAdmin` or `validateRole`
- **FR-3.3.2**: All endpoints SHALL extract and validate `organizationId`
- **FR-3.3.3**: All endpoints SHALL filter data by `organization_id`
- **FR-3.3.4**: Super admins SHALL be able to specify target organization via query param

### 3.4 Database Schema
- **FR-3.4.1**: `business_config` table SHALL have `organization_id` column (UUID, NOT NULL)
- **FR-3.4.2**: `settings` table SHALL have `organization_id` column for org-scoped settings
- **FR-3.4.3**: RLS policies SHALL enforce organization isolation
- **FR-3.4.4**: Indexes SHALL be created on `organization_id` columns

## 4. Non-Functional Requirements

### 4.1 Security
- **NFR-4.1.1**: No organization SHALL access another organization's settings
- **NFR-4.1.2**: All settings mutations SHALL be audited
- **NFR-4.1.3**: RLS policies SHALL be enabled on all settings tables
- **NFR-4.1.4**: Settings SHALL not be cached globally (only per-organization)

### 4.2 Performance
- **NFR-4.2.1**: Settings queries SHALL complete within 500ms
- **NFR-4.2.2**: Settings updates SHALL complete within 1 second
- **NFR-4.2.3**: Caching SHALL be organization-aware

### 4.3 Data Integrity
- **NFR-4.3.1**: Existing settings SHALL be migrated to organization-scoped model
- **NFR-4.3.2**: Default settings SHALL be created for new organizations
- **NFR-4.3.3**: Settings validation SHALL prevent invalid configurations

### 4.4 Usability
- **NFR-4.4.1**: UI SHALL clearly indicate which organization's settings are being edited
- **NFR-4.4.2**: Error messages SHALL be clear and actionable
- **NFR-4.4.3**: Settings changes SHALL provide immediate feedback

## 5. Technical Constraints

### 5.1 Technology Stack
- Next.js 14 App Router
- React 18
- Supabase (PostgreSQL)
- TypeScript
- Existing `assertAdmin` and `getUserOrganizationId` utilities

### 5.2 Database Tables
- `settings` - Key-value settings storage
- `business_config` - Business configuration (needs migration)
- `user_settings` - User-specific preferences
- `organizations` - Organization master table

### 5.3 Existing Patterns
- Must follow same pattern as `/admin` corrections (Task 7)
- Must use `createClient()` with RLS instead of `createAdminClient()`
- Must use `getUserOrganizationId()` helper
- Must support super admin organization override

## 6. Critical Issues Identified

### 6.1 CRITICAL: Global Business Config
**Issue**: `business_config` is stored globally in `settings` table without organization scope  
**Impact**: All organizations share the same configuration  
**Risk Level**: CRITICAL  
**Required Action**: Add organization_id to business_config storage model

### 6.2 CRITICAL: Admin Client Bypass
**Issue**: Uses `createAdminClient()` which bypasses RLS  
**Impact**: No database-level security enforcement  
**Risk Level**: CRITICAL  
**Required Action**: Replace with `createClient()` and proper filtering

### 6.3 HIGH: No Organization Context
**Issue**: Settings endpoints don't extract or validate organization_id  
**Impact**: Settings could be applied to wrong organization  
**Risk Level**: HIGH  
**Required Action**: Add organization validation to all endpoints

### 6.4 MEDIUM: In-Memory Global Cache
**Issue**: `g.__BUSINESS_CONFIG__` is global, not per-organization  
**Impact**: Settings leak between organizations in same process  
**Risk Level**: MEDIUM  
**Required Action**: Make cache organization-aware or remove it

## 7. Out of Scope

The following are explicitly out of scope for this audit:
- Redesigning the settings UI
- Adding new settings features
- Migrating to different storage backend
- Changing user settings model (already user-scoped)
- Performance optimization beyond basic indexing

## 8. Assumptions

- Organizations table exists and has proper structure
- Users are properly assigned to organizations via `organization_members`
- `assertAdmin` and `getUserOrganizationId` utilities work correctly
- Database supports UUID columns and RLS policies
- Existing settings data can be migrated or reset

## 9. Dependencies

### 9.1 External Dependencies
- Supabase service must be available
- Database must support RLS policies
- Migration scripts must be executable

### 9.2 Internal Dependencies
- `/app/api/_utils/auth.ts` - assertAdmin function
- `/app/api/_utils/organization.ts` - getUserOrganizationId function
- Previous multitenancy migrations (Task 7) must be applied
- `organizations` and `organization_members` tables must exist

## 10. Success Metrics

### 10.1 Primary Metrics
- 100% of settings queries filter by organization_id
- 0 uses of createAdminClient() for organization-scoped data
- All settings tables have RLS policies enabled
- All endpoints use proper authentication and authorization

### 10.2 Secondary Metrics
- Settings isolation verified through testing
- No cross-organization data leakage
- Audit logs capture all settings changes
- Performance remains acceptable (< 500ms queries)

## 11. Audit Checklist

### Database Schema
- [ ] Verify `settings` table structure
- [ ] Check if `organization_id` column exists
- [ ] Verify RLS policies on settings tables
- [ ] Check indexes on organization_id columns

### API Endpoints
- [ ] `/api/business-config` - Check organization filtering
- [ ] `/api/business-config/reset` - Check organization filtering
- [ ] `/api/user/settings` - Verify user-scoped (OK as-is)
- [ ] `/api/system/settings` - Check if organization-scoped

### Code Patterns
- [ ] Identify all `createAdminClient()` usage
- [ ] Verify `assertAdmin` usage in all endpoints
- [ ] Check `getUserOrganizationId()` usage
- [ ] Verify organization_id filtering in queries

### Data Isolation
- [ ] Test settings isolation between organizations
- [ ] Verify super admin can access any organization
- [ ] Test that regular admin cannot access other orgs
- [ ] Verify audit logging captures organization context

## 12. Migration Strategy

### 12.1 Database Migration
1. Add `organization_id` column to `settings` table (nullable initially)
2. Create migration script to assign existing settings to organizations
3. Make `organization_id` NOT NULL after migration
4. Create RLS policies for organization isolation
5. Create indexes on `organization_id`

### 12.2 Code Migration
1. Update `business-config.ts` utility to be organization-aware
2. Replace `createAdminClient()` with `createClient()`
3. Add organization_id extraction to all endpoints
4. Update queries to filter by organization_id
5. Update cache to be organization-scoped

### 12.3 Testing Strategy
1. Unit tests for organization isolation
2. Integration tests for API endpoints
3. Manual testing with multiple organizations
4. Super admin functionality testing
5. Performance testing with organization filtering

## 13. Next Steps

1. **Audit Phase**: Review all code and database schema
2. **Design Phase**: Create detailed design document with solutions
3. **Implementation Phase**: Apply fixes and migrations
4. **Testing Phase**: Verify multitenancy compliance
5. **Documentation Phase**: Update documentation

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-05  
**Status**: Ready for Review
