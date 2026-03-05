"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getExcelHeaders,
  actualizarMasivoAsociadosAction,
} from "@/lib/actions/asociados";
import { CheckCircle, XCircle, Upload } from "lucide-react";

// Campos del sistema que se pueden actualizar
const SYSTEM_FIELDS = [
  { key: "apenom", label: "Nombre y Apellido (combinados — se separan automáticamente)" },
  { key: "nombre", label: "Nombre" },
  { key: "apellido", label: "Apellido" },
  { key: "razon_social", label: "Razón Social" },
  { key: "cuit", label: "CUIT" },
  { key: "tipo_persona", label: "Tipo de Persona (fisica/juridica)" },
  { key: "id_tipo", label: "Tipo de Asociado (ID numérico)" },
  { key: "sueldo_mes", label: "Sueldo Mensual" },
  { key: "sueldo_ano", label: "Sueldo Anual" },
  { key: "fecha_nac", label: "Fecha de Nacimiento" },
  { key: "genero", label: "Género" },
  { key: "telefono", label: "Teléfono / Celular" },
  { key: "email", label: "Email" },
  { key: "profesion", label: "Profesión" },
  { key: "tiene_conyuge", label: "Tiene Cónyuge (si/no)" },
  { key: "nombre_conyuge", label: "Nombre Cónyuge" },
  { key: "dni_conyuge", label: "DNI Cónyuge" },
  { key: "provincia", label: "Provincia" },
  { key: "localidad", label: "Localidad" },
  { key: "calle", label: "Calle / Domicilio" },
  { key: "numero_calle", label: "Número de Calle" },
  { key: "piso", label: "Piso" },
  { key: "departamento", label: "Departamento" },
  { key: "codigo_postal", label: "Código Postal" },
  { key: "es_extranjero", label: "Es Extranjero (si/no)" },
  { key: "recibe_notificaciones", label: "Recibe Notificaciones (si/no)" },
  { key: "dec_jurada", label: "Declaración Jurada (si/no)" },
  { key: "convenio", label: "Convenio" },
];

// Aliases conocidos: columna Excel → campo sistema
const KNOWN_ALIASES: Record<string, string> = {
  apenom: "apenom",
  celular: "telefono",
  telefono: "telefono",
  localidad: "localidad",
  domicilio: "calle",
  fecnac: "fecha_nac",
  fecha_nac: "fecha_nac",
  email: "email",
  mail: "email",
  cuit: "cuit",
  genero: "genero",
  género: "genero",
  nombre: "nombre",
  apellido: "apellido",
  provincia: "provincia",
  profesion: "profesion",
  profesión: "profesion",
};

type Step = "upload" | "mapping" | "results";

type ResultItem = { row: number; success: boolean; errors?: string[] };

type Results = {
  successCount: number;
  errorCount: number;
  results: ResultItem[];
};

