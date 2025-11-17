
export function CancelacionesHeader({ periodo }: { periodo: string }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cancelaciones</h1>
        <p className="text-sm text-muted-foreground">
          Detalle de cuotas abonadas e impagas correspondientes al período{" "}
          <strong>{periodo}</strong>.
        </p>
      </div>
    </div>
  );
}
