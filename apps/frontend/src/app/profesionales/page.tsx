import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { normalizeVertical } from '@/config/verticals';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import SectionDisabledState from '@/components/public-tenant/SectionDisabledState';
import ProfesionalesClient, { type PublicProfessional } from './ProfesionalesClient';

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

type StaffRow = {
  id: string;
  user_id?: string | null;
  display_name?: string | null;
  specialty?: string | null;
  color?: string | null;
};

type WorkingHourRow = {
  staff_profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function formatTime(value: string | null | undefined) {
  return String(value || '').slice(0, 5);
}

function formatWorkingHour(row: WorkingHourRow) {
  const day = DAY_LABELS[row.day_of_week] || 'Dia';
  return `${day}: ${formatTime(row.start_time)} - ${formatTime(row.end_time)}`;
}

async function fetchPublicProfessionals(organizationId: string): Promise<PublicProfessional[]> {
  const admin = await createAdminClient();

  const { data: staffRows, error: staffError } = await (admin as any)
    .from('staff_profiles')
    .select('id,user_id,display_name,specialty,color')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (staffError) {
    throw new Error(staffError.message || 'No se pudieron cargar los profesionales');
  }

  const staff = (staffRows || []) as StaffRow[];
  if (!staff.length) return [];

  const userIds = staff.map((row) => row.user_id).filter(Boolean) as string[];
  const nameMap = new Map<string, string>();

  if (userIds.length) {
    const { data: users } = await (admin as any)
      .from('users')
      .select('id,full_name')
      .in('id', userIds);

    for (const user of (users || []) as Array<{ id: string; full_name?: string | null }>) {
      if (user.full_name) nameMap.set(user.id, user.full_name);
    }
  }

  const { data: hoursRows } = await (admin as any)
    .from('staff_working_hours')
    .select('staff_profile_id,day_of_week,start_time,end_time')
    .eq('organization_id', organizationId)
    .in('staff_profile_id', staff.map((row) => row.id))
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  const hoursByStaff = new Map<string, string[]>();
  for (const hour of (hoursRows || []) as WorkingHourRow[]) {
    const current = hoursByStaff.get(hour.staff_profile_id) || [];
    current.push(formatWorkingHour(hour));
    hoursByStaff.set(hour.staff_profile_id, current);
  }

  return staff.map((row) => ({
    id: row.id,
    name: row.display_name || (row.user_id ? nameMap.get(row.user_id) : null) || 'Profesional',
    specialty: row.specialty || 'Profesional de barberia',
    color: row.color || null,
    workingHours: hoursByStaff.get(row.id) || [],
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const context = await resolveRequestTenantContext();

  if (context.kind !== 'tenant') {
    return {
      title: 'Profesionales',
      description: 'Equipo profesional disponible.',
    };
  }

  const config = await getPublicBusinessConfig(context.organization);
  const businessName = config.businessName || context.organization.name || 'Barberia';

  return {
    title: `Profesionales | ${businessName}`,
    description: `Conoce el equipo de ${businessName} y reserva tu turno online.`,
    robots: { index: true, follow: true },
  };
}

export default async function ProfesionalesPage() {
  const context = await resolveRequestTenantContext();
  if (context.kind !== 'tenant') {
    notFound();
  }

  const config = await getPublicBusinessConfig(context.organization);
  const vertical = normalizeVertical(context.organization.vertical);

  if (vertical !== 'BARBERSHOP') {
    return (
      <StaticBusinessConfigProvider
        config={config}
        organizationId={context.organization.id}
        organizationName={context.organization.name}
      >
        <SectionDisabledState
          config={config}
          title="Profesionales no disponibles"
          description="Esta seccion esta pensada para barberias o peluquerias con agenda de turnos."
        />
      </StaticBusinessConfigProvider>
    );
  }

  const professionals = await fetchPublicProfessionals(context.organization.id);

  return (
    <StaticBusinessConfigProvider
      config={config}
      organizationId={context.organization.id}
      organizationName={context.organization.name}
    >
      <ProfesionalesClient professionals={professionals} />
    </StaticBusinessConfigProvider>
  );
}
