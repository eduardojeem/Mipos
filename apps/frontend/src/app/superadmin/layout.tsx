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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
        ></div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Sidebar */}
        <div
          className={cn(
            "bg-card border-r border-border transition-all duration-300 flex flex-col shadow-sm",
            isCollapsed ? "w-20" : "w-80",
          )}
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      Super Admin
                    </h1>
                    <p className="text-xs text-muted-foreground font-medium">
                      Panel de Control SaaS
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hover:bg-muted"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
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
                        "bg-primary/10 text-primary hover:bg-primary/15",
                      "hover:bg-muted",
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
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          activeItem === item.href
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                    </div>
                    {!isCollapsed && (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                                "font-semibold",
                                activeItem === item.href ? "text-primary" : "text-foreground"
                            )}>
                              {item.title}
                            </span>
                            {item.badge && (
                              <Badge className="text-xs px-2 py-0.5 bg-primary text-primary-foreground border-0 hover:bg-primary/90">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.children && (
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform text-muted-foreground",
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
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-border pl-4 py-2">
                        {item.children.map((child) => (
                          <Button
                            key={child.href}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 h-10 px-3 text-sm transition-all duration-200",
                              activeItem === child.href &&
                                "bg-primary/10 text-primary font-medium",
                              "hover:bg-muted hover:translate-x-1",
                            )}
                            onClick={() => {
                              setActiveItem(child.href);
                              router.push(child.href);
                            }}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.title}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* User Info & Actions */}
          <div className="p-4 border-t border-border">
            {!isCollapsed && (
              <div className="mb-4 p-4 rounded-2xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground">
                      {user.name || user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Crown className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-primary">
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
                  "flex-1 border-border hover:bg-muted",
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
                  className="flex-1 gap-2 border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
          {/* Top Bar */}
          <div className="bg-background/80 backdrop-blur-sm border-b border-border px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  Panel Super Admin
                </h2>
                <p className="text-muted-foreground mt-1 font-medium">
                  Gestión completa del sistema SaaS
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* System Status */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Sistema Operativo
                  </span>
                </div>

                {/* Notifications */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 relative"
                >
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 bg-destructive text-destructive-foreground border-0">
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
