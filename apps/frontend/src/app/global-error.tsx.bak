"use client";
import React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Error global de la aplicación</h1>
            <p className="text-muted-foreground">
              {error?.message || "Se produjo un error inesperado."}
            </p>
            {error?.digest && (
              <p className="text-xs text-muted-foreground">Referencia: {error.digest}</p>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button className="px-3 py-2 border rounded" onClick={() => window.location.reload()}>Recargar</button>
              <button className="px-3 py-2 bg-primary text-primary-foreground rounded" onClick={reset}>Reintentar</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}