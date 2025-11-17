"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface InformeCardProps {
  informe: {
    id: string;
    title: string;
    description: string;
    action: "download" | "navigate";
  };
}

export function InformeCard({ informe }: InformeCardProps) {
  const handleClick = async () => {
    if (informe.action === "download") {
      try {
        const res = await fetch(`/dashboard/informes/${informe.id}`, { method: "GET" });
        if (!res.ok) throw new Error("Error descargando informe");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // 🔹 Cambiamos extensión según tipo de informe
        if (informe.id === "3688") {
          a.download = `informe-${informe.id}.txt`;
        } else {
          a.download = `informe-${informe.id}.xlsx`;
        }

        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert("Error al generar el archivo");
      }
    } else {
      // 🔹 En caso de navegación (si en el futuro agregás informes con página propia)
      window.location.href = `/informes/${informe.id}`;
    }
  };

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer hover:shadow-lg transition"
    >
      <CardHeader>
        <CardTitle>{informe.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{informe.description}</p>
      </CardContent>
    </Card>
  );
}
