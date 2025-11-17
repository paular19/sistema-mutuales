"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";
import { useEffect, useState } from "react";

export default function ProductosFilters({ search }: { search: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

    router.push(`/dashboard/productos?${params.toString()}`);
  }, [debouncedTerm, paramsString, router]); // 👈 eslint feliz

  return (
    <div className="max-w-sm">
      <Input
        placeholder="Buscar producto..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
    </div>
  );
}

