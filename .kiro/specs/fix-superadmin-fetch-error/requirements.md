# Requirements Document

## Introduction

This specification addresses a "Failed to fetch" error occurring in the superadmin area of the application. The error manifests when the `useAdminData` hook attempts to fetch statistics from the `/api/superadmin/stats` endpoint. The fetch call is wrapped by a patched `window.fetch` implementation in `providers.tsx` that manages global loading states. This bug prevents superadmin users from accessing critical dashboard data and statistics.

## Glossary

- **Superadmin**: A user with elevated privileges who can manage organizations, users, and system-wide settings
- **useAdminData Hook**: A React hook located in `apps/frontend/src/app/superadmin/hooks/useAdminData.ts` that fetches and manages superadmin dashboard data
- **Patched Fetch**: A custom `window.fetch` wrapper in `apps/frontend/src/components/providers.tsx` that intercepts API calls to manage global loading states
- **Stats Endpoint**: The API route at `/api/superadmin/stats` that returns aggregated statistics about organizations, users, and revenue
- **Fetch Failure**: A network error that occurs when the browser's fetch API cannot complete a request, typically manifesting as "Failed to fetch" or "TypeError: Failed to fetch"
- **RLS**: Row Level Security - Supabase's security mechanism that restricts database access based on user permissions
- **Admin Client**: A Supabase client with elevated privileges that bypasses RLS for administrative operations

## Requirements

### Requirement 1: Diagnose Root Cause

**User Story:** As a developer, I want to identify the exact cause of the fetch failure, so that I can implement an appropriate fix.

#### Acceptance Criteria

1. WHEN the fetch error occurs, THE System SHALL log detailed diagnostic information including request URL, headers, timing, and error details
2. WHEN authentication fails, THE System SHALL log the authentication state and user session information
3. WHEN the API endpoint returns an error, THE System SHALL log the response status, headers, and body
4. WHEN network connectivity issues occur, THE System SHALL distinguish between network failures and API errors
5. THE System SHALL log the execution flow through the patched fetch wrapper to identify if the wrapper is causing issues

### Requirement 2: Implement Robust Error Handling

**User Story:** As a superadmin user, I want to see clear error messages when data fails to load, so that I understand what went wrong and what actions I can take.

#### Acceptance Criteria

1. WHEN a fetch request fails, THE System SHALL display a user-friendly error message that describes the problem
2. WHEN authentication fails, THE System SHALL display a message indicating the user needs to log in again
3. WHEN the API returns a 403 error, THE System SHALL display a message indicating insufficient permissions
4. WHEN a network error occurs, THE System SHALL display a message indicating connectivity issues
5. WHEN an unknown error occurs, THE System SHALL display a generic error message with an option to retry
6. THE Error_Display SHALL include actionable guidance (e.g., "Retry", "Check connection", "Contact support")

### Requirement 3: Add Request Retry Logic

**User Story:** As a superadmin user, I want the system to automatically retry failed requests, so that temporary network issues don't prevent me from accessing data.

#### Acceptance Criteria

1. WHEN a fetch request fails due to network issues, THE System SHALL automatically retry the request up to 3 times
2. WHEN retrying a request, THE System SHALL use exponential backoff with delays of 1s, 2s, and 4s
3. WHEN a request fails with a 4xx error (except 408 and 429), THE System SHALL NOT retry the request
4. WHEN a request fails with a 5xx error, THE System SHALL retry the request
5. WHEN all retry attempts are exhausted, THE System SHALL display the final error to the user
6. THE System SHALL log each retry attempt with timing information

### Requirement 4: Validate API Endpoint Accessibility

**User Story:** As a developer, I want to ensure the stats API endpoint is properly configured and accessible, so that fetch requests can succeed.

#### Acceptance Criteria

1. THE Stats_Endpoint SHALL respond to GET requests at `/api/superadmin/stats`
2. WHEN a superadmin user makes a request, THE Stats_Endpoint SHALL verify authentication and return data
3. WHEN an unauthenticated user makes a request, THE Stats_Endpoint SHALL return a 401 status code
4. WHEN a non-superadmin user makes a request, THE Stats_Endpoint SHALL return a 403 status code
5. THE Stats_Endpoint SHALL include appropriate CORS headers for same-origin requests
6. THE Stats_Endpoint SHALL respond within 10 seconds or return a timeout error

