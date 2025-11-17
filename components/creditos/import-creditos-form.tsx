"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ImportCreditosFormProps {
  action: (formData: FormData) => Promise<any>; // ← tipado válido
}

export function ImportCreditosForm({ action }: ImportCreditosFormProps) {
  const [fileName, setFileName] = useState("Ningún archivo seleccionado");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await action(formData); // ← se ejecuta correctamente en server

        if (result?.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Importación completada correctamente");

        // Reset
        setFileName("Ningún archivo seleccionado");
        (
          document.getElementById("file-upload-creditos") as HTMLInputElement
        ).value = "";
      } catch (error) {
        console.error(error);
        toast.error("Error inesperado en la importación");
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSubmit(formData);
      }}
      className="flex items-center gap-2"
    >
      <label
        htmlFor="file-upload-creditos"
        className="cursor-pointer px-3 py-2 rounded-md bg-gray-100"
      >
        Seleccionar archivo
      </label>

      <input
        id="file-upload-creditos"
        type="file"
        name="file"
        className="hidden"
        required
        onChange={(e) =>
          setFileName(e.target.files?.[0]?.name ?? "Ningún archivo seleccionado")
        }
      />

      <span className="text-sm text-gray-500 max-w-[150px] truncate">
        {fileName}
      </span>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Importando..." : "Importar Créditos"}
      </Button>
    </form>
  );
}