export function ActualizarMasivoForm() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [keyField, setKeyField] = useState<string>("cuit");
  const [keyColumn, setKeyColumn] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setError("");
  }

  function handleReadHeaders() {
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await getExcelHeaders(fd);

      if (res.error) {
        setError(res.error);
        return;
      }

      const cols = res.headers ?? [];
      setHeaders(cols);

      // Auto-mapeo por aliases conocidos
      const autoMap: Record<string, string> = {};
      let autoKeyColumn = "";

      for (const col of cols) {
        const lower = col.toLowerCase().trim();
        const sysField = KNOWN_ALIASES[lower];
        if (sysField) {
          autoMap[sysField] = col;
        }
        // Auto-detectar columna clave
        if (keyField === "cuit" && lower === "cuit") autoKeyColumn = col;
        if (keyField === "id_asociado" && lower === "id_asociado")
          autoKeyColumn = col;
      }

      setMapping(autoMap);
      if (autoKeyColumn) setKeyColumn(autoKeyColumn);
      setStep("mapping");
    });
  }

  function handleSubmit() {
    if (!file || !keyColumn) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("keyField", keyField);
      fd.append("keyColumn", keyColumn);
      fd.append("mapping", JSON.stringify(mapping));

      const res = await actualizarMasivoAsociadosAction(fd);

      if ("error" in res && res.error) {
        setError(res.error as string);
        return;
      }

      setResults(res as Results);
      setStep("results");
    });
  }

  function handleReset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setMapping({});
    setKeyColumn("");
    setResults(null);
    setError("");
  }

  /* ──────────────────────────────────── STEP 1: UPLOAD */
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <div>
            <Label
              htmlFor="file-input"
              className="cursor-pointer text-primary underline text-sm"
            >
              Seleccionar archivo Excel (.xlsx / .xls)
            </Label>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">{file.name}</p>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button
          onClick={handleReadHeaders}
          disabled={!file || isPending}
        >
          {isPending ? "Leyendo archivo..." : "Leer columnas del Excel"}
        </Button>
      </div>
    );
  }

  /* ──────────────────────────────────── STEP 2: MAPPING */
  if (step === "mapping") {
    const mappedCount = Object.values(mapping).filter(Boolean).length;

    return (
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium">{file?.name}</p>
          <p className="text-muted-foreground">
            {headers.length} columnas encontradas · {mappedCount} mapeadas
          </p>
        </div>

        {/* Columna identificadora */}
        <div className="border rounded-lg p-4 bg-amber-50 space-y-3">
          <h3 className="font-semibold text-sm">
            Columna identificadora{" "}
            <span className="font-normal text-muted-foreground">
              (para encontrar al asociado en el sistema)
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Campo del sistema</Label>
              <Select value={keyField} onValueChange={setKeyField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuit">CUIT</SelectItem>
                  <SelectItem value="id_asociado">ID Asociado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Columna del Excel</Label>
              <Select value={keyColumn || undefined} onValueChange={setKeyColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar columna..." />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabla de mapeo */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">
            Mapeo de campos{" "}
            <span className="font-normal text-muted-foreground">
              — solo se actualizan los campos que mapees
            </span>
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium w-1/2">
                    Campo del sistema
                  </th>
                  <th className="px-4 py-2 text-left font-medium w-1/2">
                    Columna del Excel
                  </th>
                </tr>
              </thead>
              <tbody>
                {SYSTEM_FIELDS.map((sf, idx) => (
                  <tr
                    key={sf.key}
                    className={idx % 2 === 0 ? "bg-white" : "bg-muted/20"}
                  >
                    <td className="px-4 py-1.5 font-medium text-sm">
                      {sf.label}
                    </td>
                    <td className="px-4 py-1.5">
                      <Select
                        value={mapping[sf.key] ?? "__none__"}
                        onValueChange={(val) =>
                          setMapping((prev) => {
                            const next = { ...prev };
                            if (val === "__none__") {
                              delete next[sf.key];
                            } else {
                              next[sf.key] = val;
                            }
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="No mapear" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            — No mapear —
                          </SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("upload")}
            disabled={isPending}
          >
            Volver
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!keyColumn || mappedCount === 0 || isPending}
          >
            {isPending
              ? "Procesando..."
              : `Actualizar asociados (${mappedCount} campo${mappedCount !== 1 ? "s" : ""})`}
          </Button>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────── STEP 3: RESULTS */
  if (step === "results" && results) {
    const errors = results.results.filter((r) => !r.success);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700">
                {results.successCount}
              </p>
              <p className="text-sm text-green-600">
                Actualizados exitosamente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <XCircle className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-700">
                {results.errorCount}
              </p>
              <p className="text-sm text-red-600">Con errores</p>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Fila</th>
                  <th className="px-4 py-2 text-left">Detalle del error</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((r) => (
                  <tr key={r.row} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.row}</td>
                    <td className="px-4 py-2 text-red-700">
                      {r.errors?.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button variant="outline" onClick={handleReset}>
          Nueva actualización
        </Button>
      </div>
    );
  }

  return null;
}
