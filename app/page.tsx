import Link from "next/link";

const PASOS = [
  {
    titulo: "La minera divide el contrato",
    texto: "Publica la licitación en lotes más chicos, con requisitos técnicos, peso y obligatoriedad.",
  },
  {
    titulo: "Cada pyme ve su match",
    texto: "El algoritmo compara capacidades y certificaciones con cada lote y le muestra qué le falta.",
  },
  {
    titulo: "El sistema arma alianzas",
    texto: "Cuando ninguna llega sola, sugiere Uniones Transitorias de Empresas entre pymes complementarias.",
  },
];

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">⛏ Encadenamiento minero</span>
        <Link href="/login" className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
          Ingresar
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="text-sm font-medium text-muted-foreground">Hackatón «Hackeando la Minería» · San Juan</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Que el valor de la minería se quede en las pymes de San Juan.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Una plataforma que califica a los proveedores locales contra cada licitación y, cuando ninguno llega solo,
          sugiere con quién aliarse para cubrirla completa.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ver la demo
          </Link>
        </div>
      </section>

      <section aria-label="Cómo funciona" className="grid gap-4 md:grid-cols-3">
        {PASOS.map((paso, i) => (
          <div key={paso.titulo} className="rounded-xl border bg-card p-5">
            <p className="text-sm font-semibold text-muted-foreground">0{i + 1}</p>
            <h2 className="mt-2 font-semibold">{paso.titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{paso.texto}</p>
          </div>
        ))}
      </section>

      <footer className="mt-12 text-xs text-muted-foreground">
        La plataforma vincula demanda y oferta a partir de capacidades declaradas. No reemplaza los procesos de
        homologación de cada operadora.
      </footer>
    </main>
  );
}
