'use client';

import React from 'react';
import { PermissionProvider } from '@/components/ui/permission-guard';
import SettingsPageContent from './components/SettingsPageContent';

export default function SettingsPage() {
  return (
    <PermissionProvider>
      <SettingsPageContent />
    </PermissionProvider>
  );
}
