"use client";
import React from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Ha ocurrido un error</h1>
        <p className="text-muted-foreground">
          {error?.message || "Algo salió mal al renderizar esta página."}
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground">Referencia: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" onClick={() => window.location.reload()}>Recargar</Button>
          <Button onClick={reset}>Reintentar</Button>
        </div>
      </div>
    </div>
  );
}