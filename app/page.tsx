import Link from "next/link";
import {
  ArrowRight,
  Building,
  Factory,
  Handshake,
  Landmark,
  Layers,
  Pickaxe,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Cordillera } from "@/components/features/cordillera";
import { Logo } from "@/components/features/logo";
import { ScoreRing } from "@/components/features/score-ring";

const PASOS = [
  {
    icono: Layers,
    titulo: "La minera fracciona el contrato",
    texto: "Publica la licitación en lotes más chicos, con requisitos técnicos, peso y obligatoriedad.",
  },
  {
    icono: Target,
    titulo: "Cada pyme ve su match",
    texto: "El algoritmo compara capacidades y certificaciones con cada lote y le muestra exactamente qué le falta.",
  },
  {
    icono: Handshake,
    titulo: "El sistema arma alianzas",
    texto: "Cuando ninguna llega sola, sugiere Uniones Transitorias de Empresas entre pymes complementarias.",
  },
];

const PUBLICOS = [
  {
    icono: Pickaxe,
    titulo: "Operadoras mineras",
    texto: "Ranking de proveedores locales por lote, UTEs armadas y evidencia de contenido local.",
  },
  {
    icono: Factory,
    titulo: "Pymes sanjuaninas",
    texto: "Visibilidad, brecha explícita («te falta ISO 45001») y socios sugeridos para llegar a contratos grandes.",
  },
  {
    icono: Landmark,
    titulo: "Provincia y cámaras",
    texto: "Mapa de capacidades y brechas para orientar programas de desarrollo de proveedores.",
  },
];

/** Vista previa ilustrativa con los datos del escenario de demo (docs/DEMO.md). */
function VistaPrevia() {
  const pymes = [
    { nombre: "Taller Mecánico Cuyo", depto: "Pocito", score: 63 },
    { nombre: "Seguridad Industrial Andina", depto: "Rivadavia", score: 55 },
  ];
  return (
    <div className="relative rounded-2xl border bg-card p-5 shadow-xl shadow-stone-900/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Lote · Mantenimiento de flota</p>
      <ul className="mt-4 space-y-3">
        {pymes.map((p) => (
          <li key={p.nombre} className="flex items-center gap-3">
            <ScoreRing score={p.score} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.nombre}</p>
              <p className="text-xs text-muted-foreground">{p.depto} · no llega sola</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center gap-4 rounded-xl bg-accent/70 p-4">
        <ScoreRing score={100} size={60} etiqueta="juntas" />
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
            <Handshake className="size-4" aria-hidden /> UTE sugerida
          </p>
          <p className="text-xs text-muted-foreground">Cuyo aporta la mecánica pesada; Andina, el HSE obligatorio.</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Ejemplo con los datos ficticios de la demo.</p>
    </div>
  );
}

export default function Inicio() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/60 via-background to-background">
        <div className="mx-auto max-w-6xl px-6">
          <header className="flex items-center justify-between py-6">
            <Logo />
            <Link
              href="/login"
              className="rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
            >
              Ingresar
            </Link>
          </header>

          <div className="grid items-center gap-12 pb-48 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Pickaxe className="size-3.5 text-primary" aria-hidden /> Hackatón «Hackeando la Minería» · San Juan
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
                Que el valor de la minería se quede en las <span className="text-primary">pymes de San Juan</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Calificamos a los proveedores locales contra cada licitación y, cuando ninguno llega solo, sugerimos con
                quién aliarse para cubrirla completa.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Ver la demo <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a
                  href="#como-funciona"
                  className="rounded-lg border bg-card px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Cómo funciona
                </a>
              </div>
            </div>
            <VistaPrevia />
          </div>
        </div>
        <Cordillera className="absolute inset-x-0 bottom-0 h-28 text-primary/40" />
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Cómo funciona</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">De una licitación grande a una alianza local que la cubre</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <div key={titulo} className="relative rounded-2xl border bg-card p-6 shadow-xs">
              <span className="absolute right-5 top-5 text-4xl font-semibold text-muted/80">0{i + 1}</span>
              <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icono className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-semibold">{titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Un puntaje que se explica</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Nada de cajas negras</h2>
            <p className="mt-4 text-muted-foreground">
              Cada requisito del lote tiene un peso. La pyme suma según su nivel en cada capacidad y el estado de sus
              certificaciones. El resultado dice qué cubre y qué le falta, así sabe exactamente qué mejorar.
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              { icono: Target, t: "Capacidades", d: "Nivel de la pyme ÷ nivel exigido, con tope en 100 %." },
              { icono: ShieldCheck, t: "Certificaciones", d: "Verificada = 100 % · declarada = 60 %. No reemplaza la homologación." },
              { icono: Layers, t: "Obligatorios", d: "No descartan: marcan la brecha que una alianza puede completar." },
              { icono: Handshake, t: "Alianzas", d: "Se suma la pyme que más cubre la brecha y se penalizan alianzas grandes." },
            ].map(({ icono: Icono, t, d }) => (
              <div key={t} className="rounded-xl border bg-background p-5">
                <dt className="flex items-center gap-2 font-semibold">
                  <Icono className="size-4 text-primary" aria-hidden /> {t}
                </dt>
                <dd className="mt-2 text-sm text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Para quién</p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {PUBLICOS.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl border bg-card p-6 shadow-xs">
              <Icono className="size-6 text-primary" aria-hidden />
              <h3 className="mt-4 font-semibold">{titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-sidebar bg-estratos text-sidebar-foreground">
        <div className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-16">
          <div>
            <h2 className="text-2xl font-semibold text-white">Mirá el flujo completo en 90 segundos</h2>
            <p className="mt-2 text-sm text-sidebar-foreground/70">
              Entrá como minera o como pyme con un clic: los datos son ficticios.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sidebar-primary/90"
          >
            Entrar a la demo <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Building className="size-3.5" aria-hidden /> Vincula demanda y oferta a partir de capacidades declaradas. No
          reemplaza los procesos de homologación de cada operadora.
        </span>
        <span>Hackatón «Hackeando la Minería» · Ciclo Pilares</span>
      </footer>
    </main>
  );
}
