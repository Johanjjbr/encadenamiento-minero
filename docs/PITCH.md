# PITCH.md: Guion de pitch, demo y ensayo

Pitch de **3 minutos + demo en vivo**. Basado en `docs/NEGOCIO.md` y en los datos del seed (`docs/DEMO.md`). Los números de la demo son los reales que devuelve el algoritmo: no improvisar otros.

## 1. Guion (3:00)

| Tiempo | Bloque | Qué decir (idea fuerza) |
|---|---|---|
| 0:00-0:30 | **Problema** | La minería pasa por San Juan, pero los contratos grandes se van afuera. Las pymes locales no son visibles, no saben qué les falta y, solas, no tienen escala para cubrir un contrato completo. |
| 0:30-0:50 | **Solución** | Un mercado B2B que (1) fracciona las licitaciones en lotes, (2) califica a cada pyme contra cada lote con un puntaje explicable y (3) cuando ninguna llega sola, **arma la alianza (UTE)** que sí llega al 100 %. |
| 0:50-2:20 | **Demo** | Ver §2. Frase clave: «Ninguna pyme podía sola. Juntas, cubren el 100 %.» |
| 2:20-2:45 | **Negocio** | SaaS para operadoras (ranking, UTEs, reporte de contenido local) · freemium para pymes · la brecha de cada pyme es un lead para certificadoras y consultoras (marketplace) · integración con empresas tech sanjuaninas. |
| 2:45-3:00 | **Cierre** | Impacto: más contratos para proveedores locales y brechas cerradas. Próximo paso: piloto con una operadora y la cámara de proveedores. |

## 2. Demo en vivo (90 s): clic por clic

Preparación: navegador con la URL de producción abierta en `/login`, zoom al 110 %, sesión cerrada.

1. **«Entrar como minera»** → *Licitaciones y candidatas*. Señalar: 2 lotes de *Servicios de soporte a la operación*.
2. Abrir **Mantenimiento de flota en sitio**.
   - Ranking: Taller Mecánico Cuyo **63 %**, Seguridad Industrial Andina **55 %**; ninguna cumple los obligatorios.
   - Card **UTE Builder**: Cuyo + Andina → **cobertura 100 %** (score 95). Mostrar qué aporta cada una: Cuyo la mecánica pesada, Andina el HSE.
3. (Opcional, 15 s) **Publicar licitación** → «Cargar ejemplo» → *Publicar*: el ranking y las UTEs del lote nuevo aparecen al instante.
3b. (10 s) Clic en **Seguridad Industrial Andina** → ficha con capacidades y certificaciones; volver al lote y **Aceptar alianza**.
4. **Cerrar sesión** → **«Entrar como pyme»** (Taller Mecánico Cuyo): ve su **63 %**, la brecha «te falta: HSE (obligatorio)…» y el aviso «¡Minera Andes del Sur aceptó tu alianza!».
5. Remate: en *Transporte de insumos a sitio*, Transportes Cordillera llega sola al **100 %** → cuando una pyme puede sola, el sistema no fuerza alianzas.

Plan B si falla internet o el deploy: `npm run dev` en la notebook con los mismos usuarios demo; como último recurso, capturas de pantalla de cada paso (sacarlas en el ensayo).

## 3. Preguntas probables del jurado

| Pregunta | Respuesta corta |
|---|---|
| ¿Cómo calculan el score? | Promedio ponderado por peso de cada requisito: capacidad = nivel de la pyme / nivel exigido (tope 1); norma verificada = 1, declarada = 0,6. Es explicable: mostramos qué cubre y qué falta. |
| ¿Y si una pyme miente? | Las certificaciones son *declaradas* o *verificadas* y lo declarado pesa menos. La plataforma **no reemplaza la homologación** de la operadora: le acerca candidatas. |
| ¿Cómo arman la UTE? | Cobertura de conjuntos con heurística greedy: parte de las mejores pymes y suma la que más cubre de la brecha; poda miembros redundantes y penaliza alianzas grandes. Corre en PostgreSQL. |
| ¿Por qué pagaría una minera? | Ahorra búsqueda manual de proveedores y le da evidencia de contenido local. |
| ¿Escala a otras provincias o rubros? | El catálogo de capacidades y las normas son configurables; el algoritmo no depende de San Juan. |
| ¿Qué falta para producción? | Verificación por terceros, aceptación formal de la UTE por las partes, onboarding asistido de pymes. |

## 4. Checklist de ensayo (3 corridas sin fallas)

- [ ] Ensayo 1: producción, desde la notebook de la demo. Tiempo total: ___
- [ ] Ensayo 2: producción, desde otro dispositivo (celular o tablet).
- [ ] Ensayo 3: completo con cronómetro, con quien presenta y quien maneja la demo.
- [ ] Después de cada ensayo, volver al estado del seed: en el lote, **Deshacer aceptación** de la UTE; las licitaciones de prueba se **Cierran** y luego se **Eliminan** desde el listado de la minera; si tocaste un perfil, `npm run seed` restaura niveles y certificaciones (las capacidades agregadas a mano se quitan desde *Mi perfil*).
- [ ] Capturas del Plan B guardadas.
