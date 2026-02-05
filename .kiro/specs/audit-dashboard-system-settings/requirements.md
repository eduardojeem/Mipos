# Requirements Document

## Introduction

This specification addresses critical multitenancy compliance issues in the `/dashboard/settings` section, specifically the System Settings API endpoint (`/api/system/settings`). The endpoint currently queries the `business_config` table without organization context, creating severe data isolation vulnerabilities in a SaaS multitenancy environment.

The `/admin/settings` section was recently audited and fixed (score improved from 2.5/10 to 9.5/10) by migrating to a new `settings` table with proper RLS policies. This specification applies the same proven pattern to fix the `/dashboard/settings` system settings endpoint.

## Glossary

- **System_Settings_API**: The API endpoint at `/api/system/settings` that handles organization business configuration
- **Business_Config_Table**: Legacy database table (`business_config`) that stores organization settings without proper multitenancy support
- **Settings_Table**: New database table (`settings`) with organization_id column and RLS policies for proper multitenancy
- **Organization_Context**: The organization_id associated with the authenticated user making the request
- **RLS**: Row Level Security - PostgreSQL security feature that filters data at the database level
- **Super_Admin**: User with role 'SUPER_ADMIN' who can access data across all organizations
- **Regular_Admin**: User with role 'ADMIN' who can only access their own organization's data
- **Regular_User**: Non-admin user who should not have access to organization-wide business configuration

## Requirements

### Requirement 1: Organization Context Extraction

**User Story:** As a system architect, I want all API requests to extract organization context from the authenticated user, so that data queries are properly scoped to the user's organization.

#### Acceptance Criteria

1. WHEN the System_Settings_API receives a request, THE System SHALL extract the user_id from the authentication token
2. WHEN a user_id is extracted, THE System SHALL query the organization_members table to retrieve the user's organization_id
3. IF a user does not belong to any organization, THEN THE System SHALL return a 403 Forbidden error with message "Usuario no pertenece a ninguna organización"
4. WHEN a Super_Admin makes a request with an organizationId query parameter, THE System SHALL use the provided organization_id instead of the user's organization
5. WHEN a Regular_Admin or Regular_User makes a request with an organizationId query parameter, THE System SHALL ignore the parameter and use their own organization_id

### Requirement 2: Authentication and Authorization

**User Story:** As a security engineer, I want the System_Settings_API to enforce proper authentication and authorization, so that only authorized users can access organization business configuration.

#### Acceptance Criteria

1. WHEN the System_Settings_API receives a request, THE System SHALL verify the user is authenticated
2. IF the user is not authenticated, THEN THE System SHALL return a 401 Unauthorized error
3. WHEN a GET request is made, THE System SHALL verify the user has admin role (ADMIN or SUPER_ADMIN)
4. WHEN a PUT request is made, THE System SHALL verify the user has admin role (ADMIN or SUPER_ADMIN)
5. IF the user does not have admin role, THEN THE System SHALL return a 403 Forbidden error with message "Acceso denegado: se requiere rol de administrador"

### Requirement 3: Database Query Multitenancy

**User Story:** As a data architect, I want all database queries to filter by organization_id, so that organizations cannot access each other's data.

#### Acceptance Criteria

1. WHEN querying the Settings_Table for business_config, THE System SHALL include an organization_id filter in the WHERE clause
2. WHEN querying the Settings_Table, THE System SHALL use the key 'business_config' to identify the configuration record
3. THE System SHALL NOT use `.single()` without organization_id context
4. WHEN upserting to the Settings_Table, THE System SHALL include organization_id in the upsert data
5. WHEN upserting to the Settings_Table, THE System SHALL use the conflict resolution strategy `onConflict: 'organization_id,key'`
6. THE System SHALL use `createClient()` (RLS-enabled) instead of `createAdminClient()` for all Settings_Table queries

### Requirement 4: Default Configuration Handling

**User Story:** As a product manager, I want organizations without existing configuration to receive sensible defaults, so that the system works correctly for new organizations.

#### Acceptance Criteria

