/**
 * CarouselAuditLog Component
 * 
 * Displays the audit log history for carousel changes.
 * Shows who made changes, when, and what changed.
 * Allows admins to revert to previous versions.
 * 
 * Requirements: 9.3, 9.4
 */

"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Dialog will be implemented inline for now
// import { Dialog, DialogContent, ... } from "@/components/ui/dialog";
import {
  History,
  RefreshCw,
  Undo2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "REORDER" | "REVERT";
  previousState: string[];
  newState: string[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface CarouselAuditLogProps {
  onRevert?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creado",
  UPDATE: "Actualizado",
  DELETE: "Eliminado",
  REORDER: "Reordenado",
  REVERT: "Revertido",
};

const ACTION_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  REORDER: "outline",
  REVERT: "secondary",
};

export default function CarouselAuditLog({ onRevert }: CarouselAuditLogProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);
  const { toast } = useToast();

  // Load audit log on mount
  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/promotions/carousel/audit", {
        params: { limit: 50, offset: 0 },
      });

      if (response.data?.success) {
        setLogs(response.data.logs || []);
      } else {
        throw new Error(response.data?.message || "Error desconocido");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Error al cargar el historial";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevertClick = async (entry: AuditEntry) => {
    if (!confirm(`¿Estás seguro de que quieres revertir el carrusel a la versión de ${formatDate(entry.createdAt)}?`)) {
      return;
    }

    setReverting(true);

    try {
      const response = await api.post(
        `/promotions/carousel/revert/${entry.id}`
      );

      if (response.data?.success) {
        toast({
          title: "Éxito",
          description: "Carrusel revertido exitosamente",
        });

        // Reload audit log
        await loadAuditLog();

        // Notify parent component
        if (onRevert) {
          onRevert();
        }
      } else {
        throw new Error(response.data?.message || "Error desconocido");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Error al revertir";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setReverting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Hace un momento";
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays < 7) return `Hace ${diffDays}d`;
      return formatDate(dateString);
    } catch {
      return dateString;
    }
  };

  const renderStateDiff = (previous: string[], current: string[]) => {
    const added = current.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !current.includes(id));
    const reordered = current.length === previous.length && 
                      current.some((id, idx) => id !== previous[idx]);

    return (
      <div className="space-y-2 text-sm">
        {added.length > 0 && (
          <div className="flex items-start gap-2">
            <Badge variant="default" className="text-xs">
              +{added.length}
            </Badge>
            <div className="flex-1">
              <span className="text-muted-foreground">Agregados:</span>
              <div className="mt-1 space-y-1">
                {added.map((id) => (
                  <div key={id} className="text-xs font-mono bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                    {id.slice(0, 8)}...
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {removed.length > 0 && (
          <div className="flex items-start gap-2">
            <Badge variant="destructive" className="text-xs">
              -{removed.length}
            </Badge>
            <div className="flex-1">
              <span className="text-muted-foreground">Eliminados:</span>
              <div className="mt-1 space-y-1">
                {removed.map((id) => (
                  <div key={id} className="text-xs font-mono bg-red-50 dark:bg-red-950 px-2 py-1 rounded">
                    {id.slice(0, 8)}...
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {reordered && added.length === 0 && removed.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              ↕
            </Badge>
            <span>Elementos reordenados</span>
          </div>
        )}

        {added.length === 0 && removed.length === 0 && !reordered && (
          <div className="text-muted-foreground">Sin cambios</div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Historial de Cambios</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAuditLog}
              disabled={loading}
              aria-label="Actualizar historial"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Cargando historial...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay cambios registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((entry, index) => {
                const isExpanded = expandedId === entry.id;
                const isLatest = index === 0;

                return (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isLatest ? "border-primary bg-accent/50" : "hover:bg-accent/30"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={ACTION_COLORS[entry.action]}>
                            {ACTION_LABELS[entry.action] || entry.action}
                          </Badge>
                          {isLatest && (
                            <Badge variant="outline" className="text-xs">
                              Actual
                            </Badge>
                          )}
                          {entry.metadata?.revertedFromVersion && (
                            <Badge variant="secondary" className="text-xs">
                              Revertido
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{entry.userName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span title={formatDate(entry.createdAt)}>
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isLatest && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevertClick(entry)}
                            disabled={reverting}
                            aria-label="Revertir a esta versión"
                            title="Revertir a esta versión"
                          >
                            {reverting ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Undo2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(entry.id)}
                          aria-label={isExpanded ? "Contraer" : "Expandir"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Cambios:</h4>
                          {renderStateDiff(entry.previousState, entry.newState)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Estado anterior:</span>
                            <div className="mt-1 font-mono text-xs">
                              {entry.previousState.length} elementos
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Estado nuevo:</span>
                            <div className="mt-1 font-mono text-xs">
                              {entry.newState.length} elementos
                            </div>
                          </div>
                        </div>

                        {entry.ipAddress && (
                          <div className="text-xs text-muted-foreground">
                            <span>IP: </span>
                            <span className="font-mono">{entry.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


    </>
  );
}
