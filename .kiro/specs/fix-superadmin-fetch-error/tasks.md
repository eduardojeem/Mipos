# Implementation Plan: Fix Superadmin Fetch Error

## Overview

This implementation plan addresses the "Failed to fetch" error in the superadmin area by implementing comprehensive error handling, retry logic with exponential backoff, enhanced diagnostics, and graceful degradation. The implementation is structured to build incrementally, with early validation through property-based tests and unit tests.

## Tasks

- [x] 1. Create utility modules for retry logic and logging
  - [x] 1.1 Create fetch retry utility with exponential backoff
    - Create `apps/frontend/src/lib/fetch-retry.ts`
    - Implement `fetchWithRetry` function with configurable retry options
    - Implement `calculateExponentialBackoff` helper function
    - Implement `isRetryableError` function to determine if errors should be retried
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 1.2 Write property tests for retry logic
    - **Property 8: Network Error Retry** - verify exactly 3 retry attempts for network errors
    - **Property 9: Exponential Backoff** - verify delays of 1s, 2s, 4s between retries
    - **Property 10: Client Error No-Retry** - verify 4xx errors (except 408, 429) don't retry
    - **Property 11: Server Error Retry** - verify 5xx errors trigger retries
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 1.3 Create structured logging utility
    - Create `apps/frontend/src/lib/logger.ts`
    - Implement `StructuredLogger` class with info, warn, error, debug methods
    - Add consistent emoji prefixes (🔍, ✅, ❌, ⚠️) for log filtering
    - _Requirements: 9.1, 9.2, 9.3, 9.6_
  
  - [ ]* 1.4 Write property tests for logging
    - **Property 5: Consistent Log Formatting** - verify all logs use correct prefixes
    - _Requirements: 9.6_

- [-] 2. Enhance the fetch wrapper in providers.tsx
  - [x] 2.1 Add timeout handling to patched fetch
    - Implement 15-second timeout using AbortController
    - Add timeout detection and logging
    - Ensure proper cleanup of timeout timers
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 2.2 Integrate retry logic into patched fetch
    - Wrap fetch calls with `fetchWithRetry`
    - Configure retry options (max 3 attempts, exponential backoff)
    - Add retry attempt logging
    - _Requirements: 3.1, 3.2, 3.6_
  
  - [x] 2.3 Improve error propagation and logging
    - Add comprehensive request lifecycle logging (start, success, error)
    - Log request method, URL, headers, timing, and response details
    - Ensure original errors are propagated without modification
    - _Requirements: 1.1, 1.3, 1.5, 5.1, 9.1, 9.2, 9.3_
  
  - [x] 2.4 Fix concurrent request tracking
    - Review and fix active request counter logic
    - Ensure proper increment/decrement for all code paths
    - Add logging for request count changes
    - _Requirements: 5.3_
  
  - [x] 2.5 Improve abort and cleanup handling
    - Ensure loading states are cleaned up on abort
    - Prevent additional errors from being thrown during cleanup
    - Fix watchdog timer to log warnings without interfering with requests
    - _Requirements: 5.2, 5.4_
  
  - [ ]* 2.6 Write property tests for fetch wrapper
    - **Property 15: Fetch Behavior Preservation** - verify patched fetch preserves original behavior
    - **Property 16: Concurrent Request Tracking** - verify correct tracking of concurrent requests
    - **Property 17: Abort Cleanup** - verify proper cleanup on abort
    - **Property 18: Watchdog Non-Interference** - verify watchdog doesn't interfere with requests
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Create error classification and display components
  - [x] 3.1 Create error state types and classification utility
    - Create `apps/frontend/src/types/error-state.ts` with ErrorState interface
    - Implement `classifyError` function to categorize errors
    - Map error types to user-friendly messages and actions
    - _Requirements: 1.4, 2.1_
  
  - [x] 3.2 Create ErrorDisplay component
    - Create `apps/frontend/src/app/superadmin/components/ErrorDisplay.tsx`
    - Display error icon, title, message, and actionable buttons
    - Support different error types (network, auth, permission, timeout, server, unknown)
    - Include stale data warning when showing cached data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 3.3 Write property tests for error classification
    - **Property 7: Error Classification** - verify correct classification of all error types
    - _Requirements: 1.4_
  
  - [ ]* 3.4 Write unit tests for ErrorDisplay component
    - Test rendering for each error type
    - Test action buttons (Retry, Log In, Contact Support, Dismiss)
    - Test stale data warning display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Implement data caching mechanism
  - [x] 4.1 Create cache utility for admin data
    - Create `apps/frontend/src/lib/admin-data-cache.ts`
    - Implement functions to save/load cached data from localStorage
    - Add cache versioning for invalidation
    - Add staleness detection based on timestamp
    - _Requirements: 10.4_
  
  - [ ]* 4.2 Write property tests for caching
    - **Property 22: Data Caching** - verify successful fetches are cached with timestamps
    - _Requirements: 10.4_

