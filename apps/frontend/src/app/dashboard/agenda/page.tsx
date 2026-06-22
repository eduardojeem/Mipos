'use client'

// La agenda del barbero reutiliza la misma pantalla que /admin/agenda, pero acá
// vive bajo /dashboard para que los barberos (rol CASHIER) accedan sin entrar al
// panel admin. Renderizamos el componente real (no un re-export de página) para
// que Next la registre y monte sin ambigüedades.
import AgendaPage from '@/app/admin/agenda/page'

export default function DashboardAgendaPage() {
  return <AgendaPage />
}