1. WHEN a query returns no configuration record (PGRST116 error), THE System SHALL return the default business configuration
2. THE System SHALL define a default configuration object with all required fields populated
3. WHEN returning default configuration, THE System SHALL NOT create a database record automatically
4. THE default configuration SHALL include currency set to 'PYG', timezone set to 'America/Asuncion', and language set to 'es-PY'

### Requirement 5: Configuration Caching

**User Story:** As a performance engineer, I want configuration data to be cached per organization, so that repeated requests do not cause unnecessary database queries.

#### Acceptance Criteria

1. THE System SHALL maintain a cache of configuration data keyed by organization_id
2. WHEN a configuration is retrieved from the database, THE System SHALL store it in the cache with a 5-minute TTL
3. WHEN a GET request is made, THE System SHALL check the cache before querying the database
4. WHEN a cached configuration exists and has not expired, THE System SHALL return the cached value
5. WHEN a PUT request successfully updates configuration, THE System SHALL update the cache for that organization_id
6. WHEN a cached configuration expires, THE System SHALL remove it from the cache

### Requirement 6: Audit Logging

**User Story:** As a compliance officer, I want all configuration changes to be logged with organization context, so that we can track who changed what and when.

#### Acceptance Criteria

1. WHEN a PUT request successfully updates configuration, THE System SHALL create an audit log entry
2. THE audit log entry SHALL include the action type 'business_config.update'
3. THE audit log entry SHALL include the organization_id as the entityId
4. THE audit log entry SHALL include the previous configuration as oldData
5. THE audit log entry SHALL include the new configuration as newData
6. THE audit log entry SHALL include the user's id, email, and role

### Requirement 7: Configuration Validation

**User Story:** As a system administrator, I want invalid configuration data to be rejected, so that the system maintains data integrity.

#### Acceptance Criteria

1. WHEN a PUT request is received, THE System SHALL validate the request body against the BusinessConfig schema
2. IF validation fails, THEN THE System SHALL return a 400 Bad Request error with a list of validation errors
3. THE validation SHALL check that required fields are present
4. THE validation SHALL check that field types are correct (strings, numbers, booleans, objects)
5. IF validation succeeds, THEN THE System SHALL proceed with the database update

### Requirement 8: Error Handling

**User Story:** As a developer, I want clear error messages for different failure scenarios, so that I can debug issues quickly.

#### Acceptance Criteria

1. WHEN a database query fails with an error other than PGRST116, THE System SHALL log the error to the console
2. WHEN a database query fails, THE System SHALL return a 500 Internal Server Error with message "Error al obtener configuración" or "Error al actualizar configuración"
3. WHEN an unexpected exception occurs, THE System SHALL catch it and return a 500 error with the exception message
4. WHEN an error response is returned, THE System SHALL include an 'error' field in the JSON response body
5. THE System SHALL log all errors with sufficient context for debugging (error message, stack trace, request details)

### Requirement 9: Response Format Consistency

**User Story:** As a frontend developer, I want consistent response formats from the API, so that I can handle responses predictably.

#### Acceptance Criteria

1. WHEN a GET request succeeds, THE System SHALL return JSON with format `{ success: true, config: <BusinessConfig> }`
2. WHEN a PUT request succeeds, THE System SHALL return JSON with format `{ success: true, config: <BusinessConfig> }`
3. WHEN a request fails, THE System SHALL return JSON with format `{ error: <string> }`
4. THE System SHALL set appropriate HTTP status codes (200 for success, 400 for validation errors, 401 for auth errors, 403 for authorization errors, 500 for server errors)

### Requirement 10: Migration from Business_Config_Table

**User Story:** As a database administrator, I want to migrate from the legacy business_config table to the new settings table, so that all organization data uses the same multitenancy-compliant storage.

#### Acceptance Criteria

1. THE System SHALL query the Settings_Table instead of the Business_Config_Table
2. THE System SHALL use the key 'business_config' to store and retrieve configuration in the Settings_Table
3. THE System SHALL store configuration as JSONB in the 'value' column of the Settings_Table
4. THE migration SHALL be completed by the 20260205_create_settings_table.sql migration script
5. THE System SHALL NOT create new records in the Business_Config_Table
