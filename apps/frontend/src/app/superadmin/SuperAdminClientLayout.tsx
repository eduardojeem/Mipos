"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  CreditCard,
  Crown,
  FileText,
  LogOut,
  LayoutDashboard,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminThemeToggle } from "./components/SuperAdminThemeToggle";
import { useSuperAdminPrefetch } from "./hooks/usePrefetch";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

interface NavChild {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
  section: "overview" | "tenants" | "billing" | "system";
  children?: NavChild[];
}

// ─── Secciones ────────────────────────────────────────────────────────────────
const SECTION_LABELS: Record<NavItem["section"], string> = {
  overview: "Visión general",
  tenants:  "Tenants",
  billing:  "Facturación",
  system:   "Sistema",
};

const SECTION_ORDER: NavItem["section"][] = [
  "overview",
  "tenants",
  "billing",
  "system",
];

// ─── Navegación ───────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  // ── Visión general ──────────────────────────────────────────────────────────
  {
    title: "Dashboard",
    href: "/superadmin",
    icon: BarChart3,
    description: "Métricas globales del sistema",
    section: "overview",
  },

  // ── Tenants ─────────────────────────────────────────────────────────────────
  {
    title: "Organizaciones",
    href: "/superadmin/organizations",
    icon: Building2,
    description: "Clientes y tenants del sistema",
    section: "tenants",
    children: [
      {
        title: "Todas las organizaciones",
        href: "/superadmin/organizations",
        icon: Building2,
        description: "Listado completo de tenants",
      },
      {
        title: "Nueva organización",
        href: "/superadmin/organizations/create",
        icon: Plus,
        description: "Crear un nuevo tenant",
      },
    ],
  },
  {
    title: "Usuarios",
    href: "/superadmin/users",
    icon: Users,
    description: "Usuarios de todo el sistema",
    section: "tenants",
    children: [
      {
        title: "Todos los usuarios",
        href: "/superadmin/users",
        icon: Users,
        description: "Lista global de usuarios",
      },
      {
        title: "Super admins",
        href: "/superadmin/users/super-admins",
        icon: Crown,
        description: "Usuarios con acceso total",
      },
    ],
  },

  // ── Facturación ─────────────────────────────────────────────────────────────
  {
    title: "Planes",
    href: "/superadmin/plans",
    icon: Sparkles,
    badge: "SaaS",
    description: "Planes, límites y paquetes",
    section: "billing",
  },
  {
    title: "Suscripciones",
    href: "/superadmin/subscriptions",
    icon: CreditCard,
    description: "Suscripciones activas por tenant",
    section: "billing",
  },
  {
    title: "Facturas",
    href: "/superadmin/invoices",
    icon: FileText,
    description: "Historial de facturación",
    section: "billing",
  },

  // ── Sistema ─────────────────────────────────────────────────────────────────
  {
    title: "Monitoreo",
    href: "/superadmin/monitoring",
    icon: Activity,
    badge: "Live",
    description: "Salud, rendimiento y conexiones",
    section: "system",
  },
  {
    title: "Audit Logs",
    href: "/superadmin/audit-logs",
    icon: Shield,
    description: "Registro de auditoría y trazabilidad",
    section: "system",
  },
  {
    title: "Plantillas de Email",
    href: "/superadmin/emails",
    icon: Mail,
    description: "Correos transaccionales del sistema",
    section: "system",
  },
  {
    title: "Configuración",
    href: "/superadmin/settings",
    icon: Settings,
    description: "Parámetros globales del sistema",
    section: "system",
  },

];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isItemActive(pathname: string, item: NavItem | NavChild): boolean {
  if (item.href === "/superadmin") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getActiveItem(pathname: string): NavItem | NavChild | undefined {
  const all: Array<NavItem | NavChild> = NAV_ITEMS.flatMap((item) => [
    item,
    ...(item.children ?? []),
  ]);
  return all
    .filter((item) => isItemActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SuperAdminClientLayout({ children }: SuperAdminLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/superadmin";

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("sa_sidebar_collapsed") === "1"; } catch { return false; }
  });

  useSuperAdminPrefetch();

  // Redirigir si no hay sesión
  useEffect(() => {
    if (!user) router.push("/auth/signin");
  }, [user, router]);

  // Auto-expandir sección activa al cambiar de ruta
  useEffect(() => {
    const parents = NAV_ITEMS
      .filter((item) => item.children?.some((child) => isItemActive(pathname, child)))
      .map((item) => item.title);
    if (!parents.length) return;
    setExpandedItems((prev) => {
      const next = new Set(prev);
      parents.forEach((t) => next.add(t));
      return next;
    });
  }, [pathname]);

  // Persistir estado expandido
  useEffect(() => {
    try { window.localStorage.setItem("sa_sidebar_expanded", JSON.stringify([...expandedItems])); } catch {}
  }, [expandedItems]);

  // Restaurar estado expandido
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sa_sidebar_expanded");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setExpandedItems(new Set(parsed.filter((v) => typeof v === "string")));
    } catch {}
  }, []);

  // Persistir colapso
  useEffect(() => {
    try { window.localStorage.setItem("sa_sidebar_collapsed", isCollapsed ? "1" : "0"); } catch {}
  }, [isCollapsed]);

  const activeItem = useMemo(() => getActiveItem(pathname), [pathname]);

  const toggleExpanded = (title: string) =>
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });

  const navigate = (href: string, closeMobile = false) => {
    router.push(href);
    if (closeMobile) setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  // ─── Sidebar ────────────────────────────────────────────────────────────────
  const renderSidebar = (mode: "desktop" | "mobile") => {
    const collapsed = mode === "desktop" && isCollapsed;

    return (
      <div className="flex h-full flex-col bg-white dark:bg-slate-900">

        {/* Logo / header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "mx-auto")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
              <Crown className="h-4.5 w-4.5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-slate-950 dark:text-slate-50">
                  MiPOS
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  Super Admin
                </p>
              </div>
            )}
          </div>

          {mode === "desktop" && !collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-600"
                  onClick={() => setIsCollapsed(true)}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Colapsar menú</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-5">
            {SECTION_ORDER.map((section) => {
              const items = NAV_ITEMS.filter((item) => item.section === section);
              if (!items.length) return null;

              return (
                <div key={section} className="space-y-0.5">
                  {!collapsed && (
                    <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {SECTION_LABELS[section]}
                    </p>
                  )}

                  {items.map((item) => {
                    const active =
                      isItemActive(pathname, item) ||
                      Boolean(item.children?.some((c) => isItemActive(pathname, c)));
                    const expanded = expandedItems.has(item.title);

                    const btn = (
                      <Button
                        variant="ghost"
                        className={cn(
                          "group h-9 w-full gap-2.5 rounded-md px-2 transition-colors",
                          collapsed ? "justify-center" : "justify-start",
                          active
                            ? "bg-slate-950 text-white hover:bg-slate-900 hover:text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        )}
                        onClick={() => {
                          if (item.children && !collapsed) {
                            toggleExpanded(item.title);
                          } else {
                            navigate(item.href, mode === "mobile");
                          }
                        }}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                              {item.title}
                            </span>
                            {item.badge && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-4.5 shrink-0 rounded px-1.5 text-[10px] font-medium",
                                  active
                                    ? "border-white/20 bg-white/10 text-white dark:border-slate-950/20 dark:bg-slate-950/10 dark:text-slate-950"
                                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                            {item.children && (
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
                                  expanded && "rotate-180"
                                )}
                              />
                            )}
                          </>
                        )}
                      </Button>
                    );

                    return (
                      <div key={item.title}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{btn}</TooltipTrigger>
                            <TooltipContent side="right" className="max-w-52">
                              <p className="font-medium">{item.title}</p>
                              {item.description && (
                                <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          btn
                        )}

                        {/* Submenú */}
                        {!collapsed && item.children && expanded && (
                          <div className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3 dark:border-slate-700">
                            {item.children.map((child) => {
                              const childActive = isItemActive(pathname, child);
                              return (
                                <Button
                                  key={child.href}
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-full justify-start gap-2 rounded-md px-2 text-[13px]",
                                    childActive
                                      ? "bg-slate-100 font-medium text-slate-950 dark:bg-slate-800 dark:text-slate-50"
                                      : "font-normal text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                                  )}
                                  onClick={() => navigate(child.href, mode === "mobile")}
                                >
                                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{child.title}</span>
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer usuario */}
        <div className="border-t border-slate-200 p-2 dark:border-slate-800">
          {!collapsed ? (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-800/60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">
                  {user?.name || user?.email}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Crown className="h-2.5 w-2.5" />
                  Super Admin
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Cerrar sesión</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 py-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-9 w-9 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesión</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Loading guard ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900 dark:border-slate-100" />
      </div>
    );
  }

  // ─── Layout ──────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">

        {/* Sidebar desktop */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-slate-200 transition-[width] duration-200 dark:border-slate-800 md:flex",
            isCollapsed ? "w-[60px]" : "w-64"
          )}
        >
          {renderSidebar("desktop")}
        </aside>

        {/* Contenido principal */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Topbar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex min-w-0 items-center gap-3">

              {/* Botón expandir sidebar (solo desktop, cuando está colapsado) */}
              {isCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden h-9 w-9 text-slate-500 md:flex"
                      onClick={() => setIsCollapsed(false)}
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Expandir menú</TooltipContent>
                </Tooltip>
              )}

              {/* Hamburger mobile */}
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Menú Super Admin</SheetTitle>
                  </SheetHeader>
                  {renderSidebar("mobile")}
                </SheetContent>
              </Sheet>

              {/* Breadcrumb activo */}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {activeItem?.title ?? "Super Admin"}
                </p>
                {"description" in (activeItem ?? {}) && (activeItem as NavItem)?.description && (
                  <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                    {(activeItem as NavItem).description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => navigate("/admin")}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => navigate("/dashboard")}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </div>

              <div className="flex items-center gap-1 md:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Ir a Admin"
                      onClick={() => navigate("/admin")}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Ir a Admin</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Ir a Dashboard"
                      onClick={() => navigate("/dashboard")}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Ir a Dashboard</TooltipContent>
                </Tooltip>
              </div>

              {activeItem && "badge" in activeItem && (activeItem as NavItem).badge && (
                <Badge
                  variant="outline"
                  className="hidden rounded border-slate-200 text-xs text-slate-500 sm:inline-flex dark:border-slate-700 dark:text-slate-400"
                >
                  {(activeItem as NavItem).badge}
                </Badge>
              )}
              <Separator orientation="vertical" className="hidden h-5 sm:block" />
              <SuperAdminThemeToggle />
            </div>
          </header>

          {/* Página — scroll vertical Y horizontal */}
          <main className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="min-w-0 p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
