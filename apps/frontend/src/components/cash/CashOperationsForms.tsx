"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-states";
import { WithPermission } from "@/components/auth/UnifiedPermissionGuard";

export default function CashOperationsForms({
  sessionOpen,
  currentBalance,
  loadingOpening,
  loadingClosing,
  loadingRegistering,
  onOpen,
  onRequestClose,
  onRequestRegister,
}: {
  sessionOpen: boolean
  currentBalance: number
  loadingOpening: boolean
  loadingClosing: boolean
  loadingRegistering: boolean
  onOpen: (amount: number, notes?: string) => void
  onRequestClose: (amount: number) => void
  onRequestRegister: (payload: { type: string; direction?: "increase" | "decrease"; amount: number; reason?: string }) => void
}) {
  const [openingAmount, setOpeningAmount] = useState<string>("");
  const [openingNotes, setOpeningNotes] = useState<string>("");
  useEffect(() => {
    try {
      const v = localStorage.getItem("cash:lastOpeningAmount");
      if (v) setOpeningAmount(v);
    } catch {}
  }, []);
  const [closingAmount, setClosingAmount] = useState<string>("");
  const [movementType, setMovementType] = useState<string>("IN");
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [movementReason, setMovementReason] = useState<string>("");
  const [movementDirection, setMovementDirection] = useState<string>("increase");

  const handleOpen = () => {
    const amount = Math.round(parseFloat(openingAmount || "0") * 100) / 100;
    if (!Number.isFinite(amount) || amount < 0) return;
    onOpen(amount, openingNotes?.trim() || undefined);
    setOpeningAmount("");
    setOpeningNotes("");
    try { localStorage.setItem("cash:lastOpeningAmount", String(amount)); } catch {}
  };

  const handleRequestClose = () => {
    const amount = parseFloat(closingAmount || "0");
    if (!Number.isFinite(amount) || amount < 0) return;
    onRequestClose(amount);
  };

  const handleRequestRegister = () => {
    const amount = parseFloat(movementAmount || "0");
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (movementType === "OUT" && amount > currentBalance) return;
    onRequestRegister({ type: movementType, direction: movementDirection as any, amount, reason: movementReason || undefined });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sessionOpen ? (
            <div className="space-y-2">
              <Label className="text-sm">Monto de apertura</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleOpen(); }}
                placeholder="0.00"
              />
              <Label className="text-sm" htmlFor="opening-notes">Notas de apertura (opcional)</Label>
              <Input id="opening-notes" type="text" value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} placeholder="Ej: Fondo de caja inicial" />
              <div className="flex gap-2">
                {["0","50","100","200","500"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="text-xs px-2 py-1 rounded border"
                    onClick={() => setOpeningAmount(p)}
                    disabled={loadingOpening}
                  >{p}</button>
                ))}
              </div>
              <WithPermission resource="cash" action="open">
                <LoadingButton onClick={handleOpen} loading={loadingOpening} disabled={!openingAmount || loadingOpening}>
                  Abrir sesión
                </LoadingButton>
              </WithPermission>
              <div className="text-xs text-muted-foreground">Define el monto inicial en caja. Puedes ajustar luego con movimientos.</div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm">Monto de cierre</Label>
              <Input type="number" value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} placeholder="0.00" />
              <WithPermission resource="cash" action="close">
                <LoadingButton variant="destructive" onClick={handleRequestClose} loading={loadingClosing} disabled={!closingAmount || loadingClosing}>
                  Cerrar sesión
                </LoadingButton>
              </WithPermission>
            </div>
          )}
        </CardContent>
      </Card>

      {sessionOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Movimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-sm">Tipo</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Ingreso</SelectItem>
                    <SelectItem value="OUT">Egreso</SelectItem>
                    <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {movementType === "ADJUSTMENT" && (
                <div>
                  <Label className="text-sm">Dirección</Label>
                  <Select value={movementDirection} onValueChange={setMovementDirection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona dirección" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Incremento (+)</SelectItem>
                      <SelectItem value="decrease">Decremento (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-sm" htmlFor="movement-amount">Monto</Label>
                <Input id="movement-amount" type="number" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm" htmlFor="movement-reason">Motivo</Label>
                <Input id="movement-reason" type="text" value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Descripción opcional" />
              </div>
            </div>
            <WithPermission resource="cash" action="move">
              <LoadingButton onClick={handleRequestRegister} loading={loadingRegistering} disabled={!movementAmount || loadingRegistering}>
                Guardar movimiento
              </LoadingButton>
            </WithPermission>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
