"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissionsContext } from "@/hooks/use-unified-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  Users,
  Settings,
  BarChart3,
  Shield,
  CreditCard,
  Activity,
  UserCheck,
  ChevronDown,
  LogOut,
  Crown,
  Sparkles,
  Mail,
  LayoutDashboard,
  UserCog,
  FileText,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
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
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/superadmin",
    icon: BarChart3,
    description: "Vista general del sistema",
  },
  {
    title: "Panel Admin",
    href: "/admin",
    icon: UserCog,
    description: "Administración de negocio",
  },
  {
    title: "Dashboard Ventas",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Panel de ventas y operaciones",
  },
  {
    title: "Organizaciones",
    href: "/superadmin/organizations",
    icon: Building2,
    badge: "SaaS",
    description: "Gestión de clientes y tenants",
    children: [
      {
        title: "Todas las Organizaciones",
        href: "/superadmin/organizations",
        icon: Building2,
      },
      {
        title: "Crear Organización",
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
    description: "Administración de usuarios del sistema",
    children: [
      { title: "Todos los Usuarios", href: "/superadmin/users", icon: Users },
      {
        title: "Super Admins",
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
    description: "Planes y límites del sistema",
  },
  {
    title: "Suscripciones",
    href: "/superadmin/subscriptions",
    icon: CreditCard,
    badge: "Nuevo",
    description: "Gestión de suscripciones activas",
  },
  {
    title: "Facturas",
    href: "/superadmin/invoices",
    icon: FileText,
    badge: "Nuevo",
    description: "Facturación y pagos",
  },
  {
    title: "Facturación",
    href: "/superadmin/billing",
    icon: CreditCard,
    description: "Suscripciones y pagos (legacy)",
  },
  {
    title: "Métricas SaaS",
    href: "/superadmin/saas-metrics",
    icon: TrendingUp,
    badge: "Nuevo",
    description: "KPIs y métricas del negocio",
  },
  {
    title: "Monitoreo",
    href: "/superadmin/monitoring",
    icon: Activity,
    badge: "Live",
    description: "Métricas del sistema",
  },
  {
    title: "Audit Logs",
    href: "/superadmin/audit-logs",
    icon: Shield,
    badge: "Nuevo",
    description: "Registro de auditoría",
  },
  {
    title: "Plantillas de Email",
    href: "/superadmin/emails",
    icon: Mail,
    badge: "Pro",
    description: "Gestión de correos transaccionales",
  },
  {
    title: "Configuración Global",
    href: "/superadmin/settings",
    icon: Settings,
    description: "Configuraciones del sistema",
  },
];

export default function SuperAdminClientLayout({ children }: SuperAdminLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, isManager } = usePermissionsContext();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("superadmin_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  // ✅ Prefetch de datos comunes para mejorar navegación
  useSuperAdminPrefetch();

  // Verificación simple de autenticación (permisos verificados en layout.tsx server-side)
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

  useEffect(() => {
    setActiveItem(pathname || "");

    const matchingParents = visibleNavigationItems
      .filter((item) => item.children && item.children.some((child) => pathname?.startsWith(child.href)))
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
      setExpandedItems(new Set(parsed.filter((v) => typeof v === "string")));
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
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedItems(newExpanded);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div
            className={cn(
              "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-200 flex flex-col",
              isCollapsed ? "w-16" : "w-64",
            )}
          >
            {/* Header */}
            <div className="h-14 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className={cn("flex items-center gap-2", isCollapsed && "mx-auto")}>
                <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-white dark:text-slate-900" />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      Super Admin
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Panel SaaS
                    </div>
                  </div>
                )}
              </div>
              {!isCollapsed && (
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
                  <TooltipContent side="right">Colapsar sidebar</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-2 py-3">
              <nav className="space-y-0.5">
                {visibleNavigationItems.map((item) => {
                  const isActive =
                    activeItem === item.href ||
                    (item.children && item.children.some((c) => activeItem.startsWith(c.href)));

                  const trigger = (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full gap-3 h-9 px-2 rounded-md transition-colors",
                        isCollapsed ? "justify-center" : "justify-start",
                        isActive
                          ? "bg-slate-900 text-white hover:bg-slate-900 hover:text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                      onClick={() => {
                        if (item.children && !isCollapsed) {
                          toggleExpanded(item.title);
                        } else {
                          router.push(item.href);
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left text-sm font-medium truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 px-1.5 text-[10px] font-medium border-slate-200 dark:border-slate-700",
                                isActive ? "bg-white/10 text-white border-white/20 dark:bg-slate-900/10 dark:text-slate-900 dark:border-slate-900/20" : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {item.children && (
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition-transform shrink-0",
                                expandedItems.has(item.title) && "rotate-180",
                              )}
                            />
                          )}
                        </>
                      )}
                    </Button>
                  );

                  return (
                    <div key={item.title}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                          <TooltipContent side="right" className="flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                {item.badge}
                              </Badge>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        trigger
                      )}

                      {/* Subitems */}
                      {!isCollapsed && item.children && expandedItems.has(item.title) && (
                        <div className="ml-7 mt-0.5 space-y-0.5 border-l border-slate-200 dark:border-slate-800 pl-2">
                          {item.children.map((child) => (
                            <Button
                              key={child.href}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-2.5 h-8 px-2 rounded-md text-[13px] font-normal",
                                activeItem === child.href
                                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                              )}
                              onClick={() => router.push(child.href)}
                            >
                              <child.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{child.title}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </ScrollArea>

          {/* User Info & Actions */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800">
            {!isCollapsed ? (
              <div className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <UserCheck className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                    {user.name || user.email}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
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
                      className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Cerrar sesión</TooltipContent>
                </Tooltip>
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
                  <TooltipContent side="right">Expandir sidebar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="h-9 w-9 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar — slim utility bar (page owns its own title) */}
          <div className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-2">
            <SuperAdminThemeToggle />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
