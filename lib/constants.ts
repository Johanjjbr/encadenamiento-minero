// Constantes compartidas de la plataforma.

/** Lista controlada de normas. Debe coincidir EXACTO con `lote_requisitos.norma`
 *  y `certificaciones.norma`: el match compara texto. Para agregar una norma,
 *  sumarla acá (y usarla igual en el seed / en los requisitos de los lotes). */
export const NORMAS = ["ISO 9001", "ISO 14001", "ISO 45001"] as const;

export const NIVELES = [
  { valor: 0, etiqueta: "No ofrece", detalle: "" },
  { valor: 1, etiqueta: "Básico", detalle: "Experiencia puntual o menos de 2 años" },
  { valor: 2, etiqueta: "Regular", detalle: "2 años o más con contratos industriales" },
  { valor: 3, etiqueta: "Referente", detalle: "Experiencia en minería o contratos grandes" },
] as const;

/** Orden de las categorías de capacidades en el perfil (de lo más a lo menos
 *  habitual en proveedores mineros). Las categorías nuevas van al final. */
export const CATEGORIAS_ORDEN = [
  "Taller y mantenimiento",
  "Transporte y logística",
  "Obra y construcción",
  "Servicios de apoyo",
  "Seguridad y ambiente",
  "Técnicos y profesionales",
] as const;

export const ESTADO_CERTIFICACION = {
  declarada: "Declarada",
  verificada: "Verificada",
  vencida: "Vencida",
} as const;

/** Los 19 departamentos de San Juan. */
export const DEPARTAMENTOS = [
  "Albardón", "Angaco", "Calingasta", "Capital", "Caucete", "Chimbas",
  "Iglesia", "Jáchal", "9 de Julio", "Pocito", "Rawson", "Rivadavia",
  "San Martín", "Santa Lucía", "Sarmiento", "Ullúm", "Valle Fértil",
  "25 de Mayo", "Zonda",
] as const;
