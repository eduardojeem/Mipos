export function getOnboardingStorageKey(
  userId: string | null | undefined,
  organizationId: string
): string {
  return userId
    ? `onboarding_completed:${userId}:${organizationId}`
    : `onboarding_completed:${organizationId}`;
}

export function hasCompletedOnboarding(
  userId: string | null | undefined,
  organizationId: string
): boolean {
  if (typeof window === 'undefined' || !organizationId) {
    return false;
  }

  return localStorage.getItem(getOnboardingStorageKey(userId, organizationId)) === 'true';
}

export function markOnboardingCompleted(
  userId: string | null | undefined,
  organizationId: string
): void {
  if (typeof window === 'undefined' || !organizationId) {
    return;
  }

  localStorage.setItem(getOnboardingStorageKey(userId, organizationId), 'true');
}

export function clearOnboardingCompleted(
  userId: string | null | undefined,
  organizationId: string
): void {
  if (typeof window === 'undefined' || !organizationId) {
    return;
  }

  localStorage.removeItem(getOnboardingStorageKey(userId, organizationId));
}
