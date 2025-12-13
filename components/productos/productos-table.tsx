// components/productos/productos-table.tsx

import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { DarDeBajaButton } from "@/components/ui/dar-de-baja-button";

interface ProductosTableProps {
  productos: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function ProductosTable({ productos, pagination }: ProductosTableProps) {
  if (productos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se encontraron productos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aún no hay productos cargados. Comience agregando el primero.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/productos/new">Nuevo Producto</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* 📱💻 Vista Desktop */}
      <div className="hidden lg:block w-full">
        <Card className="w-full">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nombre</TableHead>
                    <TableHead className="min-w-[100px] text-center">
                      Tasa
                    </TableHead>
                    <TableHead className="min-w-[120px] text-center">
                      Comisión
                    </TableHead>
                    <TableHead className="min-w-[100px] text-center">
                      Créditos
                    </TableHead>
                    <TableHead className="min-w-[140px] text-center">
                      Vencimientos
                    </TableHead>
                    <TableHead className="min-w-[120px] text-center">
                      Estado
                    </TableHead>
                    <TableHead className="min-w-[160px] text-center sticky right-0 bg-background">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {productos.map((p) => (
                    <TableRow
                      key={p.id_producto}
                      className={!p.activo ? "opacity-70 bg-gray-50" : ""}
                    >
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-center">
                        {p.tasa_interes}%
                      </TableCell>
                      <TableCell className="text-center">
                        {p.comision_comerc ?? 0}%
                      </TableCell>
                      <TableCell className="text-center">
                        {p._count.creditos}
                      </TableCell>
                      <TableCell className="text-center">
                        Día {p.dia_vencimiento}
                      </TableCell>


                      <TableCell className="text-center">
                        {p.activo ? (
                          <Badge variant="outline" className="text-green-600">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Baja{" "}
                            {p.fecha_baja &&
                              `(${format(p.fecha_baja, "dd/MM/yyyy", {
                                locale: es,
                              })})`}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex justify-center">
                          {p.activo ? (
                            <DarDeBajaButton id={p.id_producto} />
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Dado de baja
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      {/* 📱 Vista Mobile */}
      <div className="lg:hidden space-y-4">
        {productos.map((p) => (
          <Card key={p.id_producto}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{p.nombre}</CardTitle>
                <div className="flex gap-2">
                  {p.activo ? (
                    <DarDeBajaButton id={p.id_producto} />
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Dado de baja
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">Cuotas:</span>{" "}
                {p.numero_cuotas}
              </div>
              <div>
                <span className="text-muted-foreground">Tasa:</span>{" "}
                {p.tasa_interes}%
              </div>
              <div>
                <span className="text-muted-foreground">Comisión:</span>{" "}
                {p.comision_comerc ?? 0}%
              </div>
              <div>
                <span className="text-muted-foreground">Créditos:</span>{" "}
                {p._count.creditos}
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>{" "}
                {p.activo ? (
                  <Badge variant="outline" className="text-green-600">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Baja{" "}
                    {p.fecha_baja &&
                      `(${format(p.fecha_baja, "dd/MM/yyyy", { locale: es })})`}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginación */}
      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          baseUrl="/dashboard/productos"
        />
      )}
    </div>
  );
}
