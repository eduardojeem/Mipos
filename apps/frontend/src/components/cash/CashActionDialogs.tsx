"use client";

import React, { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import { MAX_CASH_OPENING_AMOUNT } from "@/lib/cash/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { MovementType } from "@/app/dashboard/cash/types/cash.types";
import OpenCashSessionDialog from "./OpenCashSessionDialog";

interface CashActionDialogsProps {
  isOpenSessionDialogOpen: boolean;
  setOpenSessionDialogOpen: (open: boolean) => void;
  isCloseSessionDialogOpen: boolean;
  setCloseSessionDialogOpen: (open: boolean) => void;
  isNewMovementDialogOpen: boolean;
  setNewMovementDialogOpen: (open: boolean) => void;
  onOpenSession: (amount: number, notes?: string) => void;
  onRequestCloseSession: (payload: { closingAmount: number; notes?: string }) => void;
  onRequestRegisterMovement: (payload: {
    type: MovementType;
    direction?: "increase" | "decrease";
    amount: number;
    reason?: string;
  }) => void;
  loadingOpening: boolean;
  loadingClosing: boolean;
  loadingRegistering: boolean;
  currentBalance: number;
  sessionOpen: boolean;
}

const MAX_MANUAL_MOVEMENT_AMOUNT = 10_000_000;

export default function CashActionDialogs({
  isOpenSessionDialogOpen,
  setOpenSessionDialogOpen,
  isCloseSessionDialogOpen,
  setCloseSessionDialogOpen,
  isNewMovementDialogOpen,
  setNewMovementDialogOpen,
  onOpenSession,
  onRequestCloseSession,
  onRequestRegisterMovement,
  loadingOpening,
  loadingClosing,
  loadingRegistering,
  currentBalance,
  sessionOpen,
}: CashActionDialogsProps) {
  const { toast } = useToast();
  const fmtCurrency = useCurrencyFormatter();

  const [closingAmount, setClosingAmount] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");

  const [movementType, setMovementType] = useState<string>("IN");
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [movementReason, setMovementReason] = useState<string>("");
  const [movementDirection, setMovementDirection] = useState<string>("increase");

  // --- Close Session ---
  const handleCloseSubmit = () => {
    const amount = Math.round(parseFloat(closingAmount || "0") * 100) / 100;

    if (!closingAmount || closingAmount.trim() === "") {
      toast({ variant: "destructive", title: "Monto requerido", description: "Ingresa el monto de cierre" });
      return;
    }
    if (!Number.isFinite(amount) || Number.isNaN(amount)) {
      toast({ variant: "destructive", title: "Monto invalido", description: "Ingresa un numero valido" });
      return;
    }
    if (amount < 0) {
      toast({ variant: "destructive", title: "Monto negativo", description: "El monto de cierre no puede ser negativo" });
      return;
    }
    if (amount > MAX_CASH_OPENING_AMOUNT) {
      toast({ variant: "destructive", title: "Monto muy alto", description: `El monto de cierre no puede exceder ${fmtCurrency(MAX_CASH_OPENING_AMOUNT)}` });
      return;
    }

    onRequestCloseSession({ closingAmount: amount, notes: closingNotes.trim() || undefined });
    setCloseSessionDialogOpen(false);
    setClosingAmount("");
    setClosingNotes("");
  };

  // --- Register Movement ---
  const handleRegisterSubmit = () => {
    const amount = Math.round(parseFloat(movementAmount || "0") * 100) / 100;

    if (!movementAmount || movementAmount.trim() === "") {
      toast({ variant: "destructive", title: "Monto requerido", description: "Ingresa un monto para el movimiento" });
      return;
    }
    if (!Number.isFinite(amount) || Number.isNaN(amount)) {
      toast({ variant: "destructive", title: "Monto invalido", description: "Ingresa un numero valido" });
      return;
    }
    if (amount <= 0) {
      toast({ variant: "destructive", title: "Monto invalido", description: "El monto debe ser mayor a 0" });
      return;
    }
    if (movementType === "OUT" && amount > currentBalance) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: `No puedes retirar ${fmtCurrency(amount)}. Balance actual: ${fmtCurrency(currentBalance || 0)}` });
      return;
    }
    if (amount > MAX_MANUAL_MOVEMENT_AMOUNT) {
      toast({ variant: "destructive", title: "Monto muy alto", description: `El monto no puede exceder ${fmtCurrency(MAX_MANUAL_MOVEMENT_AMOUNT)}` });
      return;
    }

    onRequestRegisterMovement({
      type: movementType as MovementType,
      direction: movementDirection as "increase" | "decrease",
      amount,
      reason: movementReason.trim() || undefined,
    });
    setNewMovementDialogOpen(false);
    setMovementAmount("");
    setMovementReason("");
    setMovementType("IN");
    setMovementDirection("increase");
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <>
      {/* ── Open Session Dialog (unified) ── */}
      <OpenCashSessionDialog
        open={isOpenSessionDialogOpen}
        onOpenChange={setOpenSessionDialogOpen}
        onConfirm={onOpenSession}
        isLoading={loadingOpening}
        sessionOpen={sessionOpen}
      />

      {/* ── Close Session Dialog ── */}
      <Dialog open={isCloseSessionDialogOpen} onOpenChange={setCloseSessionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
            <DialogDescription>
              Ingresa el monto real contado en caja para cerrar la sesion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Balance esperado</span>
              <span className="text-base font-bold tabular-nums">{fmtCurrency(currentBalance)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing-amount">Monto de cierre (real)</Label>
              <Input
                id="closing-amount"
                type="number"
                step="0.01"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="h-11 text-base font-semibold tabular-nums"
              />
            </div>

            {closingAmount && Number(closingAmount) !== currentBalance && (
              <div className={cn(
                "flex items-center gap-2 rounded-lg p-3 text-sm font-medium",
                Number(closingAmount) > currentBalance
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
              )}>
                {Number(closingAmount) > currentBalance
                  ? <ArrowUpCircle className="h-4 w-4" />
                  : <ArrowDownCircle className="h-4 w-4" />}
                Diferencia: {fmtCurrency(Math.abs(Number(closingAmount) - currentBalance))}
                {Number(closingAmount) > currentBalance ? " sobrante" : " faltante"}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="closing-notes">Observaciones</Label>
              <Input
                id="closing-notes"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Incidencias, faltantes o sobrantes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseSessionDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleCloseSubmit}
              loading={loadingClosing}
              disabled={!closingAmount}
            >
              Cerrar sesion
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Register Movement Dialog ── */}
      <Dialog open={isNewMovementDialogOpen} onOpenChange={setNewMovementDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              Balance actual: {fmtCurrency(currentBalance)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Ingreso</SelectItem>
                    <SelectItem value="OUT">Egreso</SelectItem>
                    <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {movementType === "ADJUSTMENT" ? (
                <div className="space-y-2">
                  <Label>Direccion</Label>
                  <Select value={movementDirection} onValueChange={setMovementDirection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Incremento (+)</SelectItem>
                      <SelectItem value="decrease">Decremento (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement-amount">Monto</Label>
              <Input
                id="movement-amount"
                type="number"
                step="0.01"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="h-11 text-base font-semibold tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement-reason">Motivo</Label>
              <Input
                id="movement-reason"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Descripcion del movimiento"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleRegisterSubmit}
              loading={loadingRegistering}
              disabled={!movementAmount}
            >
              Guardar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
