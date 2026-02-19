// "use server";

// import * as XLSX from "xlsx";
// import { prisma } from "@/lib/db/prisma";
// import { getServerUser } from "@/lib/auth/get-server-user";
// import { EstadoCredito, EstadoCuota, VencimientoRegla } from "@prisma/client";

// export async function importHistoricosCreditosAction(formData: FormData) {
//     console.log("🔥 IMPORT HISTÓRICOS — INICIANDO");

//     const file = formData.get("file") as File | null;
//     if (!file) return { ok: false, error: "No se subió archivo" };

//     const info = await getServerUser();
//     if (!info?.mutualId) return { ok: false, error: "Usuario no autenticado" };

//     const mutualId = info.mutualId;

//     const buffer = Buffer.from(await file.arrayBuffer());
//     const workbook = XLSX.read(buffer);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     console.log(`📄 Filas leídas: ${rows.length}`);

//     function parseFecha(v: any): Date | null {
//         if (!v) return null;

//         if (typeof v === "number" && v > 30000 && v < 60000) {
//             const d = XLSX.SSF.parse_date_code(v);
//             return new Date(d.y, d.m - 1, d.d);
//         }

//         if (typeof v === "number" && v > 19000000) {
//             const s = String(v);
//             return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
//         }

//         if (typeof v === "string") {
//             const d = new Date(v);
//             if (!isNaN(d.getTime())) return d;
//         }

//         return null;
//     }

//     type Row = {
//         codigo: number;
//         nrocuo: number;
//         cancuo: number;
//         fechaven: Date | null;
//         debe: number;
//         concepto: string;
//         tipoa?: number;
//         garantia: string;
//     };

//     const parsed: Row[] = rows.map((r: any) => ({
//         codigo: Number(r.codigo),
//         nrocuo: Number(r.nrocuo),
//         cancuo: Number(r.cancuo ?? 0),
//         fechaven: parseFecha(r.fechaven),
//         debe: Number(r.debe ?? 0),
//         concepto: String(r.concepto ?? "").trim(),
//         tipoa: r.tipoa ? Number(r.tipoa) : undefined,
//         garantia: String(r.garantia ?? "").trim(),
//     }));

//     const grupos = new Map<number, Row[]>();
//     for (const row of parsed) {
//         if (!grupos.has(row.codigo)) grupos.set(row.codigo, []);
//         grupos.get(row.codigo)!.push(row);
//     }

//     console.log(`📦 Créditos detectados: ${grupos.size}`);

//     let creditosCreados = 0;
//     let cuotasCreadas = 0;
//     let cuotasIgnoradas = 0;
//     const hoy = new Date();

//     async function getOrCreateAsociado(nombre: string) {
//         const exist = await prisma.asociado.findFirst({
//             where: { id_mutual: mutualId, nombre: nombre.trim() }
//         });
//         if (exist) return exist;

//         return prisma.asociado.create({
//             data: {
//                 id_mutual: mutualId,
//                 nombre,
//                 apellido: "",
//                 tipo_persona: "fisica",
//                 telefono: "N/A",
//                 calle: "N/A",
//                 codigo_postal: "0",
//                 localidad: "N/A",
//                 provincia: "N/A",
//                 dec_jurada: false,
//                 recibe_notificaciones: false,
//                 saldo_disponible: 0
//             }
//         });
//     }

//     async function getOrCreateProducto(nombre: string, first: Row) {
//         const exist = await prisma.producto.findFirst({
//             where: { id_mutual: mutualId, nombre }
//         });
//         if (exist) return exist;

//         return prisma.producto.create({
//             data: {
//                 id_mutual: mutualId,
//                 nombre,
//                 numero_cuotas: first.cancuo || 1,
//                 tasa_interes: 0,
//                 dia_vencimiento: first.fechaven?.getDate() ?? 1,
//                 regla_vencimiento: VencimientoRegla.AJUSTAR_ULTIMO_DIA,
//                 comision_comerc: 0,
//                 comision_gestion: 0
//             }
//         });
//     }

//     for (const [codigo_externo, filas] of Array.from(grupos.entries())) {
//         const ordenadas = [...filas].sort((a, b) => a.nrocuo - b.nrocuo);
//         const first = ordenadas[0];

