export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-muted-foreground">
          La página que buscas no existe.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <a 
            href="/" 
            className="px-3 py-2 bg-primary text-primary-foreground rounded"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}