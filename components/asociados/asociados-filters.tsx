"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Search, X } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useEffect, useState, useTransition } from "react";

export function AsociadosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(search, 300);

  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set("search", debouncedSearch);

    const newUrl = `/dashboard/asociados${params.toString() ? `?${params.toString()}` : ""}`;

    if (newUrl !== window.location.pathname + window.location.search) {
      startTransition(() => {
        router.replace(newUrl);
      });
    }
  }, [debouncedSearch, router, startTransition]);

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.replace("/dashboard/asociados");
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex min-h-5 items-center justify-end text-sm text-muted-foreground">
            {isPending ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="h-4 w-4" />
                Actualizando resultados...
              </span>
            ) : null}
          </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />

              <Input
                placeholder="Buscar por nombre, apellido, CUIT o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {search && (
              <button
                onClick={clearFilters}
                disabled={isPending}
                className="text-sm text-red-600 flex items-center gap-1 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Limpiar
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
