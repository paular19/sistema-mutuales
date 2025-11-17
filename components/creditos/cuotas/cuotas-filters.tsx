'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useEffect, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function CuotasFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // ✅ ruta actual dinámica

  // 🔹 Estado y fecha (solo uno activo a la vez)
  const [estado, setEstado] = useState(searchParams.get('estado') || '');
  const [fecha, setFecha] = useState(searchParams.get('fecha') || '');

  const [debouncedEstado] = useDebounce(estado, 300);
  const [debouncedFecha] = useDebounce(fecha, 300);

  // 🔁 Sincroniza filtros en la URL actual
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedEstado && !debouncedFecha) params.set('estado', debouncedEstado);
    if (debouncedFecha && !debouncedEstado) params.set('fecha', debouncedFecha);

    const query = params.toString();
    const newUrl = query ? `${pathname}?${query}` : pathname; // ✅ mantiene el path actual

    if (newUrl !== window.location.pathname + window.location.search) {
      router.push(newUrl);
    }
  }, [debouncedEstado, debouncedFecha, router, pathname]);

  // 🧹 Limpiar filtros
  const clearFilters = () => {
    setEstado('');
    setFecha('');
    router.push(pathname); // ✅ limpia correctamente
  };

  const hasFilters = estado || fecha;

  // 🧠 Si se selecciona estado, se limpia la fecha y viceversa
  const handleEstadoChange = (value: string) => {
    setEstado(value);
    setFecha('');
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFecha(e.target.value);
    setEstado('');
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* 📅 Filtro por fecha */}
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="date"
              value={fecha}
              onChange={handleFechaChange}
              className="pl-10 sm:w-52"
              disabled={!!estado}
            />
          </div>

          {/* ⚙️ Filtro por estado */}
          <Select value={estado} onValueChange={handleEstadoChange}>
            <SelectTrigger className="sm:w-52" disabled={!!fecha}>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="pagada">Pagada</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="sm:w-auto">
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