### Requirement 5: Fix Fetch Wrapper Interference

**User Story:** As a developer, I want to ensure the patched fetch wrapper doesn't interfere with API requests, so that all requests complete successfully.

#### Acceptance Criteria

1. WHEN the patched fetch wrapper encounters an error, THE System SHALL propagate the original error without modification
2. WHEN a request is aborted, THE System SHALL properly clean up loading states and not throw additional errors
3. WHEN multiple concurrent requests occur, THE System SHALL correctly track the active request count
4. WHEN the watchdog timer fires, THE System SHALL log a warning but not interfere with pending requests
5. THE Patched_Fetch SHALL preserve all original fetch behavior including headers, body, and response handling

### Requirement 6: Improve Authentication State Management

**User Story:** As a superadmin user, I want the system to handle authentication state correctly, so that I don't encounter permission errors when I'm properly authenticated.

#### Acceptance Criteria

1. WHEN a user's session expires, THE System SHALL detect the expired session before making API requests
2. WHEN authentication is invalid, THE System SHALL redirect the user to the login page
3. WHEN a user has valid authentication but insufficient permissions, THE System SHALL display a permission denied message
4. THE System SHALL verify superadmin permissions through the user_roles table, users table, and user metadata in that order
5. WHEN permission checks fail, THE System SHALL log which permission check method was attempted

### Requirement 7: Add Request Timeout Handling

**User Story:** As a superadmin user, I want requests to timeout gracefully if they take too long, so that the UI doesn't hang indefinitely.

#### Acceptance Criteria

1. WHEN a fetch request exceeds 15 seconds, THE System SHALL abort the request and display a timeout error
2. WHEN a request is aborted due to timeout, THE System SHALL clean up all associated resources
3. WHEN a timeout occurs, THE System SHALL log the request URL and duration
4. THE System SHALL allow users to manually retry timed-out requests
5. WHEN the component unmounts, THE System SHALL abort any pending requests

### Requirement 8: Validate Supabase Client Configuration

**User Story:** As a developer, I want to ensure Supabase clients are properly configured, so that database queries succeed.

#### Acceptance Criteria

1. THE Admin_Client SHALL successfully bypass RLS when querying organizations, users, and subscriptions
2. WHEN the admin client fails to initialize, THE System SHALL log the configuration error and return a 500 error
3. THE Regular_Client SHALL properly authenticate users before making requests
4. WHEN Supabase returns an error, THE System SHALL log the error code, message, details, and hint
5. THE System SHALL validate that required environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) are present

### Requirement 9: Add Comprehensive Logging

**User Story:** As a developer, I want detailed logs of the fetch lifecycle, so that I can debug issues quickly.

#### Acceptance Criteria

1. WHEN a fetch request starts, THE System SHALL log the request method, URL, and headers
2. WHEN a fetch request completes, THE System SHALL log the response status, duration, and data size
3. WHEN an error occurs, THE System SHALL log the error type, message, stack trace, and request context
4. THE System SHALL log authentication checks including user ID, email, and role verification results
5. THE System SHALL log database query results including row counts and error details
6. THE Logging_System SHALL use consistent prefixes (🔍, ✅, ❌, ⚠️) for easy filtering

### Requirement 10: Implement Graceful Degradation

**User Story:** As a superadmin user, I want the dashboard to remain functional even if some data fails to load, so that I can still access available information.

#### Acceptance Criteria

1. WHEN stats data fails to load, THE System SHALL display the organizations table with cached or empty data
2. WHEN organizations data fails to load, THE System SHALL display the stats with default values
3. WHEN both stats and organizations fail to load, THE System SHALL display an error state with a retry button
4. THE System SHALL cache the last successful data fetch and display it with a "stale data" indicator
5. WHEN partial data is available, THE System SHALL display the available data and indicate which sections failed to load

