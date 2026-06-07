import { SuperAdminDiagnostic } from '../diagnostic';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DiagnosticPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <SuperAdminDiagnostic />;
}
