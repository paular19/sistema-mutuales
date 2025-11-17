import Link from "next/link";
import { getAsociados } from "@/lib/queries/asociados";
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
import { Edit } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteAsociado } from "@/lib/actions/asociados";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";


interface AsociadosTableProps {
  searchParams: {
    search?: string;
    ciudad?: string;
    profesion?: string;
    page?: string;
  };
}

export async function AsociadosTable({ searchParams }: AsociadosTableProps) {
  const filters = {
    search: searchParams.search,
    ciudad: searchParams.ciudad,
    profesion: searchParams.profesion,
    page: parseInt(searchParams.page || "1"),
    limit: 10,
  };

  const { asociados, pagination } = await getAsociados(filters);

  if (asociados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se encontraron asociados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {searchParams.search
              ? "No hay asociados que coincidan con su búsqueda."
              : "Aún no hay asociados registrados. Comience agregando el primer asociado."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/asociados/new">Agregar Asociado</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Vista Desktop - Tabla con scroll horizontal */}
      <div className="hidden lg:block w-full">
        <Card className="w-full">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px] whitespace-nowrap">
                      Asociado / Razón Social
                    </TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">
                      CUIT
                    </TableHead>
                    <TableHead className="min-w-[200px] whitespace-nowrap">
                      Email
                    </TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">
                      Teléfono
                    </TableHead>
                    <TableHead className="min-w-[110px] whitespace-nowrap">
                      Fecha Nac.
                    </TableHead>
                    <TableHead className="min-w-[150px] whitespace-nowrap">
                      Profesión
                    </TableHead>
                    <TableHead className="min-w-[110px] whitespace-nowrap">
                      Sueldo Mes
                    </TableHead>
                    <TableHead className="min-w-[110px] whitespace-nowrap">
                      Sueldo Año
                    </TableHead>
                    <TableHead className="min-w-[250px] whitespace-nowrap">
                      Domicilio
                    </TableHead>
                    <TableHead className="min-w-[100px] whitespace-nowrap">
                      Código Postal
                    </TableHead>
                    <TableHead className="min-w-[100px] whitespace-nowrap">
                      Extranjero
                    </TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">
                      Tipo Persona
                    </TableHead>
                    <TableHead className="min-w-[160px] whitespace-nowrap">
                      Tipo Asociado
                    </TableHead>
                    <TableHead className="min-w-[130px] whitespace-nowrap">
                      Notificaciones
                    </TableHead>
                    <TableHead className="min-w-[100px] whitespace-nowrap">
                      Estado DJ
                    </TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap sticky right-0 bg-background">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asociados.map((a) => (
                    <TableRow key={a.id_asociado}>
                      <TableCell className="font-medium">
                        {a.tipo_persona === "juridica"
                          ? a.razon_social || "-"
                          : `${a.nombre || ""} ${a.apellido || ""}`}
                      </TableCell>
                      <TableCell>{a.cuit || "-"}</TableCell>
                      <TableCell>{a.email || "-"}</TableCell>
                      <TableCell>{a.telefono || "-"}</TableCell>
                      <TableCell>
                        {a.fecha_nac ? formatDate(a.fecha_nac) : "-"}
                      </TableCell>
                      <TableCell>{a.profesion || "-"}</TableCell>
                      <TableCell>
                        {a.sueldo_mes ? `$${a.sueldo_mes}` : "-"}
                      </TableCell>
                      <TableCell>
                        {a.sueldo_ano ? `$${a.sueldo_ano}` : "-"}
                      </TableCell>
                      <TableCell>
                        {[
                          a.calle && `${a.calle} ${a.numero_calle ?? ""}`,
                          a.piso && `Piso ${a.piso}`,
                          a.departamento && `Dto ${a.departamento}`,
                          a.localidad,
                          a.provincia,
                        ]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </TableCell>
                      <TableCell>{a.codigo_postal || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={a.es_extranjero ? "destructive" : "secondary"}
                        >
                          {a.es_extranjero ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.tipo_persona === "juridica"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {a.tipo_persona === "juridica" ? "Jurídica" : "Física"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.tipoAsociado ? (
                          <Badge variant="outline">{a.tipoAsociado.nombre}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.recibe_notificaciones ? "default" : "secondary"}
                        >
                          {a.recibe_notificaciones ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.dec_jurada ? "default" : "secondary"}
                        >
                          {a.dec_jurada ? "Con DJ" : "Sin DJ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <div className="flex space-x-2">
                          <DeleteButton
                            id={a.id_asociado}
                            action={deleteAsociado}
                            confirmMessage="Esta eliminando un asociado y este cambio es permanente."
                          />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/asociados/${a.id_asociado}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
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

      {/* Vista Mobile y Tablet - Cards */}
      <div className="lg:hidden space-y-4">
        {asociados.map((a) => (
          <Card key={a.id_asociado}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">
                    {a.tipo_persona === "juridica"
                      ? a.razon_social || "-"
                      : `${a.nombre || ""} ${a.apellido || ""}`}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        a.tipo_persona === "juridica"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {a.tipo_persona === "juridica" ? "Jurídica" : "Física"}
                    </Badge>
                    {a.tipoAsociado && (
                      <Badge variant="outline">{a.tipoAsociado.nombre}</Badge>
                    )}
                    <Badge
                      variant={a.es_extranjero ? "destructive" : "secondary"}
                    >
                      {a.es_extranjero ? "Extranjero" : "Nacional"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <DeleteButton
                    id={a.id_asociado}
                    action={deleteAsociado}
                    confirmMessage="Esta eliminando un asociado y este cambio es permanente."
                  />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/asociados/${a.id_asociado}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {a.cuit && (
                  <div>
                    <span className="text-muted-foreground">CUIT:</span>
                    <p className="font-medium">{a.cuit}</p>
                  </div>
                )}
                {a.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium break-all">{a.email}</p>
                  </div>
                )}
                {a.telefono && (
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <p className="font-medium">{a.telefono}</p>
                  </div>
                )}
                {a.fecha_nac && (
                  <div>
                    <span className="text-muted-foreground">Fecha Nac.:</span>
                    <p className="font-medium">{formatDate(a.fecha_nac)}</p>
                  </div>
                )}
                {a.profesion && (
                  <div>
                    <span className="text-muted-foreground">Profesión:</span>
                    <p className="font-medium">{a.profesion}</p>
                  </div>
                )}
                {a.sueldo_mes && (
                  <div>
                    <span className="text-muted-foreground">Sueldo Mes:</span>
                    <p className="font-medium">${a.sueldo_mes}</p>
                  </div>
                )}
                {a.sueldo_ano && (
                  <div>
                    <span className="text-muted-foreground">Sueldo Año:</span>
                    <p className="font-medium">${a.sueldo_ano}</p>
                  </div>
                )}
                {a.codigo_postal && (
                  <div>
                    <span className="text-muted-foreground">CP:</span>
                    <p className="font-medium">{a.codigo_postal}</p>
                  </div>
                )}
              </div>

              {/* Domicilio completo */}
              {(a.calle || a.localidad || a.provincia) && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">
                    Domicilio:
                  </span>
                  <p className="font-medium text-sm mt-1">
                    {[
                      a.calle && `${a.calle} ${a.numero_calle ?? ""}`,
                      a.piso && `Piso ${a.piso}`,
                      a.departamento && `Dto ${a.departamento}`,
                      a.localidad,
                      a.provincia,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}

              {/* Badges de estado */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Notificaciones:
                  </span>
                  <Badge
                    variant={a.recibe_notificaciones ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {a.recibe_notificaciones ? "Sí" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">DJ:</span>
                  <Badge
                    variant={a.dec_jurada ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {a.dec_jurada ? "Con DJ" : "Sin DJ"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          baseUrl="/dashboard/asociados"
        />
      )}
    </div>
  );
}
