"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function CobrarSubmitButton() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isSubmitting) {
            setElapsed(0);
            return;
        }

        const interval = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isSubmitting]);

    useEffect(() => {
        if (!isSubmitting) return;

        const safetyReset = setTimeout(() => {
            setIsSubmitting(false);
        }, 120000);

        return () => clearTimeout(safetyReset);
    }, [isSubmitting]);

    return (
        <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={isSubmitting}
            onClick={() => setIsSubmitting(true)}
        >
            {isSubmitting ? `Cobrando... ${elapsed}s` : "Cobrar seleccionadas"}
        </Button>
    );
}
