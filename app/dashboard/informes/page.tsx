// app/dashboard/informes/page.tsx
import { InformeCard } from "@/components/informes/card-informe";

export default async function InformesPage() {
    const informes = [
        {
            id: "saldos-contables",
            title: "Informe de Saldos Contables",
            description: "Descarga el informe contable de cargos y abonos al día de hoy.",
            action: "download",
            requiresPeriod: false,
        },
        {
            id: "inf-3688",
            title: "Informe RG 3688 - AFIP",
            description: "Genera el archivo TXT mensual conforme a la Resolución General 3688.",
            action: "download",
            requiresPeriod: true,
        },
        {
            id: "central-deudores",
            title: "Central de Deudores - INAES",
            description: "Genera el CSV mensual con deudores y situación crediticia por mora.",
            action: "download",
            requiresPeriod: true,
        },
    ] as const;

    return (
        <div className="grid gap-6 sm:grid-cols-2">
            {informes.map((inf) => (
                <InformeCard key={inf.id} informe={inf} />
            ))}
        </div>
    );
}
