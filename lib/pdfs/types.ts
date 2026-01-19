import type { Convenio } from "@prisma/client";

export type DatosDocumento = {
  credito: {
    id_credito: number;
    monto: number;
    numero_cuotas: number;
    tasa_interes: number;
    fecha_creacion: Date;
    primera_venc: Date;
    producto: { nombre: string };
  };
  asociado: {
    id_asociado: number;
    nombre?: string | null;
    apellido?: string | null;
    razon_social?: string | null;
    cuit?: string | null;

    telefono?: string | null;
    email?: string | null;

    calle?: string | null;
    numero_calle?: number | null;
    piso?: string | null;
    departamento?: string | null;

    localidad?: string | null;
    provincia?: string | null;
    codigo_postal?: string | null;

    convenio?: Convenio | null;

    fecha_nac?: string | null;
    estado_civil?: string | null;
    lugar_nacimiento?: string | null;

    socio_nro?: string | null;
    codigo_externo?: string | null;
    convenio_numero?: string | null;

    [k: string]: any;
  };
  mutual: {
    nombre: string;
    cuit?: string | null;
  };
};

export type PdfTemplate = {
  id: string;               // "solicitud-ingreso"
  label: string;            // "Solicitud de Ingreso"
  filename: (d: DatosDocumento) => string;
  render: (d: DatosDocumento) => Promise<Uint8Array>;
};
