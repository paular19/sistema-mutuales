"use client";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface ProductoOption {
    id_producto: number;
    nombre: string;
}

interface ProductoFilterExportProps {
    productos: ProductoOption[];
    pageBasePath: string;
    exportBasePath: string;
    selectedProductoId?: number;
}

export function ProductoFilterExport({
    productos,
    pageBasePath,
    exportBasePath,
    selectedProductoId,
}: ProductoFilterExportProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const selectedValue = selectedProductoId ? String(selectedProductoId) : "all";

    const handleProductoChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value === "all") {
            params.delete("productoId");
        } else {
            params.set("productoId", value);
        }

        params.delete("page");

        const query = params.toString();
        router.push(query ? `${pageBasePath}?${query}` : pageBasePath);
    };

    const buildExportUrl = (format: "xlsx" | "pdf") => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("format", format);
        params.delete("page");

        if (selectedProductoId) {
            params.set("productoId", String(selectedProductoId));
        } else {
            params.delete("productoId");
        }

        return `${exportBasePath}?${params.toString()}`;
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Select value={selectedValue} onValueChange={handleProductoChange}>
                <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Filtrar por producto" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {productos.map((producto) => (
                        <SelectItem key={producto.id_producto} value={String(producto.id_producto)}>
                            {producto.nombre}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex gap-2">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href={buildExportUrl("xlsx")}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar Excel
                    </a>
                </Button>

                <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href={buildExportUrl("pdf")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar PDF
                    </a>
                </Button>
            </div>
        </div>
    );
}