//         if (!first.fechaven) {
//             console.log(`⚠️ Crédito ${codigo_externo} omitido (sin fecha)`);
//             continue;
//         }

//         let credito = await prisma.credito.findFirst({
//             where: { codigo_externo }
//         });

//         if (!credito) {
//             const asociado = await getOrCreateAsociado(first.concepto);
//             const producto = await getOrCreateProducto(first.garantia, first);

//             const total = ordenadas.reduce((a, r) => a + r.debe, 0);

//             credito = await prisma.credito.create({
//                 data: {
//                     id_mutual: mutualId,
//                     id_asociado: asociado.id_asociado,
//                     id_producto: producto.id_producto,
//                     codigo_externo,
//                     fecha_creacion: first.fechaven,
//                     monto: total,
//                     saldo_capital_inicial: total,
//                     saldo_capital_actual: total,
//                     cuotas_pagadas: 0,
//                     cuotas_pendientes: first.cancuo,
//                     estado: EstadoCredito.activo,
//                     numero_cuotas: first.cancuo,
//                     primera_venc: first.fechaven,
//                     dia_vencimiento: first.fechaven.getDate(),
//                     tasa_interes: 0,
//                     tipo_operacion: "credito",
//                     fuente_financiamiento_externa: "fondo-propio",

//                     // 🔥 CAMPOS OBLIGATORIOS FALTANTES
//                     usuario_creacion: info.user.emailAddresses?.[0]?.emailAddress ?? "import",
//                     regla_vencimiento: VencimientoRegla.AJUSTAR_ULTIMO_DIA
//                 }
//             });

//             creditosCreados++;
//             console.log(`✔ Crédito creado → ID interno ${credito.id_credito}`);
//         }

//         for (const r of ordenadas) {
//             if (!r.fechaven) continue;

//             const existe = await prisma.cuota.findFirst({
//                 where: {
//                     id_credito: credito.id_credito,
//                     numero_cuota: r.nrocuo,
//                     fecha_vencimiento: r.fechaven,
//                     monto_total: r.debe
//                 }
//             });

//             if (existe) {
//                 cuotasIgnoradas++;
//                 continue;
//             }

//             await prisma.cuota.create({
//                 data: {
//                     id_credito: credito.id_credito,
//                     numero_cuota: r.nrocuo,
//                     fecha_vencimiento: r.fechaven,
//                     monto_capital: r.debe,
//                     monto_interes: 0,
//                     monto_total: r.debe,
//                     interes_punitorio: 0,
//                     estado: r.fechaven < hoy ? EstadoCuota.pagada : EstadoCuota.pendiente
//                 }
//             });

//             cuotasCreadas++;
//         }
//     }

//     console.log(`
// =====================================
//       🟢 IMPORTACIÓN COMPLETADA
// =====================================
// Créditos creados:  ${creditosCreados}
// Cuotas creadas:    ${cuotasCreadas}
// Cuotas ignoradas:  ${cuotasIgnoradas}
// =====================================
// `);

//     return { ok: true, creditosCreados, cuotasCreadas, cuotasIgnoradas };
// }

"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCredito, EstadoCuota, VencimientoRegla } from "@prisma/client";

