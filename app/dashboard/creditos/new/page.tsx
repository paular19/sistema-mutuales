import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { createCredito } from "@/lib/actions/creditos";
import { CreditoForm } from "@/components/creditos/credito-form";

export default async function NewCreditoPage() {
  // 🔹 Obtener usuario + mutualId
  const info = await getServerUser();
  if (!info || !info.mutualId) {
    throw new Error("No se pudo obtener el usuario o el mutualId");
  }

  // 🔹 Ejecutamos la consulta dentro del contexto RLS
  const { asociados, productos } = await withRLS(
    info.mutualId,
    info.userId,
    async (prisma) => {
      const asociados = await prisma.asociado.findMany({
        select: { id_asociado: true, nombre: true, apellido: true, razon_social: true, tipo_persona: true, },
        orderBy: { apellido: "asc" },
      });

      const productos = await prisma.producto.findMany({
        where: { activo: true },
        select: {
          id_producto: true,
          nombre: true,
          numero_cuotas: true,
          tasa_interes: true,
          comision_comerc: true,
          dia_vencimiento: true,
          regla_vencimiento: true,
          comision_gestion: true,
        },
        orderBy: { nombre: "asc" },
      });

      return { asociados, productos };
    }
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nuevo Crédito</h1>
      </div>

      <CreditoForm
        action={createCredito}
        asociados={asociados}
        productos={productos}
      />
    </div>
  );
}
