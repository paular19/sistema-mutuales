"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Download } from "lucide-react";
import { exportAsociadosAction } from "@/lib/actions/asociados";

export function ExportAsociadosButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const result = await exportAsociadosAction();
      if (result.error) {
        alert(result.error);
        return;
      }
      const bytes = Uint8Array.from(atob(result.data!), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asociados_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
      {loading ? "Exportando..." : "Exportar Excel"}
    </Button>
  );
}
