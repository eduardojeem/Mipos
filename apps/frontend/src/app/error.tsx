"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Ha ocurrido un error</h1>
        <p className="text-muted-foreground">
          Algo salió mal al renderizar esta página.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button 
            className="px-3 py-2 border rounded" 
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
          <button 
            className="px-3 py-2 bg-primary text-primary-foreground rounded" 
            onClick={reset}
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}