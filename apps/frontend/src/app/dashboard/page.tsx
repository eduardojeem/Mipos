import { cookies } from 'next/headers';
import MainDashboard from '@/components/dashboard/MainDashboard';
import { fetchDashboardOverview } from '@/lib/dashboard/dashboard-data';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const organizationId = cookieStore.get('x-organization-id')?.value?.trim() || null;
  const initialData = organizationId
    ? await fetchDashboardOverview(organizationId).catch(() => null)
    : null;

  return <MainDashboard initialData={initialData} />;
}
