import type { AporteItem } from "@/lib/match";

// Reparte la cobertura de una UTE entre sus miembros: cada requisito se le
// asigna al miembro que mejor lo cumple (el máximo, igual que _cobertura_conjunto
// en la base). Sirve para dibujar la barra de cobertura y mostrar "qué aporta cada uno".

export interface RequisitoResumen {
  id: string;
  nombre: string;
  peso: number;
  obligatorio: boolean;
}

export interface MiembroUte {
  empresaId: string;
  nombre: string;
  departamento: string | null;
  aporte: AporteItem[];
}

export interface AporteMiembro {
  requisitoId: string;
  nombre: string;
  cumple: number; // 0-1
  puntos: number; // aporte a la cobertura total, 0-100
  obligatorio: boolean;
}

export interface ReparticionMiembro {
  empresaId: string;
  aportes: AporteMiembro[];
  puntos: number;
}

export interface Reparticion {
  miembros: ReparticionMiembro[];
  sinCubrir: { nombre: string; obligatorio: boolean; cumple: number }[];
  total: number;
}

export function repartirCobertura(
  requisitos: RequisitoResumen[],
  miembros: MiembroUte[]
): Reparticion {
  const pesoTotal = requisitos.reduce((acc, r) => acc + r.peso, 0);
  const porMiembro = new Map<string, ReparticionMiembro>(
    miembros.map((m) => [m.empresaId, { empresaId: m.empresaId, aportes: [], puntos: 0 }])
  );
  const sinCubrir: Reparticion["sinCubrir"] = [];
  let total = 0;

  for (const req of requisitos) {
    let mejor: { empresaId: string; cumple: number } | null = null;
    for (const m of miembros) {
      const cumple = m.aporte.find((a) => a.requisitoId === req.id)?.cumple ?? 0;
      if (cumple > 0 && (mejor === null || cumple > mejor.cumple)) {
        mejor = { empresaId: m.empresaId, cumple };
      }
    }

    if (mejor) {
      const puntos = pesoTotal > 0 ? ((req.peso * mejor.cumple) / pesoTotal) * 100 : 0;
      const destino = porMiembro.get(mejor.empresaId);
      if (destino) {
        destino.aportes.push({
          requisitoId: req.id,
          nombre: req.nombre,
          cumple: mejor.cumple,
          puntos,
          obligatorio: req.obligatorio,
        });
        destino.puntos += puntos;
      }
      total += puntos;
    }

    const cumpleFinal = mejor?.cumple ?? 0;
    if (cumpleFinal < 1) {
      sinCubrir.push({ nombre: req.nombre, obligatorio: req.obligatorio, cumple: cumpleFinal });
    }
  }

  return { miembros: miembros.map((m) => porMiembro.get(m.empresaId)!), sinCubrir, total };
}
