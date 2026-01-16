export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { generarDocumentoCredito } from "@/lib/utils/documento-credito-pdflib";
import { PrismaClient, Convenio } from "@prisma/client";

/**
 * Convierte string (RAW SQL) -> enum Convenio (Prisma)
 * Acepta exactamente los 3 valores del enum.
 */
function asConvenio(v: string | null): Convenio | null {
  if (!v) return null;
  const s = v.trim().toUpperCase();

  if (s === "TRES_DE_ABRIL") return Convenio.TRES_DE_ABRIL;
  if (s === "CENTRO") return Convenio.CENTRO;
  if (s === "CLINICA_SAN_RAFAEL") return Convenio.CLINICA_SAN_RAFAEL;

  return null;
}

export async function GET(req: Request) {
  let prismaNoRLS: PrismaClient | null = null;

  try {
    const serverUser = await getServerUser();
    if (!serverUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { userId: clerkId, mutualId } = serverUser;

    if (!mutualId || !Number.isFinite(mutualId)) {
      return NextResponse.json(
        { error: "MutualId faltante o inválido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const idCreditoParam = searchParams.get("id");

    if (!idCreditoParam) {
      return NextResponse.json(
        { error: "ID de crédito requerido" },
        { status: 400 }
      );
    }

    const idCredito = parseInt(idCreditoParam, 10);
    if (!Number.isFinite(idCredito)) {
      return NextResponse.json(
        { error: "ID de crédito inválido" },
        { status: 400 }
      );
    }

    // ✅ Crédito con RLS
    const creditoCompleto = await withRLS(mutualId, clerkId, async (tx) => {
      return tx.credito.findUnique({
        where: { id_credito: idCredito },
        include: {
          asociado: true,
          producto: true,
          mutual: true,
        },
      });
    });

    if (!creditoCompleto) {
      return NextResponse.json({ error: "Crédito no encontrado" }, { status: 404 });
    }

    // ✅ Prisma sin RLS (solo para leer convenio "crudo")
    prismaNoRLS = new PrismaClient();

    const rows = await prismaNoRLS.$queryRaw<Array<{ convenio: string | null }>>`
      SELECT convenio::text AS convenio
      FROM asociados
      WHERE id_asociado = ${creditoCompleto.id_asociado}
      LIMIT 1
    `;

    const convenioAsociadoRaw = rows[0]?.convenio ?? null;
    const convenioAsociado = asConvenio(convenioAsociadoRaw);

    // ✅ Generar PDF
    const pdfBuffer = await generarDocumentoCredito({
      credito: {
        id_credito: creditoCompleto.id_credito,
        monto: creditoCompleto.monto,
        numero_cuotas: creditoCompleto.numero_cuotas,
        tasa_interes: creditoCompleto.tasa_interes,
        fecha_creacion: creditoCompleto.fecha_creacion,
        primera_venc: creditoCompleto.primera_venc,
        producto: creditoCompleto.producto,
      },
      asociado: {
        ...creditoCompleto.asociado,

        // ✅ ahora tipado correcto: Convenio | null
        convenio: convenioAsociado,

        // ✅ normalizaciones para el PDF
        fecha_nac: creditoCompleto.asociado.fecha_nac
          ? creditoCompleto.asociado.fecha_nac.toISOString().split("T")[0]
          : null,

        nombre: creditoCompleto.asociado.nombre ?? null,
        apellido: creditoCompleto.asociado.apellido ?? null,
        cuit: creditoCompleto.asociado.cuit ?? null,
        localidad: creditoCompleto.asociado.localidad ?? null,
        provincia: creditoCompleto.asociado.provincia ?? null,
        telefono: creditoCompleto.asociado.telefono ?? null,
        email: creditoCompleto.asociado.email ?? null,
        sueldo_mes: creditoCompleto.asociado.sueldo_mes ?? null,
        sueldo_ano: creditoCompleto.asociado.sueldo_ano ?? null,
      },
      mutual: creditoCompleto.mutual,
    });

    const fileName = `solicitud-${idCredito}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("❌ Error al generar documento de crédito:", error);
    return NextResponse.json(
      { error: "Error al generar documento" },
      { status: 500 }
    );
  } finally {
    if (prismaNoRLS) {
      await prismaNoRLS.$disconnect();
    }
  }
}
