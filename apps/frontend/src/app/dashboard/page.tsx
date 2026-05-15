import MainDashboard from '@/components/dashboard/MainDashboard';
import { fetchDashboardOverview } from '@/lib/dashboard/dashboard-data';
import { getValidatedOrganizationIdFromCookies } from '@/lib/organization';

export default async function DashboardPage() {
  const organizationId = await getValidatedOrganizationIdFromCookies();
  const initialData = organizationId
    ? await fetchDashboardOverview(organizationId).catch(() => null)
    : null;

  return <MainDashboard initialData={initialData} />;
}
