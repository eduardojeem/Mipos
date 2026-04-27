"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  Building2,
  Clock,
  Monitor,
  Wallet,
} from "lucide-react";
import { useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import {
  useCurrentOrganizationId,
  useCurrentOrganizationName,
} from "@/hooks/use-current-organization";
import { MAX_CASH_OPENING_AMOUNT } from "@/lib/cash/constants";
import { getClientOperationalContext } from "@/lib/operational-context";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

interface OpenCashSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number, notes?: string) => void;
  isLoading: boolean;
  /** If true, auto-close when session becomes open */
  sessionOpen?: boolean;
}

type OperationalContextState = {
  branchId: string | null;
  posId: string | null;
  registerId: string | null;
};

const PRESET_AMOUNTS = [0, 50_000, 100_000, 200_000, 500_000];
const NOTES_MAX_LENGTH = 200;
const LOCALSTORAGE_KEY = "cash:lastOpeningAmount";

function sanitizeAmountInput(value: string): string {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [integerPart, ...decimalParts] = normalized.split(".");
  if (decimalParts.length === 0) return integerPart;
  return `${integerPart}.${decimalParts.join("").slice(0, 2)}`;
}

function formatOperationalValue(value: string | null, fallback: string): string {
  return value?.trim() || fallback;
}

