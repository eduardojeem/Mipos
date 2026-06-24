import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import {
  LANDING_CONTENT_DEFAULTS,
  MARKETPLACE_CONTENT_DEFAULTS,
  LEGAL_CONTENT_DEFAULTS,
  type LandingContent,
  type MarketplaceContent,
  type LegalContent,
} from './types';

function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults } as T;
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const override = overrides[key];
    const def = defaults[key];
    if (
      override !== null &&
      override !== undefined &&
      typeof override === 'object' &&
      !Array.isArray(override) &&
      typeof def === 'object' &&
      !Array.isArray(def)
    ) {
      result[key] = deepMerge(
        def as Record<string, unknown>,
        override as Record<string, unknown>,
      ) as T[typeof key];
    } else if (override !== undefined) {
      result[key] = override as T[typeof key];
    }
  }
  return result;
}

export const getLandingContent = unstable_cache(
  async (): Promise<LandingContent> => {
    try {
      const client = await createAdminClient();
      const { data } = await client
        .from('system_settings')
        .select('value')
        .eq('key', 'landing_content')
        .single();

      if (data?.value && typeof data.value === 'object') {
        return deepMerge(
          LANDING_CONTENT_DEFAULTS as unknown as Record<string, unknown>,
          data.value as Record<string, unknown>,
        ) as unknown as LandingContent;
      }
    } catch {
      // Fall back to defaults if table doesn't have the key yet
    }
    return LANDING_CONTENT_DEFAULTS;
  },
  ['landing-content'],
  { revalidate: 300, tags: ['web-content', 'landing-content'] },
);

export const getMarketplaceContent = unstable_cache(
  async (): Promise<MarketplaceContent> => {
    try {
      const client = await createAdminClient();
      const { data } = await client
        .from('system_settings')
        .select('value')
        .eq('key', 'marketplace_content')
        .single();

      if (data?.value && typeof data.value === 'object') {
        return deepMerge(
          MARKETPLACE_CONTENT_DEFAULTS as unknown as Record<string, unknown>,
          data.value as Record<string, unknown>,
        ) as unknown as MarketplaceContent;
      }
    } catch {
      // Fall back to defaults if table doesn't have the key yet
    }
    return MARKETPLACE_CONTENT_DEFAULTS;
  },
  ['marketplace-content'],
  { revalidate: 300, tags: ['web-content', 'marketplace-content'] },
);

export const getLegalContent = unstable_cache(
  async (): Promise<LegalContent> => {
    try {
      const client = await createAdminClient();
      const { data } = await client
        .from('system_settings')
        .select('value')
        .eq('key', 'legal_content')
        .single();

      if (data?.value && typeof data.value === 'object') {
        return deepMerge(
          LEGAL_CONTENT_DEFAULTS as unknown as Record<string, unknown>,
          data.value as Record<string, unknown>,
        ) as unknown as LegalContent;
      }
    } catch {
      // Fall back to defaults if table doesn't have the key yet
    }
    return LEGAL_CONTENT_DEFAULTS;
  },
  ['legal-content'],
  { revalidate: 300, tags: ['web-content', 'legal-content'] },
);
