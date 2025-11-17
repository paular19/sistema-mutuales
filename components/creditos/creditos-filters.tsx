'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useEffect, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function CreditosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filtros
  const [nombre, setNombre] = useState(searchParams.get('nombre') || '');
  const [estado, setEstado] = useState(searchParams.get('estado') || '');
  const [producto, setProducto] = useState(searchParams.get('producto') || '');

  // Debounce
  const [debouncedNombre] = useDebounce(nombre, 300);
  const [debouncedEstado] = useDebounce(estado, 300);
  const [debouncedProducto] = useDebounce(producto, 300);

  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedNombre) params.set('nombre', debouncedNombre);
    if (debouncedEstado) params.set('estado', debouncedEstado);
    if (debouncedProducto) params.set('producto', debouncedProducto);

    const query = params.toString();
    const newUrl = `/dashboard/creditos${query ? `?${query}` : ''}`;

    if (newUrl !== window.location.pathname + window.location.search) {
      router.push(newUrl);
    }
  }, [debouncedNombre, debouncedEstado, debouncedProducto, router]);

  const clearFilters = () => {
    setNombre('');
    setEstado('');
    setProducto('');
    router.push('/dashboard/creditos');
  };

  const hasFilters = nombre || estado || producto;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 🔍 Buscar por nombre */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre del asociado..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* ⚙️ Filtro por estado */}
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>

          {/* 🧾 Filtro por producto */}
          <Input
            placeholder="Filtrar por producto"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            className="sm:w-48"
          />

          {hasFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
