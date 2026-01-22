"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-states";
import type { MovementType } from "@/app/dashboard/cash/types/cash.types";

interface CashActionDialogsProps {
    isOpenSessionDialogOpen: boolean;
    setOpenSessionDialogOpen: (open: boolean) => void;
    isCloseSessionDialogOpen: boolean;
    setCloseSessionDialogOpen: (open: boolean) => void;
    isNewMovementDialogOpen: boolean;
    setNewMovementDialogOpen: (open: boolean) => void;

    onOpenSession: (amount: number, notes?: string) => void;
    onRequestCloseSession: (amount: number) => void;
    onRequestRegisterMovement: (payload: { type: MovementType; direction?: "increase" | "decrease"; amount: number; reason?: string }) => void;

    loadingOpening: boolean;
    loadingClosing: boolean;
    loadingRegistering: boolean;
    currentBalance: number;
}

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
    currentBalance
}: CashActionDialogsProps) {
    // States for Open Session
    const [openingAmount, setOpeningAmount] = useState<string>("");
    const [openingNotes, setOpeningNotes] = useState<string>("");

    // States for Close Session
    const [closingAmount, setClosingAmount] = useState<string>("");

    // States for New Movement
    const [movementType, setMovementType] = useState<string>("IN");
    const [movementAmount, setMovementAmount] = useState<string>("");
    const [movementReason, setMovementReason] = useState<string>("");
    const [movementDirection, setMovementDirection] = useState<string>("increase");

    // Load last opening amount
    useEffect(() => {
        if (isOpenSessionDialogOpen) {
            try {
                const v = localStorage.getItem("cash:lastOpeningAmount");
                if (v) setOpeningAmount(v);
            } catch { }
        }
    }, [isOpenSessionDialogOpen]);

    const handleOpenSubmit = () => {
        const amount = Math.round(parseFloat(openingAmount || "0") * 100) / 100;
        if (!Number.isFinite(amount) || amount < 0) return;
        onOpenSession(amount, openingNotes?.trim() || undefined);
        setOpenSessionDialogOpen(false);
        setOpeningAmount("");
        setOpeningNotes("");
        try { localStorage.setItem("cash:lastOpeningAmount", String(amount)); } catch { }
    };

    const handleCloseSubmit = () => {
        const amount = parseFloat(closingAmount || "0");
        if (!Number.isFinite(amount) || amount < 0) return;
        onRequestCloseSession(amount);
        setCloseSessionDialogOpen(false);
        setClosingAmount("");
    };

    const handleRegisterSubmit = () => {
        const amount = parseFloat(movementAmount || "0");
        if (!Number.isFinite(amount) || amount <= 0) return;
        if (movementType === "OUT" && amount > currentBalance) return; // Basic validation

        onRequestRegisterMovement({
            type: movementType as MovementType,
            direction: movementDirection as any,
            amount,
            reason: movementReason || undefined
        });
        setNewMovementDialogOpen(false);
        setMovementAmount("");
        setMovementReason("");
        setMovementType("IN");
    };

    return (
        <>
            {/* Open Session Dialog */}
            <Dialog open={isOpenSessionDialogOpen} onOpenChange={setOpenSessionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Abrir Caja</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Monto de apertura</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={openingAmount}
                                onChange={(e) => setOpeningAmount(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notas (opcional)</Label>
                            <Input
                                value={openingNotes}
                                onChange={(e) => setOpeningNotes(e.target.value)}
                                placeholder="Ej: Fondo inicial"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {["0", "50", "100", "200", "500"].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className="text-xs px-2 py-1 rounded border hover:bg-muted"
                                    onClick={() => setOpeningAmount(p)}
                                >{p}</button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenSessionDialogOpen(false)}>Cancelar</Button>
                        <LoadingButton onClick={handleOpenSubmit} loading={loadingOpening} disabled={!openingAmount}>
                            Abrir Sesión
                        </LoadingButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Session Dialog */}
            <Dialog open={isCloseSessionDialogOpen} onOpenChange={setCloseSessionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cerrar Caja</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Balance esperado en sistema:</span>
                                <span className="font-bold">${currentBalance.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Ingrese el monto real contado en caja. El sistema calculará la diferencia automáticamente.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Monto de cierre (Real)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={closingAmount}
                                onChange={(e) => setClosingAmount(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloseSessionDialogOpen(false)}>Cancelar</Button>
                        <LoadingButton variant="destructive" onClick={handleCloseSubmit} loading={loadingClosing} disabled={!closingAmount}>
                            Cerrar Sesión
                        </LoadingButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Movement Dialog */}
            <Dialog open={isNewMovementDialogOpen} onOpenChange={setNewMovementDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Movimiento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
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
                            {movementType === "ADJUSTMENT" && (
                                <div className="space-y-2">
                                    <Label>Dirección</Label>
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
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Monto</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={movementAmount}
                                onChange={(e) => setMovementAmount(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo</Label>
                            <Input
                                value={movementReason}
                                onChange={(e) => setMovementReason(e.target.value)}
                                placeholder="Descripción del movimiento"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewMovementDialogOpen(false)}>Cancelar</Button>
                        <LoadingButton onClick={handleRegisterSubmit} loading={loadingRegistering} disabled={!movementAmount}>
                            Guardar
                        </LoadingButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
