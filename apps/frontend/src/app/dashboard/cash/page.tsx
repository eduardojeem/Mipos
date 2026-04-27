"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UnifiedPermissionGuard } from "@/components/auth/UnifiedPermissionGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { CashAlerts } from "@/components/dashboard/CashAlerts";
import CashActionDialogs from "@/components/cash/CashActionDialogs";
import { useCurrentOrganizationId } from "@/hooks/use-current-organization";
import { StatusBanner } from "./components/StatusBanner";
import { ActiveSessionOverview } from "./components/ActiveSessionOverview";
import { PrimaryActions } from "./components/PrimaryActions";
import { DailySummary } from "./components/DailySummary";
import { RecentMovements } from "./components/RecentMovements";
import { useOptimizedCashData } from "./hooks/useOptimizedCashData";

export default function SimplifiedCashPage() {
  const router = useRouter();
  const organizationId = useCurrentOrganizationId();
  const {
    session,
    sessionLoading,
    loadingStates,
    currentBalance,
    netFlow,
    todayMovements,
    handleOpenSession,
    requestCloseSession,
    requestRegisterMovement,
    movements,
    ConfirmationDialog,
  } = useOptimizedCashData({
    enableRealtime: true,
    enablePrefetch: true,
    cacheTime: 300_000,
    staleTime: 60_000,
  });

  const [isOpenSessionDialogOpen, setOpenSessionDialogOpen] = useState(false);
  const [isCloseSessionDialogOpen, setCloseSessionDialogOpen] = useState(false);
  const [isNewMovementDialogOpen, setNewMovementDialogOpen] = useState(false);

  const getLastMovementTime = () => {
    if (todayMovements.length === 0) {
      return undefined;
    }

    const lastMovement = todayMovements[0];
    const diff = Date.now() - new Date(lastMovement.createdAt).getTime();
    const minutes = Math.floor(diff / 60_000);

    if (minutes < 1) {
      return "Ahora";
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    return `${Math.floor(minutes / 60)}h`;
  };

  return (
    <UnifiedPermissionGuard resource="cash" action="read" allowAdmin>
      <div className="space-y-6 pb-10">
        <CashAlerts />

        {sessionLoading && (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        )}

        {!sessionLoading && (
          <div className="mx-auto max-w-6xl space-y-6">
            <StatusBanner
              sessionOpen={(session?.status || "").toUpperCase() === "OPEN"}
              currentBalance={currentBalance}
              openingBalance={Number(session?.openingAmount || 0)}
              isLoading={sessionLoading}
            />

            <ActiveSessionOverview session={session} />

            <PrimaryActions
              sessionOpen={(session?.status || "").toUpperCase() === "OPEN"}
              canOperate={Boolean(organizationId)}
              onOpenSession={() => setOpenSessionDialogOpen(true)}
              onCloseSession={() => setCloseSessionDialogOpen(true)}
              onNewMovement={() => setNewMovementDialogOpen(true)}
              onViewReports={() => router.push("/dashboard/cash/reports")}
              loadingStates={loadingStates}
            />

            <DailySummary
              movementsCount={todayMovements.length}
              lastMovementTime={getLastMovementTime()}
              netFlow={netFlow}
              isLoading={sessionLoading}
            />

            <RecentMovements
              movements={movements}
              onViewAll={() => router.push("/dashboard/cash/movements")}
              onNewMovement={() => setNewMovementDialogOpen(true)}
              sessionOpen={(session?.status || "").toUpperCase() === "OPEN"}
              isLoading={sessionLoading}
            />
          </div>
        )}

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
          loadingOpening={loadingStates.openingSession || false}
          loadingClosing={loadingStates.closingSession || false}
          loadingRegistering={loadingStates.registeringMovement || false}
          currentBalance={currentBalance}
          sessionOpen={(session?.status || "").toUpperCase() === "OPEN"}
        />

        <ConfirmationDialog />
      </div>
    </UnifiedPermissionGuard>
  );
}
