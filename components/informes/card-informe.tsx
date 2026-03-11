"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface InformeCardProps {
  informe: {
    id: string;
    title: string;
    description: string;
    action: "download" | "navigate";
    requiresPeriod?: boolean;
  };
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function InformeCard({ informe }: InformeCardProps) {
  const [periodoMes, setPeriodoMes] = useState<string>(getCurrentMonthValue());
  const [isLoading, setIsLoading] = useState(false);

  const needsPeriod = Boolean(informe.requiresPeriod);

  const handleClick = async () => {
    if (isLoading) return;

    if (informe.action === "download") {
      try {
        setIsLoading(true);

        const periodoMesSeguro = /^\d{4}-\d{2}$/.test(periodoMes)
          ? periodoMes
          : getCurrentMonthValue();

        const periodoParam = needsPeriod
          ? informe.id === "central-deudores"
            ? periodoMesSeguro.replace("-", "")
            : periodoMesSeguro
          : undefined;

        const url = new URL(`/endpoints/informes/${informe.id}`, window.location.origin);
        if (periodoParam) {
          url.searchParams.set("periodo", periodoParam);
        }

        const res = await fetch(url.toString(), { method: "GET" });

        if (!res.ok) throw new Error("Error descargando informe");

        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;

        if (informe.id === "inf-3688") {
          a.download = `informe-${informe.id}-${periodoMesSeguro}.txt`;
        } else if (informe.id === "central-deudores") {
          const periodoArchivo = periodoMesSeguro.replace("-", "");
          a.download = `central_deudores_${periodoArchivo}.csv`;
        } else {
          a.download = `informe-${informe.id}.xlsx`;
        }

        a.click();
        window.URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error(err);
        alert("Error al generar el archivo");
      } finally {
        setIsLoading(false);
      }
    } else {
      window.location.href = `/dashboard/informes/${informe.id}`;
    }
  };

  return (
    <Card className="hover:shadow-lg transition">
      <CardHeader>
        <CardTitle>{informe.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>{informe.description}</p>

        {needsPeriod && (
          <div className="space-y-2">
            <label htmlFor={`periodo-${informe.id}`} className="text-sm font-medium">
              Período
            </label>
            <input
              id={`periodo-${informe.id}`}
              type="month"
              value={periodoMes}
              onChange={(e) => setPeriodoMes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}

        <Button type="button" onClick={handleClick} disabled={isLoading} className="w-full">
          {isLoading
            ? "Generando..."
            : informe.action === "download"
              ? "Descargar"
              : "Abrir"}
        </Button>
      </CardContent>
    </Card>
  );
}
