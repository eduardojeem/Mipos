"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Users,
  Settings,
  BarChart3,
  Shield,
  CreditCard,
  Bell,
  Activity,
  UserCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crown,
  Sparkles,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminThemeToggle } from "./components/SuperAdminThemeToggle";

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
    title: "Facturación",
    href: "/superadmin/billing",
    icon: CreditCard,
    description: "Suscripciones y pagos",
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

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Verificar permisos de super admin
  useEffect(() => {
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    // Verificar si es super admin usando el rol del usuario
    if (user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [user, router]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden transition-colors duration-500">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-slate-400/20 dark:bg-slate-600/10 rounded-full blur-3xl animate-pulse transition-colors duration-500"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse transition-colors duration-500"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-300/15 dark:bg-slate-700/10 rounded-full blur-3xl animate-pulse transition-colors duration-500"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Sidebar with Glassmorphism */}
        <div
          className={cn(
            "backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-r border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 flex flex-col shadow-xl",
            isCollapsed ? "w-20" : "w-80",
          )}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="w-12 h-12 p-0 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/25 hover:scale-105 transition-transform border-0"
                >
                  <Crown className="h-6 w-6 text-white" />
                </Button>
                {!isCollapsed && (
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
                      Super Admin
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Panel de Control SaaS
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-6">
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <div key={item.title} className="group">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-auto py-3 px-4 transition-all duration-200",
                      !isCollapsed && "text-left",
                      activeItem === item.href &&
                      "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border border-slate-300 dark:border-slate-600 shadow-md",
                      "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-800 dark:hover:to-slate-700 hover:scale-[1.02] hover:shadow-sm",
                    )}
                    onClick={() => {
                      if (item.children) {
                        toggleExpanded(item.title);
                      } else {
                        setActiveItem(item.href);
                        router.push(item.href);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-xl transition-all duration-200",
                        activeItem === item.href
                          ? "bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg shadow-slate-500/25"
                          : "bg-slate-100 dark:bg-slate-800 group-hover:bg-gradient-to-br group-hover:from-slate-600 group-hover:to-slate-700",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          activeItem === item.href
                            ? "text-white"
                            : "text-slate-600 dark:text-slate-400 group-hover:text-white",
                        )}
                      />
                    </div>
                    {!isCollapsed && (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.title}
                            </span>
                            {item.badge && (
                              <Badge className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.children && (
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform text-slate-600 dark:text-slate-400",
                              expandedItems.has(item.title) && "rotate-180",
                            )}
                          />
                        )}
                      </>
                    )}
                  </Button>

                  {/* Subitems */}
                  {!isCollapsed &&
                    item.children &&
                    expandedItems.has(item.title) && (
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-slate-300 dark:border-slate-700 pl-4 py-2">
                        {item.children.map((child) => (
                          <Button
                            key={child.href}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 h-10 px-3 text-sm transition-all duration-200",
                              activeItem === child.href &&
                              "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                              "hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-1",
                            )}
                            onClick={() => {
                              setActiveItem(child.href);
                              router.push(child.href);
                            }}
                          >
                            <child.icon className="h-4 w-4" />
                            <span className="font-medium">{child.title}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* User Info & Actions */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            {!isCollapsed && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border border-slate-300 dark:border-slate-600 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/25">
                    <UserCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">
                      {user.name || user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Crown className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-400">
                        Super Admin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  "flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
                  isCollapsed && "w-full",
                )}
              >
                {isCollapsed ? "→" : "←"}
              </Button>
              {!isCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex-1 gap-2 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar with Glassmorphism */}
          <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/50 dark:border-slate-700/50 px-8 py-6 shadow-lg transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent transition-all duration-300">
                  Panel Super Admin
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium transition-colors duration-300">
                  Gestión completa del sistema SaaS
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* System Status */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Sistema Operativo
                  </span>
                </div>

                {/* Theme Toggle */}
                <SuperAdminThemeToggle />

                {/* Notifications */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
                >
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 bg-gradient-to-r from-red-600 to-red-700 text-white border-0 shadow-lg shadow-red-500/25">
                    3
                  </Badge>
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
