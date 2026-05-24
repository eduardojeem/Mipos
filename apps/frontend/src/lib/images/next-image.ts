export function shouldBypassNextImageOptimizer(src?: string | null): boolean {
  if (!src || src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
    return false;
  }

  try {
    const { hostname } = new URL(src);
    return hostname === 'images.unsplash.com' || hostname.endsWith('.unsplash.com');
  } catch {
    return false;
  }
}
