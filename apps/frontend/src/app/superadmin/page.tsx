import React from 'react';
import { SuperAdminClient } from './SuperAdminClient';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  return <SuperAdminClient />;
}
