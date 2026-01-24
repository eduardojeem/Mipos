'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold mb-2">Se produjo un error</h1>
            <p className="text-muted-foreground mb-4">
              Intenta recargar la página o volver al inicio.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white"
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
