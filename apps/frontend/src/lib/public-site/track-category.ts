import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Incrementa view_count de una marketplace_category.
 * Llamado desde Server Components — no bloquea el render si falla.
 */
export async function trackCategoryView(slug: string): Promise<void> {
  try {
    const supabase = await createAdminClient()
    await (supabase as any).rpc('track_marketplace_category', {
      p_slug: slug,
      p_event: 'view',
    })
  } catch {
    // Silencioso — nunca romper el render de la página
  }
}
