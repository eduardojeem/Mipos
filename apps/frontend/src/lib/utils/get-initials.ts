/**
 * Extract initials from a name (up to 2 characters).
 * Used across organization cards, carousels, and marketplace components.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