- [x] 5. Enhance useAdminData hook with error handling and caching
  - [x] 5.1 Add structured error state to useAdminData
    - Replace simple error string with ErrorState object
    - Implement error classification in catch blocks
    - Add clearError function
    - _Requirements: 2.1, 1.4_
  
  - [x] 5.2 Integrate caching into useAdminData
    - Load cached data on initialization
    - Save successful fetches to cache
    - Display cached data when fresh data fails
    - Add isStale indicator to cached data
    - _Requirements: 10.4_
  
  - [x] 5.3 Implement graceful degradation for partial failures
    - Handle stats fetch failure independently from organizations fetch
    - Display available data even if one source fails
    - Add indicators for which sections failed
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [x] 5.4 Add comprehensive logging to useAdminData
    - Log fetch lifecycle (start, success, error)
    - Log authentication checks with user info
    - Log database query results and errors
    - Log retry attempts
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 5.5 Implement proper cleanup on unmount
    - Abort pending requests when component unmounts
    - Clean up timers and abort controllers
    - _Requirements: 7.5_
  
  - [ ]* 5.6 Write property tests for useAdminData
    - **Property 1: Comprehensive Request Logging** - verify complete request lifecycle logging
    - **Property 2: Error Context Logging** - verify error details are logged
    - **Property 12: Exhausted Retries Error Display** - verify error display after retries fail
    - **Property 13: Request Timeout and Cleanup** - verify timeout handling and cleanup
    - **Property 14: Component Unmount Cleanup** - verify cleanup on unmount
    - **Property 23: Partial Data Display** - verify partial data is displayed correctly
    - _Requirements: 1.1, 1.3, 3.5, 7.1, 7.2, 7.3, 7.5, 10.5_
  
  - [ ]* 5.7 Write unit tests for useAdminData
    - Test successful data fetch and state updates
    - Test error handling for each error type
    - Test cached data fallback
    - Test partial data scenarios
    - Test manual refresh functionality
    - _Requirements: 2.1, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 6. Enhance API endpoint error handling and logging
  - [x] 6.1 Add comprehensive logging to stats API endpoint
    - Log authentication checks with user ID, email, role
    - Log permission verification attempts and results
    - Log database queries with row counts and errors
    - Log Supabase errors with code, message, details, hint
    - _Requirements: 1.2, 6.5, 8.4, 9.4, 9.5_
  
  - [x] 6.2 Improve permission check sequence
    - Ensure checks occur in order: user_roles → users → metadata
    - Log which method was attempted for each check
    - _Requirements: 6.4, 6.5_
  
  - [x] 6.3 Add environment variable validation
    - Check for required Supabase environment variables on startup
    - Log configuration errors if variables are missing
    - _Requirements: 8.5_
  
  - [ ]* 6.4 Write property tests for API endpoint
    - **Property 3: Authentication Logging** - verify auth checks are logged
    - **Property 4: Database Query Logging** - verify query results are logged
    - **Property 19: Permission Check Sequence** - verify checks occur in correct order
    - **Property 20: Admin Client RLS Bypass** - verify admin client bypasses RLS
    - **Property 21: Regular Client Authentication** - verify regular client checks auth
    - _Requirements: 1.2, 6.4, 6.5, 8.1, 8.3, 8.4, 9.4, 9.5_
  
  - [ ]* 6.5 Write unit tests for API endpoint
    - Test successful response for superadmin user
    - Test 401 response for unauthenticated user
    - Test 403 response for non-superadmin user
    - Test error handling for Supabase failures
    - Test environment variable validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.2, 8.5_

- [ ] 7. Integrate ErrorDisplay into superadmin pages
  - [ ] 7.1 Update superadmin dashboard page to use ErrorDisplay
    - Import and use ErrorDisplay component
    - Pass error state and retry handler
    - Show cached data warning when applicable
    - _Requirements: 2.1, 2.6_
  
  - [ ] 7.2 Add error handling to other superadmin pages
    - Update organizations, users, and other pages to use ErrorDisplay
    - Ensure consistent error handling across all pages
    - _Requirements: 2.1, 2.6_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Run all property-based tests and unit tests
  - Verify error handling works for all error types
  - Test retry logic with simulated failures
  - Test caching and graceful degradation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Manual testing and validation
  - [ ] 9.1 Test with network disconnection
    - Disconnect network and verify error message
    - Verify cached data is displayed
    - Verify retry works after reconnecting
    - _Requirements: 2.4, 10.4_
  
  - [ ] 9.2 Test with expired session
    - Expire session and verify redirect to login
    - Verify appropriate error message
    - _Requirements: 2.2, 6.1, 6.2_
  
  - [ ] 9.3 Test with non-superadmin user
    - Login as regular user and access superadmin area
    - Verify 403 error and permission message
    - _Requirements: 2.3, 4.4_
  
  - [ ] 9.4 Test timeout scenarios
    - Simulate slow API responses
    - Verify timeout after 15 seconds
    - Verify timeout error message and retry option
    - _Requirements: 7.1, 7.4_
  
  - [ ] 9.5 Test concurrent requests
    - Open multiple superadmin tabs
    - Verify loading states work correctly
    - Verify no race conditions or state corruption
    - _Requirements: 5.3_

- [ ] 10. Final checkpoint - Comprehensive validation
  - Verify all 23 correctness properties are tested
  - Verify all error types display correctly
  - Verify retry logic works as expected
  - Verify caching and graceful degradation work
  - Verify logging provides useful debugging information
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally: utilities → fetch wrapper → error handling → caching → integration
