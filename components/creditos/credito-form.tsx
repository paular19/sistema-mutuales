"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VencimientoRegla } from "@prisma/client";
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
  numero_cuotas: number | null;
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

  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id_producto === Number(idProducto)) || null;
  }, [idProducto, productos]);

  /* ----------------------------------------
     🔹 Cálculo dinámico de cuotas
  ---------------------------------------- */
  const calculo = useMemo(() => {
    if (!productoSeleccionado || !monto || !cantidadCuotas) return null;

    return calcularCuotasCredito({
      monto: Number(monto),
      cuotas: Number(cantidadCuotas),
      tasaMensual: productoSeleccionado.tasa_interes,
      comisionPct: productoSeleccionado.comision_comerc,
      gestion: productoSeleccionado.comision_gestion,
      diaVencimiento: productoSeleccionado.dia_vencimiento,
      reglaVencimiento: productoSeleccionado.regla_vencimiento,
    });
  }, [monto, cantidadCuotas, productoSeleccionado]);


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

      {/* ---------------- Resumen dinámico ---------------- */}
      {calculo && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
          <h3 className="font-bold text-lg">Resumen del Crédito</h3>

          <p>🗓 <strong>Días hasta primer vencimiento:</strong> {calculo.diasEntre}</p>

          <p>💵 <strong>Capital por cuota:</strong> ${calculo.capitalPorCuota.toFixed(2)}</p>

          <p>📈 <strong>Interés prorrateado 1° cuota:</strong> ${calculo.interesProrrateado.toFixed(2)}</p>

          <p>💼 <strong>Comisión total (1° cuota):</strong> ${calculo.comisionTotal.toFixed(2)}</p>

          <p className="text-blue-700 font-semibold">
            🔵 Primera cuota: ${calculo.primeraCuota.toFixed(2)}
          </p>

          <p className="text-green-700 font-semibold">
            🟢 Cuotas restantes: ${calculo.cuotaRestante.toFixed(2)}
          </p>

          <hr />

          <p className="text-xl font-bold">
            💰 Total financiado: ${calculo.totalFinanciado.toFixed(2)}
          </p>
        </div>
      )}

      {/* ---------------- Botón submit ---------------- */}
      <button
        type="submit"
        disabled={isPending}
        className={`px-6 py-3 rounded text-white font-semibold 
          ${isPending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {isPending ? "Creando crédito..." : "Crear Crédito"}
      </button>
    </form>
  );
}
