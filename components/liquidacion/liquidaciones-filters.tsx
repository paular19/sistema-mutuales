'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useEffect, useState } from 'react';

export function LiquidacionesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔹 Campos
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [producto, setProducto] = useState(searchParams.get('producto') || '');

  // 🔸 Debounce para evitar demasiadas requests
  const [debouncedSearch] = useDebounce(search, 300);
  const [debouncedProducto] = useDebounce(producto, 300);

  // 🔁 Actualiza la URL cuando cambian los filtros
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (debouncedProducto) params.set('producto', debouncedProducto);

    const query = params.toString();
    const newUrl = `/dashboard/liquidaciones${query ? `?${query}` : ''}`;

    if (newUrl !== window.location.pathname + window.location.search) {
      router.push(newUrl);
    }
  }, [debouncedSearch, debouncedProducto, router]);

  const clearFilters = () => {
    setSearch('');
    setProducto('');
    router.push('/dashboard/liquidaciones');
  };

  const hasFilters = search || producto;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 🔍 Buscar asociado (nombre, apellido, CUIT o email) */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por asociado, CUIT o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 🧾 Producto */}
          <Input
            placeholder="Filtrar por producto..."
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            className="sm:w-48"
          />

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
