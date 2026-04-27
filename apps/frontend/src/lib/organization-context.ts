export function getSelectedOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  const readCookie = () => {
    const cookieMatch = document.cookie.match(/(?:^|; )x-organization-id=([^;]*)/);
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  };
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return readCookie();
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      const id = parsed?.id || parsed?.organization_id || parsed?.orgId || null;
      return id ? String(id).trim() : readCookie();
    }
    // Plain string — treat as ID directly
    const trimmed = raw.trim();
    return trimmed || readCookie();
  } catch {
    return readCookie();
  }
}

export function getSelectedOrganizationName(): string | null {
  if (typeof window === 'undefined') return null;
  const readCookie = () => {
    const cookieMatch = document.cookie.match(/(?:^|; )x-organization-name=([^;]*)/);
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  };
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw || !raw.startsWith('{')) return readCookie();
    const parsed = JSON.parse(raw);
    return parsed?.name || readCookie();
  } catch {
    return readCookie();
  }
}
