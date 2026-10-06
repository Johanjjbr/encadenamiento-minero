/**
 * scripts/seed.ts
 *
 * Carga los datos de demo de docs/DEMO.md: catálogo de capacidades, 2 mineras,
 * 5 pymes, 2 licitaciones con 3 lotes, requisitos y usuarios demo. Al final
 * calcula los rankings y las UTEs, y verifica los resultados esperados.
 *
 * Idempotente: usa IDs fijos + upsert, así que se puede correr N veces sin
 * duplicar nada. No borra datos (si cambiás un requisito en este archivo,
 * el upsert lo actualiza; los que elimines de acá quedan en la base).
 *
 * Uso:  npm run seed
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local (solo servidor/scripts:
 * esa clave saltea RLS, nunca debe llegar al navegador).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../types/database";

// ---------------------------------------------------------------------------
// Conexión
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Minero-2026";

function assertOk(etiqueta: string, error: { message: string } | null): void {
  if (error) throw new Error(`${etiqueta}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// IDs fijos (válidos como UUID v4) para que el seed sea idempotente.
// grupo: 1 empresas · 2 capacidades · 3 licitaciones · 4 lotes · 5 requisitos
// ---------------------------------------------------------------------------
const uuid = (grupo: number, n: number): string =>
  `${grupo.toString(16).padStart(8, "0")}-0000-4000-8000-${n
    .toString()
    .padStart(12, "0")}`;

// ---------------------------------------------------------------------------
// 1. Catálogo de capacidades (docs/DEMO.md §2)
// ---------------------------------------------------------------------------
const CAPACIDADES: { codigo: string; nombre: string; categoria: string }[] = [
  // Taller y mantenimiento
  { codigo: "mecanica_pesada", nombre: "Mecánica pesada", categoria: "Taller y mantenimiento" },
  { codigo: "mecanica_liviana", nombre: "Mecánica liviana", categoria: "Taller y mantenimiento" },
  { codigo: "soldadura", nombre: "Soldadura", categoria: "Taller y mantenimiento" },
  { codigo: "mecanizado_torneria", nombre: "Mecanizado y tornería", categoria: "Taller y mantenimiento" },
  { codigo: "electricidad_industrial", nombre: "Electricidad industrial", categoria: "Taller y mantenimiento" },
  { codigo: "instrumentacion_control", nombre: "Instrumentación y control", categoria: "Taller y mantenimiento" },
  // Transporte y logística
  { codigo: "transporte_cargas", nombre: "Transporte de cargas", categoria: "Transporte y logística" },
  { codigo: "transporte_personal", nombre: "Transporte de personal", categoria: "Transporte y logística" },
  { codigo: "izaje_grua", nombre: "Izaje con grúa", categoria: "Transporte y logística" },
  { codigo: "logistica_almacenes", nombre: "Logística y almacenes", categoria: "Transporte y logística" },
  // Obra y construcción
  { codigo: "obra_civil", nombre: "Obra civil", categoria: "Obra y construcción" },
  { codigo: "movimiento_suelos", nombre: "Movimiento de suelos", categoria: "Obra y construcción" },
  { codigo: "estructuras_metalicas", nombre: "Estructuras metálicas", categoria: "Obra y construcción" },
  { codigo: "campamentos_modulares", nombre: "Campamentos modulares", categoria: "Obra y construcción" },
  // Servicios de apoyo
  { codigo: "catering", nombre: "Catering", categoria: "Servicios de apoyo" },
  { codigo: "limpieza_industrial", nombre: "Limpieza industrial", categoria: "Servicios de apoyo" },
  { codigo: "seguridad_vigilancia", nombre: "Seguridad y vigilancia", categoria: "Servicios de apoyo" },
  { codigo: "gestion_residuos", nombre: "Gestión de residuos", categoria: "Servicios de apoyo" },
  // Seguridad y ambiente
  { codigo: "hse_seguridad_higiene", nombre: "HSE (seguridad e higiene)", categoria: "Seguridad y ambiente" },
  { codigo: "monitoreo_ambiental", nombre: "Monitoreo ambiental", categoria: "Seguridad y ambiente" },
  // Técnicos y profesionales
  { codigo: "topografia_geologia", nombre: "Topografía y geología", categoria: "Técnicos y profesionales" },
  { codigo: "laboratorio_analisis", nombre: "Laboratorio y análisis", categoria: "Técnicos y profesionales" },
  { codigo: "ingenieria_proyectos", nombre: "Ingeniería de proyectos", categoria: "Técnicos y profesionales" },
  { codigo: "software_it", nombre: "Software e IT", categoria: "Técnicos y profesionales" },
];

const capacidadId = new Map<string, string>(
  CAPACIDADES.map((c, i) => [c.codigo, uuid(2, i + 1)])
);

function capId(codigo: string): string {
  const id = capacidadId.get(codigo);
  if (!id) throw new Error(`Capacidad desconocida en el seed: "${codigo}"`);
  return id;
}

// ---------------------------------------------------------------------------
// 2. Empresas (docs/DEMO.md §3 y §4). Todas ficticias.
// ---------------------------------------------------------------------------
interface MineraSeed {
  id: string;
  nombre: string;
  departamento: string;
  descripcion: string;
}

interface PymeSeed {
  id: string;
  nombre: string;
  departamento: string;
  descripcion: string;
  capacidades: Record<string, 1 | 2 | 3>;
  certificaciones: { norma: string; estado: "declarada" | "verificada" }[];
}

const MINERAS: MineraSeed[] = [
  {
    id: uuid(1, 1),
    nombre: "Minera Andes del Sur",
    departamento: "Iglesia",
    descripcion: "Operadora minera de cobre y oro (empresa ficticia para la demo).",
  },
  {
    id: uuid(1, 2),
    nombre: "Operadora Cordón Dorado",
    departamento: "Calingasta",
    descripcion: "Operadora minera de proyectos de exploración avanzada (empresa ficticia para la demo).",
  },
];

const PYMES: PymeSeed[] = [
  {
    id: uuid(1, 11),
    nombre: "Taller Mecánico Cuyo",
    departamento: "Pocito",
    descripcion: "Taller de mecánica pesada y mantenimiento de equipos industriales.",
    capacidades: { mecanica_pesada: 3, electricidad_industrial: 2, soldadura: 1 },
    certificaciones: [{ norma: "ISO 9001", estado: "verificada" }],
  },
  {
    id: uuid(1, 12),
    nombre: "Seguridad Industrial Andina",
    departamento: "Rivadavia",
    descripcion: "Servicios de seguridad e higiene y soldadura certificada.",
    capacidades: { hse_seguridad_higiene: 3, soldadura: 2 },
    certificaciones: [{ norma: "ISO 9001", estado: "declarada" }],
  },
  {
    id: uuid(1, 13),
    nombre: "Soldaduras del Oeste",
    departamento: "Rawson",
    descripcion: "Soldadura y fabricación de estructuras metálicas.",
    capacidades: { soldadura: 3, estructuras_metalicas: 2, mecanica_liviana: 2 },
    certificaciones: [],
  },
  {
    id: uuid(1, 14),
    nombre: "EcoServicios Calingasta",
    departamento: "Calingasta",
    descripcion: "Gestión de residuos y servicios ambientales.",
    capacidades: { gestion_residuos: 2, hse_seguridad_higiene: 1 },
    certificaciones: [{ norma: "ISO 14001", estado: "verificada" }],
  },
  {
    id: uuid(1, 15),
    nombre: "Transportes Cordillera",
    departamento: "Chimbas",
    descripcion: "Transporte de cargas pesadas e izaje con grúa.",
    capacidades: { transporte_cargas: 3, izaje_grua: 2, hse_seguridad_higiene: 1 },
    certificaciones: [],
  },
];

const ID_MINERA_ANDES = MINERAS[0].id;
const ID_MINERA_CORDON = MINERAS[1].id;
const ID_PYME_CUYO = PYMES[0].id;
const ID_PYME_ANDINA = PYMES[1].id;

// ---------------------------------------------------------------------------
// 3. Licitaciones, lotes y requisitos (docs/DEMO.md §5)
// ---------------------------------------------------------------------------
const ID_LIC_A = uuid(3, 1);
const ID_LIC_B = uuid(3, 2);
const ID_LOTE_1 = uuid(4, 1);
const ID_LOTE_2 = uuid(4, 2);
const ID_LOTE_3 = uuid(4, 3);

interface RequisitoSeed {
  lote: string;
  capacidad?: string; // código del catálogo
  norma?: string;
  nivel: 1 | 2 | 3;
  peso: number; // 1-10
  obligatorio: boolean;
}

const REQUISITOS: RequisitoSeed[] = [
  // Lote 1: Mantenimiento de flota en sitio (peso total 30)
  { lote: ID_LOTE_1, capacidad: "mecanica_pesada", nivel: 2, peso: 10, obligatorio: true },
  { lote: ID_LOTE_1, capacidad: "hse_seguridad_higiene", nivel: 2, peso: 8, obligatorio: true },
  { lote: ID_LOTE_1, capacidad: "soldadura", nivel: 2, peso: 6, obligatorio: false },
  { lote: ID_LOTE_1, norma: "ISO 9001", nivel: 1, peso: 4, obligatorio: false },
  { lote: ID_LOTE_1, capacidad: "electricidad_industrial", nivel: 1, peso: 2, obligatorio: false },
  // Lote 2: Transporte de insumos a sitio (peso total 20)
  { lote: ID_LOTE_2, capacidad: "transporte_cargas", nivel: 2, peso: 10, obligatorio: true },
  { lote: ID_LOTE_2, capacidad: "izaje_grua", nivel: 1, peso: 5, obligatorio: false },
  { lote: ID_LOTE_2, capacidad: "hse_seguridad_higiene", nivel: 1, peso: 5, obligatorio: true },
  // Lote 3: Estructuras metálicas (peso total 20)
  { lote: ID_LOTE_3, capacidad: "estructuras_metalicas", nivel: 2, peso: 10, obligatorio: true },
  { lote: ID_LOTE_3, capacidad: "soldadura", nivel: 2, peso: 6, obligatorio: false },
  { lote: ID_LOTE_3, capacidad: "hse_seguridad_higiene", nivel: 1, peso: 4, obligatorio: true },
];

// ---------------------------------------------------------------------------
// 4. Usuarios demo. Se vinculan a una empresa EXISTENTE vía app_metadata
//    (solo el service role puede escribirlo). OJO: el trigger handle_new_user
//    NO llega a ver ese app_metadata en el alta, así que el enlace real lo
//    hace este script reescribiendo el perfil (ver asegurarUsuario).
// ---------------------------------------------------------------------------
interface UsuarioDemo {
  email: string;
  empresaId: string;
  rol: "minera" | "pyme";
  etiqueta: string;
}

const USUARIOS_DEMO: UsuarioDemo[] = [
  { email: "minera.demo@example.com", empresaId: ID_MINERA_ANDES, rol: "minera", etiqueta: "Minera Andes del Sur" },
  { email: "pyme.demo@example.com", empresaId: ID_PYME_CUYO, rol: "pyme", etiqueta: "Taller Mecánico Cuyo" },
  { email: "pyme2.demo@example.com", empresaId: ID_PYME_ANDINA, rol: "pyme", etiqueta: "Seguridad Industrial Andina" },
];

// ---------------------------------------------------------------------------
// Pasos del seed
// ---------------------------------------------------------------------------
async function seedCatalogo(): Promise<void> {
  const filas: TablesInsert<"catalogo_capacidades">[] = CAPACIDADES.map((c) => ({
    id: capId(c.codigo),
    codigo: c.codigo,
    nombre: c.nombre,
    categoria: c.categoria,
  }));
  const { error } = await supabase
    .from("catalogo_capacidades")
    .upsert(filas, { onConflict: "id" });
  assertOk("catalogo_capacidades", error);
  console.log(`  ✓ catálogo: ${filas.length} capacidades`);
}

async function seedEmpresas(): Promise<void> {
  const mineras: TablesInsert<"empresas">[] = MINERAS.map((m) => ({
    id: m.id,
    tipo: "MINERA",
    nombre: m.nombre,
    departamento: m.departamento,
    descripcion: m.descripcion,
    acepta_ute: true,
  }));
  const pymes: TablesInsert<"empresas">[] = PYMES.map((p) => ({
    id: p.id,
    tipo: "PYME",
    nombre: p.nombre,
    departamento: p.departamento,
    descripcion: p.descripcion,
    acepta_ute: true,
  }));
  const { error } = await supabase
    .from("empresas")
    .upsert([...mineras, ...pymes], { onConflict: "id" });
  assertOk("empresas", error);
  console.log(`  ✓ empresas: ${mineras.length} mineras, ${pymes.length} pymes`);
}

async function seedCapacidadesYCertificaciones(): Promise<void> {
  const capacidades: TablesInsert<"empresa_capacidades">[] = PYMES.flatMap((p) =>
    Object.entries(p.capacidades).map(([codigo, nivel]) => ({
      empresa_id: p.id,
      capacidad_id: capId(codigo),
      nivel,
    }))
  );
  const { error: errCap } = await supabase
    .from("empresa_capacidades")
    .upsert(capacidades, { onConflict: "empresa_id,capacidad_id" });
  assertOk("empresa_capacidades", errCap);

  const certificaciones: TablesInsert<"certificaciones">[] = PYMES.flatMap((p) =>
    p.certificaciones.map((c) => ({
      empresa_id: p.id,
      norma: c.norma,
      estado: c.estado,
    }))
  );
  const { error: errCert } = await supabase
    .from("certificaciones")
    .upsert(certificaciones, { onConflict: "empresa_id,norma" });
  assertOk("certificaciones", errCert);

  console.log(
    `  ✓ capacidades de pymes: ${capacidades.length} · certificaciones: ${certificaciones.length}`
  );
}

async function seedLicitaciones(): Promise<void> {
  // Cierre a 60 días de hoy (se actualiza en cada corrida, es solo demo).
  const cierre = new Date(Date.now() + 60 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const licitaciones: TablesInsert<"licitaciones">[] = [
    {
      id: ID_LIC_A,
      minera_id: ID_MINERA_ANDES,
      titulo: "Servicios de soporte a la operación",
      descripcion:
        "Contrato fraccionado en lotes para que pymes locales puedan competir: mantenimiento de flota y transporte de insumos.",
      estado: "abierta",
      cierre_el: cierre,
    },
    {
      id: ID_LIC_B,
      minera_id: ID_MINERA_CORDON,
      titulo: "Obra menor de estructuras",
      descripcion: "Fabricación y montaje de estructuras metálicas auxiliares.",
      estado: "abierta",
      cierre_el: cierre,
    },
  ];
  const { error: errLic } = await supabase
    .from("licitaciones")
    .upsert(licitaciones, { onConflict: "id" });
  assertOk("licitaciones", errLic);

  const lotes: TablesInsert<"lotes">[] = [
    { id: ID_LOTE_1, licitacion_id: ID_LIC_A, titulo: "Mantenimiento de flota en sitio" },
    { id: ID_LOTE_2, licitacion_id: ID_LIC_A, titulo: "Transporte de insumos a sitio" },
    { id: ID_LOTE_3, licitacion_id: ID_LIC_B, titulo: "Estructuras metálicas" },
  ];
  const { error: errLote } = await supabase
    .from("lotes")
    .upsert(lotes, { onConflict: "id" });
  assertOk("lotes", errLote);

  const requisitos: TablesInsert<"lote_requisitos">[] = REQUISITOS.map((r, i) => ({
    id: uuid(5, i + 1),
    lote_id: r.lote,
    tipo: r.capacidad ? "capacidad" : "norma",
    capacidad_id: r.capacidad ? capId(r.capacidad) : null,
    norma: r.norma ?? null,
    nivel_minimo: r.nivel,
    peso: r.peso,
    obligatorio: r.obligatorio,
  }));
  const { error: errReq } = await supabase
    .from("lote_requisitos")
    .upsert(requisitos, { onConflict: "id" });
  assertOk("lote_requisitos", errReq);

  console.log(
    `  ✓ licitaciones: ${licitaciones.length} · lotes: ${lotes.length} · requisitos: ${requisitos.length}`
  );
}

async function buscarUsuarioPorEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const encontrado = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (encontrado) return encontrado.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function asegurarUsuario(u: UsuarioDemo): Promise<"creado" | "existente"> {
  let userId: string;
  let resultado: "creado" | "existente" = "creado";

  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { empresa_id: u.empresaId },
  });

  if (error) {
    const yaExiste = error.status === 422 || /already|registered|exists/i.test(error.message);
    if (!yaExiste) throw new Error(`usuario ${u.email}: ${error.message}`);
    const id = await buscarUsuarioPorEmail(u.email);
    if (!id) throw new Error(`usuario ${u.email}: existe pero no se pudo localizar`);
    userId = id;
    resultado = "existente";
  } else {
    userId = data.user.id;
  }

  // El trigger handle_new_user corre en el momento del alta, ANTES de que
  // Supabase aplique el app_metadata. Por eso crea una empresa vacía
  // ("Empresa sin nombre") y la liga al usuario. Acá se enlaza el perfil a la
  // empresa real y se descarta la vacía (con guarda por nombre, para no
  // borrar nunca una empresa de verdad).
  const { data: previo, error: errPrevio } = await supabase
    .from("perfiles")
    .select("empresa_id")
    .eq("id", userId)
    .maybeSingle();
  assertOk(`perfil previo de ${u.email}`, errPrevio);

  const { error: errPerfil } = await supabase
    .from("perfiles")
    .upsert({ id: userId, empresa_id: u.empresaId, rol: u.rol }, { onConflict: "id" });
  assertOk(`perfil de ${u.email}`, errPerfil);

  if (previo?.empresa_id && previo.empresa_id !== u.empresaId) {
    const { error: errLimpieza } = await supabase
      .from("empresas")
      .delete()
      .eq("id", previo.empresa_id)
      .eq("nombre", "Empresa sin nombre");
    assertOk(`limpieza de empresa vacía de ${u.email}`, errLimpieza);
  }

  return resultado;
}

async function seedUsuarios(): Promise<void> {
  for (const u of USUARIOS_DEMO) {
    const r = await asegurarUsuario(u);
    console.log(`  ✓ usuario ${u.email} (${u.rol}, ${u.etiqueta}): ${r}`);
  }
}

// ---------------------------------------------------------------------------
// Verificación: calcula rankings y UTEs y compara con docs/DEMO.md §6
// ---------------------------------------------------------------------------
const ESPERADOS: { lote: string; titulo: string; scores: Record<string, number> }[] = [
  {
    lote: ID_LOTE_1,
    titulo: "Lote 1 · Mantenimiento de flota",
    scores: {
      "Taller Mecánico Cuyo": 63.33,
      "Seguridad Industrial Andina": 54.67,
      "Soldaduras del Oeste": 20,
      "EcoServicios Calingasta": 13.33,
      "Transportes Cordillera": 13.33,
    },
  },
  {
    lote: ID_LOTE_2,
    titulo: "Lote 2 · Transporte de insumos",
    scores: {
      "Transportes Cordillera": 100,
      "Seguridad Industrial Andina": 25,
      "EcoServicios Calingasta": 25,
      "Taller Mecánico Cuyo": 0,
      "Soldaduras del Oeste": 0,
    },
  },
  {
    lote: ID_LOTE_3,
    titulo: "Lote 3 · Estructuras metálicas",
    scores: {
      "Soldaduras del Oeste": 80,
      "Seguridad Industrial Andina": 50,
      "EcoServicios Calingasta": 20,
      "Transportes Cordillera": 20,
      "Taller Mecánico Cuyo": 15,
    },
  },
];

async function verificar(): Promise<boolean> {
  let todoOk = true;
  const nombres = new Map<string, string>(); // empresa_id -> nombre
  const utesPorLote = new Map<string, string[][]>(); // lote -> [[miembros...], ...]

  for (const esperado of ESPERADOS) {
    console.log(`\n  ${esperado.titulo}`);

    const { data: ranking, error: errRank } = await supabase.rpc("ranking_lote", {
      p_lote_id: esperado.lote,
    });
    assertOk(`ranking_lote (${esperado.titulo})`, errRank);

    for (const fila of ranking ?? []) {
      nombres.set(fila.empresa_id, fila.nombre);
      const score = Number(fila.score);
      const objetivo = esperado.scores[fila.nombre];
      const ok = objetivo !== undefined && Math.abs(score - objetivo) <= 0.01;
      if (!ok) todoOk = false;
      console.log(
        `    ${ok ? "✓" : "✗"} ${fila.nombre.padEnd(30)} ${score.toFixed(2).padStart(6)}` +
          `  obligatorios: ${fila.cumple_obligatorios ? "sí" : "no"}` +
          (ok ? "" : `   (esperado ${objetivo})`)
      );
    }

    const { data: utes, error: errUte } = await supabase.rpc("generar_utes", {
      p_lote_id: esperado.lote,
    });
    assertOk(`generar_utes (${esperado.titulo})`, errUte);

    const grupos: string[][] = [];
    for (const ute of utes ?? []) {
      const { data: miembros, error: errM } = await supabase
        .from("ute_miembros")
        .select("empresa_id")
        .eq("ute_id", ute.id);
      assertOk("ute_miembros", errM);
      const lista = (miembros ?? [])
        .map((m) => nombres.get(m.empresa_id) ?? m.empresa_id)
        .sort();
      grupos.push(lista);
      console.log(
        `    → UTE (score_total ${Number(ute.score_total).toFixed(2)}, cobertura ${Number(
          ute.cobertura
        ).toFixed(2)}): ${lista.join(" + ")}`
      );
    }
    if (grupos.length === 0) console.log("    → sin UTE sugerida");
    utesPorLote.set(esperado.lote, grupos);
  }

  // Resultados esperados de UTEs (docs/DEMO.md §6)
  const incluye = (lote: string, a: string, b: string): boolean =>
    (utesPorLote.get(lote) ?? []).some((g) => g.length === 2 && g.includes(a) && g.includes(b));

  const lote1 = utesPorLote.get(ID_LOTE_1) ?? [];
  const checks: [string, boolean][] = [
    [
      "Lote 1: una única UTE = Cuyo + Andina",
      lote1.length === 1 && incluye(ID_LOTE_1, "Taller Mecánico Cuyo", "Seguridad Industrial Andina"),
    ],
    ["Lote 2: ninguna UTE (Transportes llega sola)", (utesPorLote.get(ID_LOTE_2) ?? []).length === 0],
    [
      "Lote 3: incluye Soldaduras + Andina",
      incluye(ID_LOTE_3, "Soldaduras del Oeste", "Seguridad Industrial Andina"),
    ],
  ];

  console.log("\n  Chequeos de UTEs");
  for (const [descripcion, ok] of checks) {
    if (!ok) todoOk = false;
    console.log(`    ${ok ? "✓" : "✗"} ${descripcion}`);
  }

  return todoOk;
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("Cargando datos de demo...\n");
  await seedCatalogo();
  await seedEmpresas();
  await seedCapacidadesYCertificaciones();
  await seedLicitaciones();
  await seedUsuarios();

  console.log("\nCalculando rankings y UTEs, y verificando contra docs/DEMO.md...");
  const ok = await verificar();

  console.log("\n─────────────────────────────────────────────");
  console.log("Usuarios demo (contraseña: la de DEMO_PASSWORD o la por defecto del seed)");
  for (const u of USUARIOS_DEMO) {
    console.log(`  ${u.rol.padEnd(6)} ${u.email.padEnd(26)} → ${u.etiqueta}`);
  }
  console.log("─────────────────────────────────────────────");

  if (!ok) {
    console.error("\nLa verificación detectó diferencias con docs/DEMO.md (ver ✗ arriba).");
    process.exit(1);
  }
  console.log("\nSeed completo y verificado.");
}

main().catch((e: unknown) => {
  console.error("\nEl seed falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
