import React from 'react';
import { fetchSuperAdminData } from './utils/fetch-data';
import { SuperAdminClient } from './SuperAdminClient';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  let initialData;

  try {
    initialData = await fetchSuperAdminData();
  } catch (err) {
    // If server-side fetch fails (e.g. auth error, network), 
    // we simply don't pass initial data and let the client-side 
    // component handle the loading/error state via its own fetch.
    console.warn('Server-side data fetch failed, falling back to client-side fetch:', err);
  }

  return (
    <SuperAdminClient 
      initialOrganizations={initialData?.organizations} 
      initialStats={initialData?.stats} 
    />
  );
}
