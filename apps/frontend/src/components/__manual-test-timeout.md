# Manual Test: Fetch Timeout Handling

This document describes how to manually test the 15-second timeout functionality added to the patched fetch wrapper.

## Requirements Tested
- **7.1**: Request timeout after 15 seconds
- **7.2**: Proper cleanup of timeout timers  
- **7.3**: Timeout detection and logging

## Test Setup

The timeout handling is implemented in `apps/frontend/src/components/providers.tsx` and applies to all API calls (except health checks, auth endpoints, and permission checks).

## Test Scenarios

### Scenario 1: Timeout After 15 Seconds

**Steps:**
1. Open the browser DevTools Console
2. Navigate to any page that makes API calls (e.g., `/superadmin`)
3. In the Network tab, throttle the connection to "Slow 3G" or use a network proxy to delay responses
4. Trigger an API call (e.g., refresh the superadmin dashboard)
5. Wait for 15 seconds

**Expected Result:**
- After 15 seconds, you should see a warning log in the console:
  ```
  ⚠️ [FetchWrapper][timeout] Request timeout
  ```
- Followed by an error log:
  ```
  ❌ [FetchWrapper][timeoutAbort] Request aborted due to timeout
  ```
- The request should be aborted with an `AbortError`
- The loading overlay should disappear

### Scenario 2: Successful Request (No Timeout)

**Steps:**
1. Open the browser DevTools Console
2. Navigate to any page that makes API calls
3. Ensure normal network conditions
4. Trigger an API call

**Expected Result:**
- The request completes successfully before 15 seconds
- No timeout warnings or errors in the console
- The timeout timer is properly cleaned up (no memory leaks)

### Scenario 3: User Abort Before Timeout

**Steps:**
1. Open the browser DevTools Console
2. Navigate to a page that makes API calls
3. Trigger an API call
4. Immediately navigate away or close the tab (before 15 seconds)

**Expected Result:**
- The request is aborted by the user/browser
- You should see an info log (if the abort happens quickly):
  ```
  🔍 [FetchWrapper][userAbort] Request aborted by caller
  ```
- The timeout timer is properly cleaned up

### Scenario 4: Multiple Concurrent Requests

**Steps:**
1. Open the browser DevTools Console
2. Navigate to a page that makes multiple API calls simultaneously
3. Throttle the network to delay responses
4. Observe the behavior

**Expected Result:**
- Each request has its own independent 15-second timeout
- Timeouts are tracked separately for each request
- The loading state correctly reflects the number of active requests

## Verification Checklist

- [ ] Timeout occurs after exactly 15 seconds for slow requests
- [ ] Timeout warning is logged before abort
- [ ] Timeout error is logged with request details (URL, duration)
- [ ] Successful requests don't trigger timeout
- [ ] Timeout timers are cleaned up on success
- [ ] Timeout timers are cleaned up on error
- [ ] User aborts are distinguished from timeouts
- [ ] Multiple concurrent requests each have independent timeouts
- [ ] No memory leaks from uncleaned timers

## Implementation Details

The timeout implementation:
1. Creates an `AbortController` for each request
2. Sets a 15-second timeout using `setTimeout`
3. Merges the timeout signal with any user-provided abort signal
4. Clears the timeout on success, error, or abort
5. Logs timeout events with structured logging
6. Distinguishes timeout aborts from user aborts based on duration

## Code Location

- **Implementation**: `apps/frontend/src/components/providers.tsx` (lines ~80-200)
- **Tests**: `apps/frontend/src/components/providers.test.tsx`
- **Logger**: `apps/frontend/src/lib/logger.ts`
