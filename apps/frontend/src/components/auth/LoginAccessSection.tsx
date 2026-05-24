import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Building2,
  KeyRound,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isValidTenantPathSegment } from '@/lib/domain/tenant-public-paths';

export type LoginAccessType =
  | 'saas-admin'
  | 'business-owner'
  | 'employee'
  | 'customer'
  | 'guest-order'
  | 'marketplace-business';

type LoginAccessTheme = 'dark' | 'light';

interface LoginAccessSectionProps {
  title?: string;
  description?: string;
  types: LoginAccessType[];
  theme?: LoginAccessTheme;
  returnUrl?: string;
  className?: string;
  compact?: boolean;
}

type LoginAccessItem = {
  type: LoginAccessType;
  title: string;
  eyebrow: string;
  description: string;
  cta: string;
  href: (returnUrl?: string) => string;
  icon: LucideIcon;
  accentClass: string;
};

function buildSigninHref(type: string, returnUrl?: string) {
  const params = new URLSearchParams({ type });
  let prefix = '';
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
    const [path] = returnUrl.split(/[?#]/, 1);
    const firstSegment = (path || '').split('/').filter(Boolean)[0];
    prefix = isValidTenantPathSegment(firstSegment) ? `/${firstSegment}` : '';
  }
  return `${prefix}/auth/signin?${params.toString()}`;
}

const LOGIN_ACCESS_ITEMS: Record<LoginAccessType, LoginAccessItem> = {
  'saas-admin': {
    type: 'saas-admin',
    title: 'Admin SaaS',
    eyebrow: 'Control global',
    description: 'Gestiona empresas, planes, soporte, usuarios globales y configuracion del sistema.',
    cta: 'Entrar como admin SaaS',
    href: () => buildSigninHref('saas-admin', '/superadmin'),
    icon: ShieldCheck,
    accentClass: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
  },
  'business-owner': {
    type: 'business-owner',
    title: 'Dueno o administrador',
    eyebrow: 'Panel del negocio',
    description: 'Accede a inventario, ventas, pedidos, sucursales, empleados y catalogo publico.',
    cta: 'Entrar al panel',
    href: () => buildSigninHref('business-owner', '/dashboard'),
    icon: Building2,
    accentClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  },
  employee: {
    type: 'employee',
    title: 'Empleado',
    eyebrow: 'Permisos por rol',
    description: 'Ingreso para cajeros, vendedores, inventario, repartidores o personal de sucursal.',
    cta: 'Entrar como empleado',
    href: () => buildSigninHref('employee', '/dashboard'),
    icon: UsersRound,
    accentClass: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  },
  customer: {
    type: 'customer',
    title: 'Cliente final',
    eyebrow: 'Historial y recompra',
    description: 'Edita tu perfil publico, guarda direccion predeterminada, consulta pedidos y compra como persona o empresa.',
    cta: 'Entrar a mi cuenta',
    href: (returnUrl) => buildSigninHref('customer', returnUrl || '/account'),
    icon: UserRound,
    accentClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  'guest-order': {
    type: 'guest-order',
    title: 'Comprar o consultar sin cuenta',
    eyebrow: 'Pedido invitado',
    description: 'Continua explorando, compra con tus datos de contacto o busca un pedido existente.',
    cta: 'Seguir sin login',
    href: (returnUrl) => returnUrl || '/home/catalogo',
    icon: ShoppingBag,
    accentClass: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  },
  'marketplace-business': {
    type: 'marketplace-business',
    title: 'Publicar mi negocio',
    eyebrow: 'Alta comercial',
    description: 'Crea tu empresa, elige un plan y conecta tu inventario al marketplace publico.',
    cta: 'Crear cuenta de negocio',
    href: () => '/inicio/planes',
    icon: Briefcase,
    accentClass: 'bg-teal-500/12 text-teal-700 dark:text-teal-300',
  },
};

export function LoginAccessSection({
  title = 'Accesos disponibles',
  description = 'Elige el acceso segun lo que necesitas hacer.',
  types,
  theme = 'light',
  returnUrl,
  className,
  compact = false,
}: LoginAccessSectionProps) {
  const isDark = theme === 'dark';
  const items = types.map((type) => LOGIN_ACCESS_ITEMS[type]);

  return (
    <section
      id="login"
      className={cn(
        compact ? 'py-10' : 'py-16 lg:py-20',
        isDark ? 'border-y border-white/10' : 'border-y border-slate-200 dark:border-slate-800',
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
              isDark
                ? 'border border-white/10 bg-white/5 text-slate-300'
                : 'border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Login por perfil
          </div>
          <h2 className={cn('mt-4 text-2xl font-semibold tracking-tight md:text-3xl', isDark ? 'text-white' : 'text-slate-950 dark:text-slate-50')}>
            {title}
          </h2>
          <p className={cn('mt-3 text-sm leading-6 md:text-base', isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400')}>
            {description}
          </p>
        </div>

        <div className={cn('grid gap-4', items.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.type}
                className={cn(
                  'rounded-lg border p-5',
                  isDark
                    ? 'border-white/10 bg-white/[0.04]'
                    : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', item.accentClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold uppercase tracking-[0.14em]', isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400')}>
                      {item.eyebrow}
                    </p>
                    <h3 className={cn('mt-1 text-base font-semibold', isDark ? 'text-white' : 'text-slate-950 dark:text-slate-50')}>
                      {item.title}
                    </h3>
                  </div>
                </div>
                <p className={cn('mt-4 min-h-[72px] text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400')}>
                  {item.description}
                </p>
                <Button
                  asChild
                  variant={isDark ? 'outline' : 'default'}
                  className={cn(
                    'mt-5 w-full rounded-lg',
                    isDark
                      ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white'
                  )}
                >
                  <Link href={item.href(returnUrl)}>
                    {item.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
