"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VencimientoRegla } from "@prisma/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { calcularCuotasCredito } from "@/lib/utils/calcularCuotas";

/* ----------------------------------------
   🔹 Tipos
---------------------------------------- */
interface AsociadoOption {
  id_asociado: number;
  nombre: string | null;
  apellido: string | null;
  razon_social: string | null;
  tipo_persona: "fisica" | "juridica";
}

interface ProductoOption {
  id_producto: number;
  nombre: string;
  tasa_interes: number;
  comision_comerc: number;
  dia_vencimiento: number;
  regla_vencimiento: VencimientoRegla;
  comision_gestion: number | null;
}

interface CreditoFormProps {
  action: (formData: FormData) => Promise<any>;
  asociados: AsociadoOption[];
  productos: ProductoOption[];
}

/* ----------------------------------------
   🔹 Componente
---------------------------------------- */
export function CreditoForm({ action, asociados, productos }: CreditoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [idAsociado, setIdAsociado] = useState("");
  const [idProducto, setIdProducto] = useState("");
  const [monto, setMonto] = useState("");
  const [cantidadCuotas, setCantidadCuotas] = useState("");
  const [tasaInteres, setTasaInteres] = useState("");
  const [primeraVencimiento, setPrimeraVencimiento] = useState("");
  const [fechaCreacion, setFechaCreacion] = useState(
    new Date().toISOString().split('T')[0]
  );

  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id_producto === Number(idProducto)) || null;
  }, [idProducto, productos]);

  const esDocumentoSolaFirma = useMemo(() => {
    if (!productoSeleccionado) return false;

    const nombreNormalizado = productoSeleccionado.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return nombreNormalizado.includes("documento") && nombreNormalizado.includes("sola firma");
  }, [productoSeleccionado]);

  const aplicaPostCierreDosMeses = useMemo(() => {
    if (!productoSeleccionado) return false;

    const nombreNormalizado = productoSeleccionado.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      nombreNormalizado.includes("3 de abril") ||
      nombreNormalizado.includes("tres de abril") ||
      nombreNormalizado.includes("centro mutual") ||
      nombreNormalizado.includes("clinica san rafael")
    );
  }, [productoSeleccionado]);

  useEffect(() => {
    if (!productoSeleccionado) return;

    setTasaInteres(String(productoSeleccionado.tasa_interes));
    setPrimeraVencimiento("");
  }, [productoSeleccionado]);

  const parametrosCredito = useMemo(() => {
    if (!productoSeleccionado) return null;

    const tasa = esDocumentoSolaFirma
      ? Number(tasaInteres)
      : productoSeleccionado.tasa_interes;

    const comisionComercial = productoSeleccionado.comision_comerc ?? 3;

    const comisionDeGestion = esDocumentoSolaFirma
      ? 0
      : (productoSeleccionado.comision_gestion ?? 7.816712);

    let primeraVencSeleccionada: Date | null = null;
    if (esDocumentoSolaFirma) {
      if (!primeraVencimiento) return null;
      const [y, m, d] = primeraVencimiento.split("-").map(Number);
      if (!y || !m || !d) return null;
      const parsed = new Date(y, m - 1, d);
      if (
        parsed.getFullYear() !== y ||
        parsed.getMonth() !== m - 1 ||
        parsed.getDate() !== d
      ) {
        return null;
      }
      primeraVencSeleccionada = parsed;
    }

    const diaVenc = esDocumentoSolaFirma
      ? (primeraVencSeleccionada?.getDate() ?? Number.NaN)
      : productoSeleccionado.dia_vencimiento;

    const regla = esDocumentoSolaFirma
      ? VencimientoRegla.ESTRICTO
      : productoSeleccionado.regla_vencimiento;

    const valores = [tasa, comisionComercial, comisionDeGestion, diaVenc];
    if (valores.some((v) => !Number.isFinite(v))) return null;
    if (tasa <= 0 || comisionComercial < 0 || comisionDeGestion < 0) return null;
    if (diaVenc < 1 || diaVenc > 31) return null;

    return {
      tasa,
      comisionComercial,
      comisionDeGestion,
      diaVenc,
      regla,
      primeraVencSeleccionada,
    };
  }, [
    productoSeleccionado,
    esDocumentoSolaFirma,
    tasaInteres,
    primeraVencimiento,
  ]);

  /* ----------------------------------------
     🔹 Cálculo dinámico de cuotas
  ---------------------------------------- */
  const calculo = useMemo(() => {
    if (!parametrosCredito || !monto || !cantidadCuotas) return null;

    return calcularCuotasCredito({
      monto: Number(monto),
      cuotas: Number(cantidadCuotas),
      tasaMensual: parametrosCredito.tasa,
      // comisionPct = comercializadora pct (por cuota)
      comisionPct: parametrosCredito.comisionComercial,
      // gestionPct = porcentaje de gestión aplicado al monto inicial
      gestionPct: parametrosCredito.comisionDeGestion,
      diaVencimiento: parametrosCredito.diaVenc,
      reglaVencimiento: parametrosCredito.regla,
      // Parsear fecha manualmente para evitar bug de timezone
      // (new Date("2026-01-22") es UTC, getDate() da día distinto en Argentina)
      fechaOtorgamiento: fechaCreacion
        ? (() => { const [y, m, d] = fechaCreacion.split('-').map(Number); return new Date(y, m - 1, d); })()
        : new Date(),
      primeraVencSeleccionada: parametrosCredito.primeraVencSeleccionada ?? undefined,
      useFullFirstPeriodProration: esDocumentoSolaFirma,
      usePostCierreTwoMonthRule: aplicaPostCierreDosMeses && !esDocumentoSolaFirma,
    });
  }, [monto, cantidadCuotas, parametrosCredito, fechaCreacion, esDocumentoSolaFirma, aplicaPostCierreDosMeses]);


  /* ----------------------------------------
     🔹 Envío del formulario (con toast + redirect)
  ---------------------------------------- */
  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await action(formData);

      if (res?.error) {
        toast.error("No se pudo crear el crédito", {
          description: res.error,
        });
        return;
      }

      toast.success("Crédito creado", {
        description: "El crédito fue generado correctamente.",
      });

      router.push("/dashboard/creditos");
    });
  }

  /* ----------------------------------------
     🔹 Renderizado
  ---------------------------------------- */
  return (
    <form
      action={handleSubmit}
      className="space-y-6 p-6 border rounded-lg shadow bg-white"
    >
      {/* ---------------- Asociación ---------------- */}
      <div>
        <label className="font-semibold">Asociado</label>
        <select
          name="id_asociado"
          value={idAsociado}
          onChange={(e) => setIdAsociado(e.target.value)}
          className="mt-1 w-full border p-2 rounded"
          required
        >
          <option value="">Seleccionar...</option>
          {asociados.map((a) => (
            <option key={a.id_asociado} value={a.id_asociado}>
              {a.tipo_persona === "juridica"
                ? a.razon_social
                : `${a.apellido ?? ""} ${a.nombre ?? ""}`}
            </option>
          ))}
        </select>
      </div>

      {/* ---------------- Producto ---------------- */}
      <div>
        <label className="font-semibold">Producto</label>
        <select
          name="id_producto"
          value={idProducto}
          onChange={(e) => setIdProducto(e.target.value)}
          className="mt-1 w-full border p-2 rounded"
          required
        >
          <option value="">Seleccionar...</option>
          {productos.map((p) => (
            <option key={p.id_producto} value={p.id_producto}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* ---------------- Monto ---------------- */}
      <div>
        <label className="font-semibold">Monto</label>
        <input
          type="number"
          name="monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="mt-1 w-full border p-2 rounded"
          required
          min="1"
        />
      </div>

      {/* ---------------- Fecha de creación ---------------- */}
      <div>
        <label className="font-semibold">Fecha de creación</label>
        <input
          type="date"
          name="fecha_creacion"
          value={fechaCreacion}
          onChange={(e) => setFechaCreacion(e.target.value)}
          className="mt-1 w-full border p-2 rounded"
          required
        />
      </div>

      {/* ---------------- Cuotas ---------------- */}
      <div>
        <label className="font-semibold">Cantidad de cuotas</label>
        <input
          type="number"
          name="numero_cuotas"
          value={cantidadCuotas}
          onChange={(e) => setCantidadCuotas(e.target.value)}
          className="mt-1 w-full border p-2 rounded"
          required
          min="1"
        />
      </div>

      {esDocumentoSolaFirma && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
          <div>
            <label className="font-semibold">Tasa de interés mensual (%)</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              name="tasa_interes"
              value={tasaInteres}
              onChange={(e) => setTasaInteres(e.target.value)}
              className="mt-1 w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="font-semibold">Primera fecha de vencimiento</label>
            <input
              type="date"
              name="primera_venc"
              value={primeraVencimiento}
              onChange={(e) => setPrimeraVencimiento(e.target.value)}
              className="mt-1 w-full border p-2 rounded"
              required
            />
            <p className="mt-1 text-xs text-gray-600">
              La primera cuota vence exactamente en esta fecha. Las siguientes se calculan mes a mes;
              si el día no existe en un mes, se corre al día siguiente válido y continúa desde ahí.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- Resumen dinámico ---------------- */}
      {calculo && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
          <h3 className="font-bold text-lg">Resumen del Crédito</h3>

          <p><strong>Días hasta primer cierre:</strong> {calculo.diasEntre}</p>

          <p><strong>Monto inicial:</strong> ${Number(monto).toFixed(2)}</p>
          <p><strong>Monto final{parametrosCredito?.comisionDeGestion ? ` (+${parametrosCredito.comisionDeGestion}%)` : ''}:</strong> ${calculo.montoFinal.toFixed(2)}</p>

          <p><strong>Interés prorrateado 1° cuota:</strong> ${calculo.interesProrrateado.toFixed(2)}</p>

          {!esDocumentoSolaFirma && (
            <p><strong>Comisión de gestión total (aplicada al inicio):</strong> ${calculo.comisionTotal.toFixed(2)}</p>
          )}

          <p className="text-blue-700 font-semibold">
            Primera cuota: ${calculo.primeraCuota.toFixed(2)}
          </p>

          <p className="text-green-700 font-semibold">
            Cuotas restantes: ${calculo.cuotaRestante.toFixed(2)}
          </p>

          <hr />

          <p className="text-xl font-bold">
            Total financiado: ${calculo.totalFinanciado.toFixed(2)}
          </p>

          {/* Detalle de cuotas */}
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Detalle de Cuotas:</h4>
            <div className="bg-white p-3 rounded border max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-1">Cuota</th>
                    <th className="text-left py-1">Fecha de Cierre</th>
                    <th className="text-right py-1">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {calculo.detalleCuotas.map((cuota) => (
                    <tr key={cuota.numero} className="border-b last:border-0">
                      <td className="py-1">{cuota.numero}/{calculo.detalleCuotas.length}</td>
                      <td className="py-1">
                        {cuota.fechaCierre.toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="text-right py-1 font-mono">
                        ${cuota.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Botón submit ---------------- */}
      <button
        type="submit"
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-white font-semibold 
          ${isPending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
        {isPending ? "Creando crédito..." : "Crear Crédito"}
      </button>
    </form>
  );
}