const SOCIOS_AUTORIZADOS = new Set(
  [
    "PONCE NESTOR DELFOR",
    "GIMENEZ GERMAN ORLANDO",
    "CHINCOLLA ESTER GRACIELA",
    "SANTIAGO PAULO MIGUEL",
    "PUCHI ADRIANA DEL CARMEN",
    "ADRIAN ENRIQUE TREJO MIRANDA",
    "BAZAN GUSTAVO MARCELO",
    "ROBLES MONICA ALEJANDRA",
    "SALDAÑO ARIEL JESUS PASTOR",
    "GONZALEZ VIVIANA AGUSTINA",
    "SCARPONI FERNANDO ADRIAN",
    "PASCUCCI AMALIA VIVIANA",
    "PONCE ADRIAN FEDERICO",
    "LOPEZ SANDRA GRACIELA",
    "OLIVA NORMA BEATRIZ",
    "FERREYRA LILIANA DEL VALLE",
    "VILLARRUEL PEDRO CESAR",
    "FLORES MARIA GABRIELA",
    "ROMERO ESTELA DE LAS MERCEDES",
    "SANCHEZ LAURA ANDREA",
    "MUÑOZ SONIA NOEMI",
    "OLIVA LIDIA NOEMI",
    "BAZAN OSCAR ENRIQUE",
    "ROSALES LUIS DARIO DEL VALLE",
    "SA JORGE DAVID",
    "MORENO CLAUDIO MAXIMILIANO",
    "URBANO LUIS RICARDO",
    "GARCIA BEATRIZ DEL VALLE",
    "TURRADO MARIANA",
    "JORDÁN LAZCANO MARÍA GUADALUPE",
    "ORONA NIEVA VANESA GISELA",
    "ZAPATA CINTIA MAGALI",
    "ZARATE EMMANUEL MATIAS",
    "BARBOZA VERONICA ANALIA",
    "BRIZUELA MONTIEL CRISTINA DEL VALLE",
    "ABREGO DANIELA BELEN",
    "AGUIRRE DANIELA DEL CARMEN",
    "PACETTI ALEJANDRO FEDERICO",
    "SUELDO SERGIO DAVID",
    "MONTA MARCELA ALEJANDRA",
    "GASTON MAXIMILIANO LIBERTINO",
    "CUELLO RICARDO ALEJANDRO",
    "PAEZ PABLO MATIAS",
    "CARRIZO CECILIA BEATRIZ",
    "QUIÑONES MARCOS CARLOS",
    "PABLO MANUEL BURGOS",
    "GUEVARA ESMERALDA MARYAN",
    "BUSTOS NATALIA JACQUELINE",
    "FARIAS ROBERTO",
    "QUISPE XIMENA JULIA",
    "ORODA PABLO DANIEL",
    "CORTEZ FERREYRA LUANA",
    "GIGENA ERNESTO RAUL",
    "IRAZOQUE MARCOS MATIAS",
    "SALGADO GUSTAVO ORLANDO",
    "GONZALO MOISES SOSA",
    "VALLEJOS JOSE LUIS",
    "SUARES TOMAS EZEQUIEL",
    "ANTINORI GENESIS",
    "MORILLO LEANDRO EMANUEL",
    "MOREYRA MATIAS GERARDO",
    "SOSA RICARDO ANDRES",
    "SORIA WALTER DAVID",
    "OSCAR EMILIO PALACIOS",
    "ORTEGA MIGUEL ANGEL",
    "BRITO IBAÑEZ SERGIO OSCAR",
    "LUJAN RODOLFO DANIEL",
    "BERBOTTO MIGUEL IGNACIO",
    "GOMEZ GRISELDA LILIANA",
    "ARIAS KEVIN GABRIEL",
    "FERREYRA AMELIA NOEMI",
    "GONZALEZ LOPEZ RAUL ARIEL",
    "AMUCHASTEGUI JAVIER ADRIAN",
    "MORENO FRANCO IVAN",
    "LOPEZ MARIA NATALIA",
    "SALTEÑO ANGEL DANIEL",
    "RODOLFO RAMON NIEVA",
    "TOLAY EDUARDO AGUSTIN",
    "FERNANDEZ MARIELA SOLEDAD",
    "MANSILLA ROQUE GUSTAVO",
    "OVIEDO HECTOR EMMANUEL",
  ].map(normalizeText)
);

function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseFecha(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === "number" && value > 30000 && value < 60000) {
    const d = XLSX.SSF.parse_date_code(value);
    return new Date(d.y, d.m - 1, d.d);
  }

  if (typeof value === "number" && value > 19000000) {
    const s = String(value);
    return new Date(
      Number(s.slice(0, 4)),
      Number(s.slice(4, 6)) - 1,
      Number(s.slice(6, 8))
    );
  }

  if (typeof value === "string") {
    const ddmmyyyy = value.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function parseMonto(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

function getHeaderValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = normalizeText(key).replace(/_/g, "");
    if (aliases.some((alias) => normalizedKey === normalizeText(alias).replace(/_/g, ""))) {
      return value;
    }
  }
  return undefined;
}

