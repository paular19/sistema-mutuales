"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImportHistoricosForm } from "./import-historicos-form";

export function ImportHistoricosModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          Importar Históricos
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Créditos Históricos</DialogTitle>
        </DialogHeader>

        <ImportHistoricosForm />
      </DialogContent>
    </Dialog>
  );
}
