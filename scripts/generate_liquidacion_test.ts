import fs from "fs/promises";
import path from "path";
import { liquidacionAyudaEconomicaTemplate } from "./temp-liquidacion-standalone";

async function main() {
    const datos: any = {
        mutual: { nombre: "Mutual de Prueba" },
        credito: {
            id_credito: "TEST-LIQ-0001",
            tasa_interes: 0, // forzar fallback a 115.00%
            numero_cuotas: 12,
            monto: 60000,
            primera_venc: "2026-02-10",
            fecha_creacion: new Date().toISOString(),
        },
        asociado: { socio_nro: "54321", codigo_externo: "B-54321", cuit: "20-12345678-3", nombre: "Juan", apellido: "Perez" },
    };

    const pdfBytes = await liquidacionAyudaEconomicaTemplate.render(datos);
    const out = path.resolve(process.cwd(), "liquidacion-test.pdf");
    await fs.writeFile(out, Buffer.from(pdfBytes));
    console.log("PDF generado:", out);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
