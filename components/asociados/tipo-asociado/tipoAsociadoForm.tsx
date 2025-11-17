"use client";

import { useState, useEffect } from "react";
import { createTipoAsociado, updateTipoAsociado, deleteTipoAsociado } from "@/lib/actions/tiposAsociado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Edit } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";

interface TipoAsociado {
  id_tipo: number;
  nombre: string;
}

interface TiposAsociadoFormProps {
  initialTipos: TipoAsociado[];
}

export default function TiposAsociadoFormClient({ initialTipos }: TiposAsociadoFormProps) {
  const [tipos, setTipos] = useState<TipoAsociado[]>(initialTipos);
  const [editingTipo, setEditingTipo] = useState<TipoAsociado | null>(null);

  const [nombre, setNombre] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 FIX: Resincroniza el estado cuando cambian los tipos filtrados por RLS
  useEffect(() => {
    setTipos(initialTipos);
    setEditingTipo(null);
    setNombre("");
  }, [initialTipos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTipo) {
        // 🔹 Editar
        const result = await updateTipoAsociado(editingTipo.id_tipo, { nombre });

        if ("error" in result) {
          toast.error("Error", { description: String(result.error) });
        } else {
          toast.success("Tipo actualizado");
          setTipos((prev) => prev.map((t) => (t.id_tipo === editingTipo.id_tipo ? result : t)));
          resetForm();
        }

      } else {
        // 🔹 Crear
        const result = await createTipoAsociado({ nombre });

        if ("error" in result) {
          toast.error("Error", { description: String(result.error) });
        } else {
          toast.success("Tipo creado");
          setTipos((prev) => [...prev, result]);
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setNombre("");
    setEditingTipo(null);
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Activo, Adherente..."
            required
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? editingTipo
              ? "Actualizando..."
              : "Creando..."
            : editingTipo
            ? "Actualizar"
            : "Agregar"}
        </Button>
      </form>

      {/* Lista */}
      {tipos.length === 0 ? (
        <p className="text-gray-500">No hay tipos de asociados cargados.</p>
      ) : (
        <ul className="space-y-2">
          {tipos.map((t) => (
            <li
              key={t.id_tipo}
              className="border rounded p-3 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{t.nombre}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTipo(t);
                    setNombre(t.nombre);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <DeleteButton
                  id={t.id_tipo}
                  action={deleteTipoAsociado}
                  confirmMessage="¿Seguro que deseas eliminar este tipo de asociado? Esta acción no se puede deshacer."
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
