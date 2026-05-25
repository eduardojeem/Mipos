import { redirect } from 'next/navigation';

export default function MaintenanceRedirectPage() {
  redirect('/superadmin/maintenance');
}