export default function OpenCashSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  sessionOpen = false,
}: OpenCashSessionDialogProps) {
  const fmtCurrency = useCurrencyFormatter();
  const organizationId = useCurrentOrganizationId();
  const organizationName = useCurrentOrganizationName();

  const [operationalContext, setOperationalContext] = useState<OperationalContextState>(
    () => getClientOperationalContext(),
  );
  const [previewTime, setPreviewTime] = useState<Date>(() => new Date());
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);

  // Sync context and restore last amount when dialog opens
  useEffect(() => {
    if (!open) return;

    setPreviewTime(new Date());
    setErrors([]);
    setOperationalContext(getClientOperationalContext());

    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY);
      if (saved) setAmount(saved);
    } catch { /* ignore */ }

    const syncCtx = () => setOperationalContext(getClientOperationalContext());
    window.addEventListener("storage", syncCtx);
    window.addEventListener("organization-changed", syncCtx as EventListener);
    return () => {
      window.removeEventListener("storage", syncCtx);
      window.removeEventListener("organization-changed", syncCtx as EventListener);
    };
  }, [open]);

  // Auto-close when session becomes open
  useEffect(() => {
    if (open && sessionOpen && !isLoading) {
      onOpenChange(false);
      resetForm();
    }
  }, [open, sessionOpen, isLoading, onOpenChange]);

  const amountNumber = amount.trim() === "" ? null : Number(amount);
  const amountPreview =
    amountNumber != null && Number.isFinite(amountNumber) ? amountNumber : 0;

  const resetForm = useCallback(() => {
    setAmount("");
    setNotes("");
    setErrors([]);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (isLoading && !nextOpen) return;
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  }, [isLoading, onOpenChange, resetForm]);

  const handleAmountChange = useCallback((value: string) => {
    setAmount(sanitizeAmountInput(value));
    if (errors.length > 0) setErrors([]);
  }, [errors.length]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value.slice(0, NOTES_MAX_LENGTH));
    if (errors.length > 0) setErrors([]);
  }, [errors.length]);

  const handleQuickAmount = useCallback((value: number) => {
    setAmount(value.toString());
    if (errors.length > 0) setErrors([]);
  }, [errors.length]);

  const handleSubmit = useCallback(() => {
    const parsed = Math.round((Number(amount) || 0) * 100) / 100;
    const errs: string[] = [];

    if (!organizationId) errs.push("Selecciona una organización antes de abrir la caja.");
    if (amount.trim() === "") {
      errs.push("Ingresa el monto de apertura.");
    } else if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      errs.push("Ingresa un monto válido.");
    } else if (parsed < 0) {
      errs.push("El monto de apertura no puede ser negativo.");
    } else if (parsed > MAX_CASH_OPENING_AMOUNT) {
      errs.push(`El monto de apertura no puede superar ${fmtCurrency(MAX_CASH_OPENING_AMOUNT)}.`);
    }

    if (errs.length > 0) { setErrors(errs); return; }

    onConfirm(parsed, notes.trim() || undefined);
    try { localStorage.setItem(LOCALSTORAGE_KEY, String(parsed)); } catch { /* ignore */ }
  }, [amount, notes, organizationId, fmtCurrency, onConfirm]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (event.key === "Escape") { event.preventDefault(); handleOpenChange(false); return; }
    if (event.key === "Enter" && !event.shiftKey && target?.tagName !== "TEXTAREA") {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleOpenChange, handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-xl"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-5 text-white dark:from-emerald-700 dark:to-teal-700">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-3 text-xl text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Wallet className="h-5 w-5" />
              </div>
              Abrir Caja
            </DialogTitle>
            <DialogDescription className="text-emerald-100">
              Inicia una nueva sesión de caja para registrar operaciones.
            </DialogDescription>
          </DialogHeader>

          {/* Context chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-sm hover:bg-white/20">
              <Building2 className="mr-1.5 h-3 w-3" />
              {organizationName || "Sin organización"}
            </Badge>
            {operationalContext.branchId && (
              <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-sm hover:bg-white/20">
                <Building2 className="mr-1.5 h-3 w-3" />
                {formatOperationalValue(operationalContext.branchId, "Global")}
              </Badge>
            )}
            {operationalContext.posId && (
              <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-sm hover:bg-white/20">
                <Monitor className="mr-1.5 h-3 w-3" />
                {formatOperationalValue(operationalContext.posId, "Caja principal")}
              </Badge>
            )}
            <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-sm hover:bg-white/20">
              <Clock className="mr-1.5 h-3 w-3" />
              {previewTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Organization missing alert */}
          {!organizationId && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-sm">Selecciona una organización antes de abrir la caja.</p>
            </div>
          )}

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="cash-opening-amount" className="text-sm font-semibold">
              Monto de apertura
            </Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cash-opening-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                autoFocus
                disabled={isLoading}
                className={cn(
                  "h-12 pl-9 text-lg font-semibold tabular-nums",
                  errors.length > 0 && "border-destructive focus-visible:ring-destructive",
                )}
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-semibold">Montos rápidos</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PRESET_AMOUNTS.map((preset) => {
                const isSelected = amount === preset.toString();
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickAmount(preset)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-all",
                      "hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-border bg-background",
                      isLoading && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {preset === 0 ? "Sin fondo" : fmtCurrency(preset)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cash-opening-notes" className="text-sm font-semibold">
                Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {notes.length}/{NOTES_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="cash-opening-notes"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Ej: Apertura turno mañana, fondo para cambio..."
              rows={2}
              maxLength={NOTES_MAX_LENGTH}
              disabled={isLoading}
              className="resize-none text-sm"
            />
          </div>

          {/* Preview summary */}
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Fondo inicial</span>
              <span className="text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-100">
                {amount.trim() === ""
                  ? "—"
                  : amountPreview === 0
                    ? "Sin fondo"
                    : fmtCurrency(amountPreview)}
              </span>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="space-y-0.5">
                {errors.map((error) => (
                  <p key={error} className="text-sm">{error}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={isLoading}
            loadingText="Abriendo..."
            disabled={isLoading || !organizationId || amount.trim() === ""}
            icon={<Wallet className="h-4 w-4" />}
            className="min-w-[140px] bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            Abrir caja
          </LoadingButton>
        </DialogFooter>

        {/* Keyboard hint */}
        <div className="flex-shrink-0 border-t px-6 py-2 text-center text-xs text-muted-foreground">
          <kbd className="rounded bg-muted px-2 py-0.5 text-xs">Enter</kbd> para confirmar ·{" "}
          <kbd className="rounded bg-muted px-2 py-0.5 text-xs">Esc</kbd> para cancelar
        </div>
      </DialogContent>
    </Dialog>
  );
}
