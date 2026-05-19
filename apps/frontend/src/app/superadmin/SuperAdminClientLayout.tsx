"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissionsContext } from "@/hooks/use-unified-permissions";
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
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminThemeToggle } from "./components/SuperAdminThemeToggle";
import { useSuperAdminPrefetch } from "./hooks/usePrefetch";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
  section: "principal" | "gestion" | "negocio" | "sistema";
  children?: Array<Omit<NavItem, "section">>;
}

const sectionLabels: Record<NavItem["section"], string> = {
  principal: "Principal",
  gestion: "Gestion",
  negocio: "Negocio",
  sistema: "Sistema",
};

const sectionOrder: NavItem["section"][] = ["principal", "gestion", "negocio", "sistema"];

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/superadmin",
    icon: BarChart3,
    description: "Vista general del sistema",
    section: "principal",
  },
  {
    title: "Panel Admin",
    href: "/admin",
    icon: UserCog,
    description: "Administracion del negocio",
    section: "principal",
  },
  {
    title: "Dashboard Ventas",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Ventas y operaciones",
    section: "principal",
  },
  {
    title: "Organizaciones",
    href: "/superadmin/organizations",
    icon: Building2,
    badge: "SaaS",
    description: "Clientes, tenants y configuracion",
    section: "gestion",
    children: [
      {
        title: "Todas las organizaciones",
        href: "/superadmin/organizations",
        icon: Building2,
      },
      {
        title: "Crear organizacion",
        href: "/superadmin/organizations/create",
        icon: Building2,
      },
      {
        title: "Configuraciones",
        href: "/superadmin/organizations/settings",
        icon: Settings,
      },
    ],
  },
  {
    title: "Usuarios Globales",
    href: "/superadmin/users",
    icon: Users,
    description: "Usuarios y permisos globales",
    section: "gestion",
    children: [
      { title: "Todos los usuarios", href: "/superadmin/users", icon: Users },
      {
        title: "Super admins",
        href: "/superadmin/users/super-admins",
        icon: Crown,
      },
    ],
  },
  {
    title: "Planes SaaS",
    href: "/superadmin/plans",
    icon: Sparkles,
    badge: "Nuevo",
    description: "Planes, limites y paquetes",
    section: "negocio",
  },
  {
    title: "Suscripciones",
    href: "/superadmin/subscriptions",
    icon: CreditCard,
    description: "Suscripciones activas",
    section: "negocio",
  },
  {
    title: "Facturas",
    href: "/superadmin/invoices",
    icon: FileText,
    description: "Facturacion y pagos",
    section: "negocio",
  },
  {
    title: "Facturacion legacy",
    href: "/superadmin/billing",
    icon: CreditCard,
    description: "Suscripciones y pagos anteriores",
    section: "negocio",
  },
  {
    title: "Metricas SaaS",
    href: "/superadmin/saas-metrics",
    icon: TrendingUp,
    description: "KPIs del negocio",
    section: "negocio",
  },
  {
    title: "Monitoreo",
    href: "/superadmin/monitoring",
    icon: Activity,
    badge: "Live",
    description: "Salud y rendimiento",
    section: "sistema",
  },
  {
    title: "Audit Logs",
    href: "/superadmin/audit-logs",
    icon: Shield,
    description: "Registro de auditoria",
    section: "sistema",
  },
  {
    title: "Plantillas de Email",
    href: "/superadmin/emails",
    icon: Mail,
    description: "Correos transaccionales",
    section: "sistema",
  },
  {
    title: "Configuracion Global",
    href: "/superadmin/settings",
    icon: Settings,
    description: "Parametros del sistema",
    section: "sistema",
  },
];

