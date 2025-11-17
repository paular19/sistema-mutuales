"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import { CreditosFilters } from "./creditos-filters";
import { Pagination } from "@/components/ui/pagination";

interface Credito {
    id_credito: number;
    monto: number;
    saldo_capital_inicial: number;
    saldo_capital_actual: number;
    cuotas_pagadas: number;
    cuotas_pendientes: number;
    estado: string;
    asociado?: { nombre: string | null; apellido: string | null };
    producto?: { nombre: string | null };
}

interface CreditosTableProps {
    creditos: Credito[];
    totalPages: number;
    currentPage: number;
}

export function CreditosTable({ creditos, totalPages, currentPage }: CreditosTableProps) {
    if (creditos.length === 0) {
        return (
            <>
                <CreditosFilters />
                <div className="border rounded-lg p-6 text-center text-gray-500">
                    No hay créditos registrados.
                </div>
            </>
        );
    }

    return (
        <div className="space-y-6">
            <CreditosFilters />

            <div className="overflow-auto border rounded-lg shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Asociado</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Saldo inicial</TableHead>
                            <TableHead>Saldo actual</TableHead>
                            <TableHead>Cuotas pagadas</TableHead>
                            <TableHead>Cuotas pendientes</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-center">Cuotas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {creditos.map((c) => (
                            <TableRow key={c.id_credito}>
                                <TableCell>
                                    {c.asociado?.apellido} {c.asociado?.nombre}
                                </TableCell>
                                <TableCell>{c.producto?.nombre}</TableCell>
                                <TableCell>{formatCurrency(c.monto)}</TableCell>
                                <TableCell>{formatCurrency(c.saldo_capital_inicial)}</TableCell>
                                <TableCell>{formatCurrency(c.saldo_capital_actual)}</TableCell>
                                <TableCell>{c.cuotas_pagadas}</TableCell>
                                <TableCell>{c.cuotas_pendientes}</TableCell>
                                <TableCell className="capitalize">{c.estado}</TableCell>
                                <TableCell>
                                    <div className="flex justify-center gap-2">
                                        <Button asChild variant="secondary" size="sm" className="flex items-center gap-1">
                                            <Link href={`/dashboard/creditos/${c.id_credito}/cuotas`}>
                                                <span>Ver cuotas</span>
                                            </Link>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                baseUrl="/dashboard/creditos"
            />

        </div>
    );
}
