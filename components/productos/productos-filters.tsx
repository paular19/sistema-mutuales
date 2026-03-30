"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDebounce } from "use-debounce";
import { useEffect, useState, useTransition } from "react";

export default function ProductosFilters({ search }: { search: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [term, setTerm] = useState(search);
  const [debouncedTerm] = useDebounce(term, 400);

  // ✅ convertimos searchParams a string estable
  const paramsString = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(paramsString);

    if (debouncedTerm) {
      params.set("search", debouncedTerm);
      params.set("page", "1");
    } else {
      params.delete("search");
    }

    const query = params.toString();
    const newUrl = query ? `/dashboard/productos?${query}` : "/dashboard/productos";

    if (newUrl !== window.location.pathname + window.location.search) {
      startTransition(() => {
        router.push(newUrl);
      });
    }
  }, [debouncedTerm, paramsString, router, startTransition]); // 👈 eslint feliz

  return (
    <div className="max-w-sm space-y-2">
      <div className="flex min-h-5 items-center justify-end text-sm text-muted-foreground">
        {isPending ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="h-4 w-4" />
            Actualizando resultados...
          </span>
        ) : null}
      </div>

      <Input
        placeholder="Buscar producto..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
    </div>
  );
}