function getItemIsActive(pathname: string, item: NavItem | Omit<NavItem, "section">) {
  if (item.href === "/superadmin") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getActiveItem(pathname: string, items: NavItem[]) {
  const flatItems = items.flatMap((item) => [item, ...(item.children || [])]);
  return flatItems
    .filter((item) => getItemIsActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export default function SuperAdminClientLayout({ children }: SuperAdminLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, isManager } = usePermissionsContext();
  const router = useRouter();
  const pathname = usePathname() || "/superadmin";
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("superadmin_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useSuperAdminPrefetch();

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin");
    }
  }, [user, router]);

  const visibleNavigationItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (item.href === "/admin") return isAdmin || isManager;
        if (item.href === "/dashboard") return isAdmin || isManager;
        return true;
      }),
    [isAdmin, isManager]
  );

  const activeItem = useMemo(
    () => getActiveItem(pathname, visibleNavigationItems),
    [pathname, visibleNavigationItems]
  );

  useEffect(() => {
    const matchingParents = visibleNavigationItems
      .filter((item) => item.children && item.children.some((child) => getItemIsActive(pathname, child)))
      .map((item) => item.title);

    if (matchingParents.length === 0) return;
    setExpandedItems((prev) => {
      const next = new Set(prev);
      matchingParents.forEach((title) => next.add(title));
      return next;
    });
  }, [pathname, visibleNavigationItems]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("superadmin_sidebar_expanded");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      setExpandedItems(new Set(parsed.filter((value) => typeof value === "string")));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("superadmin_sidebar_expanded", JSON.stringify(Array.from(expandedItems)));
    } catch {
      return;
    }
  }, [expandedItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem("superadmin_sidebar_collapsed", isCollapsed ? "1" : "0");
    } catch {
      return;
    }
  }, [isCollapsed]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const navigateTo = (href: string, closeMobile = false) => {
    router.push(href);
    if (closeMobile) setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  const renderSidebar = (mode: "desktop" | "mobile") => {
    const collapsed = mode === "desktop" && isCollapsed;

    return (
      <div className="flex h-full flex-col bg-white dark:bg-slate-900">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          <div className={cn("flex min-w-0 items-center gap-2", collapsed && "mx-auto")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
              <Crown className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                  MiPOS Super Admin
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  Control SaaS global
                </div>
              </div>
            )}
          </div>

          {mode === "desktop" && !collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500"
                  onClick={() => setIsCollapsed(true)}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Colapsar menu</TooltipContent>
            </Tooltip>
          )}
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-4">
            {sectionOrder.map((section) => {
              const items = visibleNavigationItems.filter((item) => item.section === section);
              if (items.length === 0) return null;

              return (
                <div key={section} className="space-y-1">
                  {!collapsed && (
                    <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {sectionLabels[section]}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive =
                        getItemIsActive(pathname, item) ||
                        Boolean(item.children?.some((child) => getItemIsActive(pathname, child)));
                      const isExpanded = expandedItems.has(item.title);

                      const trigger = (
                        <Button
                          variant="ghost"
                          className={cn(
                            "group h-10 w-full gap-3 rounded-md px-2 transition-colors",
                            collapsed ? "justify-center" : "justify-start",
                            isActive
                              ? "bg-slate-950 text-white hover:bg-slate-950 hover:text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-100"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          )}
                          onClick={() => {
                            if (item.children && !collapsed) {
                              toggleExpanded(item.title);
                              return;
                            }
                            navigateTo(item.href, mode === "mobile");
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
                                    "h-5 shrink-0 rounded-md px-1.5 text-[10px] font-medium",
                                    isActive
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
                                    "h-3.5 w-3.5 shrink-0 transition-transform",
                                    isExpanded && "rotate-180"
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
                              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                              <TooltipContent side="right">
                                <div className="space-y-0.5">
                                  <div className="text-sm font-medium">{item.title}</div>
                                  {item.description && (
                                    <div className="max-w-48 text-xs text-slate-500">{item.description}</div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            trigger
                          )}

                          {!collapsed && item.children && isExpanded && (
                            <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3 dark:border-slate-800">
                              {item.children.map((child) => {
                                const childIsActive = getItemIsActive(pathname, child);
                                return (
                                  <Button
                                    key={child.href}
                                    variant="ghost"
                                    className={cn(
                                      "h-8 w-full justify-start gap-2 rounded-md px-2 text-[13px] font-normal",
                                      childIsActive
                                        ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-slate-100"
                                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                                    )}
                                    onClick={() => navigateTo(child.href, mode === "mobile")}
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
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-slate-200 p-2 dark:border-slate-800">
          {!collapsed ? (
            <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-950 dark:text-slate-100">
                    {user?.name || user?.email}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Crown className="h-3 w-3" />
                    <span>Super Admin</span>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="h-8 w-8 shrink-0 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Cerrar sesion</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(false)}
                    className="h-9 w-9 text-slate-500"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expandir menu</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-9 w-9 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesion</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900 dark:border-slate-100" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50">
        <div className="flex h-screen">
          <aside
            className={cn(
              "hidden shrink-0 border-r border-slate-200 transition-[width] duration-200 dark:border-slate-800 md:flex",
              isCollapsed ? "w-16" : "w-72"
            )}
          >
            {renderSidebar("desktop")}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[19rem] p-0 sm:max-w-[19rem]">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Menu Super Admin</SheetTitle>
                    </SheetHeader>
                    {renderSidebar("mobile")}
                  </SheetContent>
                </Sheet>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50 sm:text-base">
                    {activeItem?.title || "Super Admin"}
                  </div>
                  <div className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                    {activeItem?.description || "Panel de administracion del sistema"}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {activeItem?.badge && (
                  <Badge variant="outline" className="hidden rounded-md border-slate-200 text-slate-500 sm:inline-flex dark:border-slate-700 dark:text-slate-400">
                    {activeItem.badge}
                  </Badge>
                )}
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <SuperAdminThemeToggle />
              </div>
            </header>

            <main className="min-w-0 flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
