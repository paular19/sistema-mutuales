"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";
import { CancelacionesTable, type CuotaRow } from "@/components/cancelaciones/cancelaciones-table";
import { CobrarSubmitButton } from "@/components/cancelaciones/cobrar-submit-button";

interface CobrarActionResult {
    success?: boolean;
    error?: string;
    total?: number;
    count?: number;
}

interface CancelacionesCobroFormProps {
    filas: CuotaRow[];
    action: (formData: FormData) => Promise<CobrarActionResult>;
}

export function CancelacionesCobroForm({ filas, action }: CancelacionesCobroFormProps) {
    const [pending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            try {
                const res = await action(formData);

                if (res?.error) {
                    toast.error(res.error);
                    return;
                }

                if (!res?.success) {
                    toast.error("No se pudo completar la cobranza.");
                    return;
                }

                toast.success(
                    `Cobranza realizada: ${res.count ?? 0} cuota${(res.count ?? 0) === 1 ? "" : "s"} por ${formatCurrency(res.total ?? 0)}.`
                );

                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error("Ocurrió un error al cobrar las cuotas seleccionadas.");
            }
        });
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            <CancelacionesTable filas={filas} tipo="impagas" />

            {filas.length > 0 && (
                <div className="flex justify-end">
                    <CobrarSubmitButton pending={pending} />
                </div>
            )}
        </form>
    );
}
