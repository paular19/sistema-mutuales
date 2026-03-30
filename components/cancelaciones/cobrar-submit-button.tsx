"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface CobrarSubmitButtonProps {
    pending?: boolean;
}

export function CobrarSubmitButton({ pending = false }: CobrarSubmitButtonProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!pending) {
            setElapsed(0);
            return;
        }

        const interval = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [pending]);

    return (
        <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={pending}
        >
            {pending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
            {pending ? `Cobrando... ${elapsed}s` : "Cobrar seleccionadas"}
        </Button>
    );
}
