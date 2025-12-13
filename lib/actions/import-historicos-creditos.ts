"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCredito, EstadoCuota, VencimientoRegla } from "@prisma/client";

export async function importHistoricosCreditosAction(formData: FormData) {
    console.log("🔥 IMPORT HISTÓRICOS — INICIANDO");

    const file = formData.get("file") as File | null;
    if (!file) return { ok: false, error: "No se subió archivo" };

    const info = await getServerUser();
    if (!info?.mutualId) return { ok: false, error: "Usuario no autenticado" };

    const mutualId = info.mutualId;

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`📄 Filas leídas: ${rows.length}`);

    function parseFecha(v: any): Date | null {
        if (!v) return null;

        if (typeof v === "number" && v > 30000 && v < 60000) {
            const d = XLSX.SSF.parse_date_code(v);
            return new Date(d.y, d.m - 1, d.d);
        }

        if (typeof v === "number" && v > 19000000) {
            const s = String(v);
            return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
        }

        if (typeof v === "string") {
            const d = new Date(v);
            if (!isNaN(d.getTime())) return d;
        }

        return null;
    }

    type Row = {
        codigo: number;
        nrocuo: number;
        cancuo: number;
        fechaven: Date | null;
        debe: number;
        concepto: string;
        tipoa?: number;
        garantia: string;
    };

    const parsed: Row[] = rows.map((r: any) => ({
        codigo: Number(r.codigo),
        nrocuo: Number(r.nrocuo),
        cancuo: Number(r.cancuo ?? 0),
        fechaven: parseFecha(r.fechaven),
        debe: Number(r.debe ?? 0),
        concepto: String(r.concepto ?? "").trim(),
        tipoa: r.tipoa ? Number(r.tipoa) : undefined,
        garantia: String(r.garantia ?? "").trim(),
    }));

    const grupos = new Map<number, Row[]>();
    for (const row of parsed) {
        if (!grupos.has(row.codigo)) grupos.set(row.codigo, []);
        grupos.get(row.codigo)!.push(row);
    }

    console.log(`📦 Créditos detectados: ${grupos.size}`);

    let creditosCreados = 0;
    let cuotasCreadas = 0;
    let cuotasIgnoradas = 0;
    const hoy = new Date();

    async function getOrCreateAsociado(nombre: string) {
        const exist = await prisma.asociado.findFirst({
            where: { id_mutual: mutualId, nombre: nombre.trim() }
        });
        if (exist) return exist;

        return prisma.asociado.create({
            data: {
                id_mutual: mutualId,
                nombre,
                apellido: "",
                tipo_persona: "fisica",
                telefono: "N/A",
                calle: "N/A",
                codigo_postal: "0",
                localidad: "N/A",
                provincia: "N/A",
                dec_jurada: false,
                recibe_notificaciones: false,
                saldo_disponible: 0
            }
        });
    }

    async function getOrCreateProducto(nombre: string, first: Row) {
        const exist = await prisma.producto.findFirst({
            where: { id_mutual: mutualId, nombre }
        });
        if (exist) return exist;

        return prisma.producto.create({
            data: {
                id_mutual: mutualId,
                nombre,
                numero_cuotas: first.cancuo || 1,
                tasa_interes: 0,
                dia_vencimiento: first.fechaven?.getDate() ?? 1,
                regla_vencimiento: VencimientoRegla.AJUSTAR_ULTIMO_DIA,
                comision_comerc: 0,
                comision_gestion: 0
            }
        });
    }

    for (const [codigo_externo, filas] of Array.from(grupos.entries())) {
        const ordenadas = [...filas].sort((a, b) => a.nrocuo - b.nrocuo);
        const first = ordenadas[0];

        if (!first.fechaven) {
            console.log(`⚠️ Crédito ${codigo_externo} omitido (sin fecha)`);
            continue;
        }

        let credito = await prisma.credito.findFirst({
            where: { codigo_externo }
        });

        if (!credito) {
            const asociado = await getOrCreateAsociado(first.concepto);
            const producto = await getOrCreateProducto(first.garantia, first);

            const total = ordenadas.reduce((a, r) => a + r.debe, 0);

            credito = await prisma.credito.create({
                data: {
                    id_mutual: mutualId,
                    id_asociado: asociado.id_asociado,
                    id_producto: producto.id_producto,
                    codigo_externo,
                    fecha_creacion: first.fechaven,
                    monto: total,
                    saldo_capital_inicial: total,
                    saldo_capital_actual: total,
                    cuotas_pagadas: 0,
                    cuotas_pendientes: first.cancuo,
                    estado: EstadoCredito.activo,
                    numero_cuotas: first.cancuo,
                    primera_venc: first.fechaven,
                    dia_vencimiento: first.fechaven.getDate(),
                    tasa_interes: 0,
                    tipo_operacion: "credito",
                    fuente_financiamiento_externa: "fondo-propio",

                    // 🔥 CAMPOS OBLIGATORIOS FALTANTES
                    usuario_creacion: info.user.emailAddresses?.[0]?.emailAddress ?? "import",
                    regla_vencimiento: VencimientoRegla.AJUSTAR_ULTIMO_DIA
                }
            });

            creditosCreados++;
            console.log(`✔ Crédito creado → ID interno ${credito.id_credito}`);
        }

        for (const r of ordenadas) {
            if (!r.fechaven) continue;

            const existe = await prisma.cuota.findFirst({
                where: {
                    id_credito: credito.id_credito,
                    numero_cuota: r.nrocuo,
                    fecha_vencimiento: r.fechaven,
                    monto_total: r.debe
                }
            });

            if (existe) {
                cuotasIgnoradas++;
                continue;
            }

            await prisma.cuota.create({
                data: {
                    id_credito: credito.id_credito,
                    numero_cuota: r.nrocuo,
                    fecha_vencimiento: r.fechaven,
                    monto_capital: r.debe,
                    monto_interes: 0,
                    monto_total: r.debe,
                    interes_punitorio: 0,
                    estado: r.fechaven < hoy ? EstadoCuota.pagada : EstadoCuota.pendiente
                }
            });

            cuotasCreadas++;
        }
    }

    console.log(`
=====================================
      🟢 IMPORTACIÓN COMPLETADA
=====================================
Créditos creados:  ${creditosCreados}
Cuotas creadas:    ${cuotasCreadas}
Cuotas ignoradas:  ${cuotasIgnoradas}
=====================================
`);

    return { ok: true, creditosCreados, cuotasCreadas, cuotasIgnoradas };
}
