import type { createAdminClient } from "@/lib/supabase/server";
import { defaultBusinessConfig, type BusinessConfig } from "@/types/business-config";

export async function getOrderBusinessConfig(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
): Promise<BusinessConfig> {
  const { data, error } = await (supabase as any)
    .from("settings")
    .select("value")
    .eq("key", "business_config")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.warn("[orders] failed to load business config; using defaults", error);
    return defaultBusinessConfig;
  }

  const value = (data as { value?: Partial<BusinessConfig> } | null)?.value || {};
  return {
    ...defaultBusinessConfig,
    ...value,
    storeSettings: {
      ...defaultBusinessConfig.storeSettings,
      ...(value.storeSettings || {}),
    },
  };
}