function getAsociadoNombreCompleto(asociado: {
  nombre: string | null;
  apellido: string | null;
  razon_social: string | null;
}): string {
  if (asociado.razon_social) return asociado.razon_social;
  return `${asociado.apellido ?? ""} ${asociado.nombre ?? ""}`.trim();
}

type AsociadoLite = {
  id_asociado: number;
  nombre: string | null;
  apellido: string | null;
  razon_social: string | null;
};

export async function importHistoricosCreditosAction(formData: FormData) {
  console.log("🔥 IMPORT MASIVO DE CRÉDITOS — INICIANDO");

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "No se subió archivo" };

  const info = await getServerUser();
  if (!info?.mutualId) return { ok: false, error: "Usuario no autenticado" };

  const mutualId = info.mutualId;

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) {
    return { ok: false, error: "El archivo está vacío" };
  }

  console.log(`📄 Filas leídas: ${rows.length}`);

  type Row = {
    concepto: string;
    codigo: number;
    ayuda: number;
    nrocuo: number;
    cancuo: number;
    fechaven: Date | null;
    debe: number;
    garantia: string;
  };

  const parsed: Row[] = [];
  let filasInvalidas = 0;

  for (const raw of rows) {
    const concepto = String(getHeaderValue(raw, ["concepto", "nombre"]) ?? "").trim();
    const codigo = Number(getHeaderValue(raw, ["codigo", "id_asociado", "asociado"]));
    const ayuda = Number(getHeaderValue(raw, ["ayuda", "id_credito", "credito"]));
    const nrocuo = Number(getHeaderValue(raw, ["nrocuo", "numero_cuota", "nro_cuota"]));
    const cancuo = Number(getHeaderValue(raw, ["cancuo", "cantidad_cuotas", "cuotas"]));
    const fechaven = parseFecha(getHeaderValue(raw, ["fechaven", "fecha_vencimiento", "vencimiento"]));
    const garantia = String(getHeaderValue(raw, ["garantia", "producto"]) ?? "").trim();
    const debeRaw = getHeaderValue(raw, ["debe"]);
    const debe = parseMonto(debeRaw);

    if (
      !Number.isFinite(codigo) ||
      !Number.isFinite(ayuda) ||
      !Number.isFinite(nrocuo) ||
      debeRaw === undefined ||
      debeRaw === null ||
      String(debeRaw).trim() === ""
    ) {
      filasInvalidas++;
      continue;
    }

    parsed.push({
      concepto,
      codigo,
      ayuda,
      nrocuo,
      cancuo: Number.isFinite(cancuo) && cancuo > 0 ? cancuo : 1,
      fechaven,
      debe,
      garantia,
    });
  }

  if (parsed.length === 0) {
    return { ok: false, error: "No se encontraron filas válidas para importar" };
  }

  const grupos = new Map<number, Row[]>();
  for (const row of parsed) {
    if (!grupos.has(row.ayuda)) grupos.set(row.ayuda, []);
    grupos.get(row.ayuda)!.push(row);
  }

  console.log(`📦 Créditos detectados: ${grupos.size}`);

  const asociadosMutual = await prisma.asociado.findMany({
    where: { id_mutual: mutualId },
    select: {
      id_asociado: true,
      nombre: true,
      apellido: true,
      razon_social: true,
    },
  });

  const asociadosById = new Map<number, AsociadoLite>();
  const asociadosByNombre = new Map<string, AsociadoLite>();

  for (const asociado of asociadosMutual) {
    asociadosById.set(asociado.id_asociado, asociado);
    const nombreNormalizado = normalizeText(getAsociadoNombreCompleto(asociado));
    if (nombreNormalizado && !asociadosByNombre.has(nombreNormalizado)) {
      asociadosByNombre.set(nombreNormalizado, asociado);
    }
  }

  async function getOrCreateProducto(nombre: string, first: Row) {
    const nombreFinal = nombre.trim() || "Producto importado";
    const exist = await prisma.producto.findFirst({
      where: {
        id_mutual: mutualId,
        nombre: { equals: nombreFinal, mode: "insensitive" },
      },
    });
    if (exist) return exist;

    return prisma.producto.create({
      data: {
        id_mutual: mutualId,
        nombre: nombreFinal,
        tasa_interes: 0,
        dia_vencimiento: first.fechaven?.getDate() ?? 1,
        regla_vencimiento: VencimientoRegla.AJUSTAR_ULTIMO_DIA,
        comision_comerc: 0,
        comision_gestion: 0,
      },
    });
  }

  let creditosCreados = 0;
  let cuotasCreadas = 0;
  let cuotasIgnoradas = 0;
  let creditosOmitidosNoAutorizados = 0;
  let creditosOmitidosSinAsociado = 0;
  let creditosOmitidosOtraMutual = 0;
  const hoy = new Date();

  for (const [codigo_externo, filas] of Array.from(grupos.entries())) {
    const ordenadas = [...filas].sort((a, b) => a.nrocuo - b.nrocuo);
    const first = ordenadas[0];
    const conceptoConValor =
      ordenadas.find((row) => normalizeText(row.concepto).length > 0)?.concepto ??
      first.concepto;
    const nombreConcepto = normalizeText(conceptoConValor);

    if (!first.fechaven) {
      console.log(`⛔ Crédito ${codigo_externo} SALTEADO → sin fecha`);
      continue;
    }

    let asociado = asociadosById.get(first.codigo) ?? null;
    if (!asociado && nombreConcepto) {
      asociado = asociadosByNombre.get(nombreConcepto) ?? null;
    }

    const autorizadoPorConcepto = nombreConcepto
      ? SOCIOS_AUTORIZADOS.has(nombreConcepto)
      : false;

    const autorizadoPorDb = asociado
      ? SOCIOS_AUTORIZADOS.has(normalizeText(getAsociadoNombreCompleto(asociado)))
      : false;

    if (!autorizadoPorConcepto && !autorizadoPorDb) {
      creditosOmitidosNoAutorizados++;
      continue;
    }

    if (!asociado) {
      creditosOmitidosSinAsociado++;
      continue;
    }

    let credito = await prisma.credito.findFirst({
      where: { codigo_externo },
    });

    if (credito && credito.id_mutual !== mutualId) {
      creditosOmitidosOtraMutual++;
      continue;
    }

    if (!credito) {
      const nombreProducto = first.garantia;

      const producto = await getOrCreateProducto(nombreProducto, first);

      const total = ordenadas.reduce((a, r) => a + r.debe, 0);

      console.log("🟢 CREANDO CRÉDITO", {
        codigo_externo,
        asociado: getAsociadoNombreCompleto(asociado),
        producto: nombreProducto,
        total,
      });

      try {
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
            usuario_creacion:
              info.user.emailAddresses?.[0]?.emailAddress ?? "import",
            regla_vencimiento: VencimientoRegla.AJUSTAR_ULTIMO_DIA,
          },
        });

        creditosCreados++;
      } catch (err: any) {
        console.error("❌ ERROR CREANDO CRÉDITO", err?.message, err);
        continue;
      }
    }

    for (const r of ordenadas) {
      if (!r.fechaven) continue;

      const existe = await prisma.cuota.findFirst({
        where: {
          id_credito: credito.id_credito,
          numero_cuota: r.nrocuo,
          fecha_vencimiento: r.fechaven,
          monto_total: r.debe,
        },
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
          estado: r.fechaven < hoy ? EstadoCuota.pagada : EstadoCuota.pendiente,
        },
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
Créditos no autorizados: ${creditosOmitidosNoAutorizados}
Créditos sin asociado:   ${creditosOmitidosSinAsociado}
Créditos otra mutual:    ${creditosOmitidosOtraMutual}
Filas inválidas:         ${filasInvalidas}
=====================================
`);

  return {
    ok: true,
    creditosCreados,
    cuotasCreadas,
    cuotasIgnoradas,
    creditosOmitidosNoAutorizados,
    creditosOmitidosSinAsociado,
    creditosOmitidosOtraMutual,
    filasInvalidas,
  };
}