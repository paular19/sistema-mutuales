"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { importAsociadosAction } from "@/lib/actions/asociados";

export function ImportAsociadosForm() {
  const [fileName, setFileName] = useState<string>("Ningún archivo");

  return (
    <form
      action={importAsociadosAction}
      className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm"
    >
      <label
        htmlFor="file-upload"
        className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-sm px-3 py-2 rounded-md border border-gray-300 text-gray-700"
      >
        Seleccionar archivo
      </label>
      <input
        id="file-upload"
        type="file"
        name="file"
        accept=".xlsx,.xls"
        className="hidden"
        required
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setFileName(e.target.files[0].name);
          } else {
            setFileName("Ningún archivo");
          }
        }}
      />
      <span className="text-sm text-gray-500 italic truncate max-w-[140px]">
        {fileName}
      </span>
      <Button type="submit" size="sm">
        Importar Excel
      </Button>
    </form>
  );
}