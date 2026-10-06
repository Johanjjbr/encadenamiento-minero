"use client";

export default function ErrorDashboard({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
      <p className="font-medium">Algo salió mal al cargar esta pantalla.</p>
      <p className="mt-1 text-sm opacity-90">Probá de nuevo. Si el problema sigue, volvé a iniciar sesión.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
      >
        Reintentar
      </button>
    </div>
  );
}
