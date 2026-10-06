import { cn } from "@/lib/utils";

/** Ilustración propia: perfil de la cordillera con capas de estratos.
 *  Decorativa (aria-hidden). Usa currentColor + opacidades para adaptarse al fondo. */
export function Cordillera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden className={cn("w-full", className)}>
      <path
        d="M0 260V170l70-48 46 30 74-86 58 52 40-36 92 104 60-58 52 34 78-96 70 72 56-30 104 92v60Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path
        d="M0 260v-52l96-62 52 38 88-70 76 70 44-28 84 66 74-50 64 36 82-74 72 56 68-20v90Z"
        fill="currentColor"
        fillOpacity="0.32"
      />
      <path
        d="M0 260v-30l120-40 70 22 110-46 90 50 80-26 100 34 96-38 134 44v30Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
    </svg>
  );
}
