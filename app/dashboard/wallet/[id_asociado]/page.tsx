import { getAsociadoWallet } from "@/lib/queries/wallet";
import { ingresarSaldo } from "@/lib/actions/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function WalletPage(props: {
  params: Promise<{ id_asociado: string }>;
}) {

  const { id_asociado } = await props.params;

  const id = Number(id_asociado);
  const data = await getAsociadoWallet(id);

  if (!data) {
    return <p className="text-red-500">Asociado no encontrado</p>;
  }


  return (
    <div className="space-y-6 max-w-xl mx-auto py-8">

      <Link href={`/dashboard/creditos/${data.credito?.id_credito}/cuotas`}>
        <Button variant="ghost">← Volver al crédito</Button>
      </Link>

      <h1 className="text-3xl font-bold">Wallet de {data.asociado.apellido} {data.asociado.nombre}</h1>

      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Saldo disponible</p>
        <p className="text-2xl font-semibold">${data.asociado.saldo_disponible.toFixed(2)}</p>
      </div>

      {/* Ingresar saldo */}
      <form action={ingresarSaldo} className="space-y-4">
        <input type="hidden" name="id_asociado" value={id_asociado} />

        <Input 
          type="number" 
          step="0.01" 
          min="0" 
          name="monto" 
          placeholder="Monto a ingresar"
          required 
        />

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
          Ingresar saldo
        </Button>
      </form>

      {data.cuotasPendientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Cuotas pendientes</h2>

          <ul className="space-y-2">
            {data.cuotasPendientes.map((c) => (
              <li key={c.id_cuota} className="border rounded-lg p-3 flex justify-between">
                <span>Cuota #{c.numero_cuota}</span>
                <span>${c.monto_total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
