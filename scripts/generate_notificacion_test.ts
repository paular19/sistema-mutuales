import fs from "fs/promises";
import path from "path";
import { notificacionLey24240Template } from "./temp-notificacion-standalone";

async function main() {
    const datos: any = {
        mutual: { nombre: "Mutual de Prueba" },
        credito: {
            id_credito: "TEST-0001",
            tasa_interes: 0, // forzar fallback en la plantilla
            numero_cuotas: 6,
            monto: 120000,
            primera_venc: "2026-02-15",
            fecha_creacion: new Date().toISOString(),
        },
        asociado: { socio_nro: "12345", codigo_externo: "A-12345" },
    };

    const pdfBytes = await notificacionLey24240Template.render(datos);
    const out = path.resolve(process.cwd(), "notificacion-test.pdf");
    await fs.writeFile(out, Buffer.from(pdfBytes));
    console.log("PDF generado:", out);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
