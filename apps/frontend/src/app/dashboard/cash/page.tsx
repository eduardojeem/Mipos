"use client";

import React, { useState, Suspense } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { UnifiedPermissionGuard } from "@/components/auth/UnifiedPermissionGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { CashAlerts } from "@/components/dashboard/CashAlerts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CashErrorBoundary } from "@/components/error/CashErrorBoundary";

// Optimized Components
import { OptimizedCashMetrics } from "./components/OptimizedCashMetrics";
import { EnhancedCashFlowChart } from "./components/EnhancedCashFlowChart";
import { SmartCashActions } from "./components/SmartCashActions";
import { IntelligentCashInsights } from "./components/IntelligentCashInsights";
import { OptimizedMovementsSection } from "./components/OptimizedMovementsSection";
import CashActionDialogs from "@/components/cash/CashActionDialogs";

// Optimized Hook
import { useOptimizedCashData } from "./hooks/useOptimizedCashData";


export default function CashPage() {
  const hook = useOptimizedCashData({
    enableRealtime: true,
    enablePrefetch: true,
    cacheTime: 300_000,
    staleTime: 60_000
  });
  
  const {
    session,
    sessionLoading,
    loadingStates,
    currentBalance,
    todayInflows,
    todayOutflows,
    netFlow,
    analytics,
    todayMovements,
    handleOpenSession,
    requestCloseSession,
    requestRegisterMovement,
    movements,
    allMovements,
    ConfirmationDialog,
    fetchMovements,
    lastSyncAt,
    performanceMetrics,
    exportMovementsCSV
  } = hook;

  // Dialog States
  const [isOpenSessionDialogOpen, setOpenSessionDialogOpen] = useState(false);
  const [isCloseSessionDialogOpen, setCloseSessionDialogOpen] = useState(false);
  const [isNewMovementDialogOpen, setNewMovementDialogOpen] = useState(false);

  return (
    <UnifiedPermissionGuard resource="cash" action="read" allowAdmin>
      <div className="space-y-8 pb-10">

        {/* Performance Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold">Caja Inteligente</h1>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>Optimizado</span>
            </Badge>
            {performanceMetrics.queryTime > 0 && (
              <Badge variant="secondary" className="text-xs">
                {performanceMetrics.queryTime.toFixed(0)}ms
              </Badge>
            )}
          </div>
        </div>

        {/* Alerts Section */}
        <CashAlerts />

        {/* Loading States */}
        {sessionLoading && (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Main Content */}
        {!sessionLoading && (
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Left Column: Metrics & Charts */}
              <div className="xl:col-span-3 space-y-8">
                {/* Enhanced Metrics */}
                <CashErrorBoundary>
                  <OptimizedCashMetrics
                    sessionOpen={(session?.status || '').toUpperCase() === 'OPEN'}
                    currentBalance={currentBalance}
                    todayInflows={todayInflows}
                    todayOutflows={todayOutflows}
                    movementsCount={todayMovements.length}
                    openingBalance={Number(session?.openingAmount || 0)}
                    targetBalance={100000} // Could be configurable
                    isLoading={sessionLoading}
                  />
                </CashErrorBoundary>

                {/* Enhanced Flow Chart */}
                <CashErrorBoundary>
                  <EnhancedCashFlowChart
                    movements={allMovements}
                    openingBalance={Number(session?.openingAmount || 0)}
                    isLoading={sessionLoading}
                  />
                </CashErrorBoundary>

                {/* Recent Movements */}
                <CashErrorBoundary>
                  <OptimizedMovementsSection
                    movements={movements}
                    allMovements={allMovements}
                    isLoading={sessionLoading}
                    onRefresh={fetchMovements}
                    onExport={() => exportMovementsCSV({ includeAnalytics: true })}
                    sessionId={session?.id}
                  />
                </CashErrorBoundary>
              </div>

              {/* Right Column: Actions & Analytics */}
              <div className="xl:col-span-1 space-y-6">
                <CashErrorBoundary>
                  <SmartCashActions
                    sessionOpen={(session?.status || '').toUpperCase() === 'OPEN'}
                    currentBalance={currentBalance}
                    onOpenSession={() => setOpenSessionDialogOpen(true)}
                    onCloseSession={() => setCloseSessionDialogOpen(true)}
                    onNewMovement={() => setNewMovementDialogOpen(true)}
                    onRefresh={fetchMovements}
                    onExport={() => exportMovementsCSV({ includeAnalytics: true })}
                    isRefreshing={loadingStates.fetchingData}
                    lastSyncAt={lastSyncAt}
                    loadingStates={loadingStates}
                    sessionStats={{
                      movementsToday: todayMovements.length,
                      lastMovementAt: todayMovements[0]?.createdAt ? new Date(todayMovements[0].createdAt) : undefined,
                      discrepancy: 0 // Could be calculated from session data
                    }}
                  />
                </CashErrorBoundary>

                {/* Analytics Panel */}
                {analytics && (
                  <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Analytics</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Promedio por transacción:</span>
                        <span className="font-medium">{analytics.averageTransactionValue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Velocidad (trans/hora):</span>
                        <span className="font-medium">{analytics.transactionVelocity.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rotación de efectivo:</span>
                        <span className="font-medium">{(analytics.cashTurnover * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Score de riesgo:</span>
                        <Badge variant={analytics.riskScore > 50 ? "destructive" : analytics.riskScore > 25 ? "secondary" : "default"}>
                          {analytics.riskScore}/100
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Intelligent Insights */}
                <CashErrorBoundary>
                  <IntelligentCashInsights
                    movements={allMovements}
                    currentBalance={currentBalance}
                    todayInflows={todayInflows}
                    todayOutflows={todayOutflows}
                    openingBalance={Number(session?.openingAmount || 0)}
                    isLoading={sessionLoading}
                  />
                </CashErrorBoundary>
              </div>
            </div>
          </Suspense>
        )}

        {/* Action Dialogs */}
        <CashActionDialogs
          isOpenSessionDialogOpen={isOpenSessionDialogOpen}
          setOpenSessionDialogOpen={setOpenSessionDialogOpen}
          isCloseSessionDialogOpen={isCloseSessionDialogOpen}
          setCloseSessionDialogOpen={setCloseSessionDialogOpen}
          isNewMovementDialogOpen={isNewMovementDialogOpen}
          setNewMovementDialogOpen={setNewMovementDialogOpen}

          onOpenSession={handleOpenSession}
          onRequestCloseSession={requestCloseSession}
          onRequestRegisterMovement={requestRegisterMovement}

          loadingOpening={loadingStates.openingSession}
          loadingClosing={loadingStates.closingSession}
          loadingRegistering={loadingStates.registeringMovement}
          currentBalance={currentBalance}
        />

        {/* Global Confirmation Dialog */}
        <ConfirmationDialog />
      </div>
    </UnifiedPermissionGuard>
  );
}
