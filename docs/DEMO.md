# DEMO.md: Escenario de demo y datos del seed

Fuente única para `scripts/seed.ts` y para el guion del pitch. Todas las empresas son ficticias. Los scores están calculados con las fórmulas de `docs/CONTEXT.md` §4 y sirven como **valores esperados** para probar los RPC.

## 1. Escala

| Nivel | Significado |
|---|---|
| 1 | Experiencia puntual o menos de 2 años |
| 2 | Experiencia regular (2+ años) con contratos industriales |
| 3 | Referente, con experiencia previa en minería o contratos grandes |

Peso de requisito: 1-10. Obligatorio: sin eso no se puede ejecutar el contrato.

## 2. Catálogo de capacidades (24)

| Categoría | Códigos |
|---|---|
| Taller y mantenimiento | `mecanica_pesada`, `mecanica_liviana`, `soldadura`, `mecanizado_torneria`, `electricidad_industrial`, `instrumentacion_control` |
| Transporte y logística | `transporte_cargas`, `transporte_personal`, `izaje_grua`, `logistica_almacenes` |
| Obra y construcción | `obra_civil`, `movimiento_suelos`, `estructuras_metalicas`, `campamentos_modulares` |
| Servicios de apoyo | `catering`, `limpieza_industrial`, `seguridad_vigilancia`, `gestion_residuos` |
| Seguridad y ambiente | `hse_seguridad_higiene`, `monitoreo_ambiental` |
| Técnicos y profesionales | `topografia_geologia`, `laboratorio_analisis`, `ingenieria_proyectos`, `software_it` |

Normas: ISO 9001, ISO 14001, ISO 45001.

## 3. Mineras

| Nombre | Departamento |
|---|---|
| Minera Andes del Sur | Iglesia |
| Operadora Cordón Dorado | Calingasta |

## 4. Pymes

| Pyme | Depto. | Capacidades (nivel) | Certificaciones | `acepta_ute` |
|---|---|---|---|---|
| Taller Mecánico Cuyo | Pocito | `mecanica_pesada` 3, `electricidad_industrial` 2, `soldadura` 1 | ISO 9001 verificada | true |
| Seguridad Industrial Andina | Rivadavia | `hse_seguridad_higiene` 3, `soldadura` 2 | ISO 9001 declarada | true |
| Soldaduras del Oeste | Rawson | `soldadura` 3, `estructuras_metalicas` 2, `mecanica_liviana` 2 | (ninguna) | true |
| EcoServicios Calingasta | Calingasta | `gestion_residuos` 2, `hse_seguridad_higiene` 1 | ISO 14001 verificada | true |
| Transportes Cordillera | Chimbas | `transporte_cargas` 3, `izaje_grua` 2, `hse_seguridad_higiene` 1 | (ninguna) | true |

## 5. Licitaciones, lotes y requisitos

### Licitación A: "Servicios de soporte a la operación" (Minera Andes del Sur)
Contrato grande **fraccionado en 2 lotes**.

**Lote 1: Mantenimiento de flota en sitio** (peso total 30)

| Requisito | Nivel mín. | Peso | Obligatorio |
|---|---|---|---|
| `mecanica_pesada` | 2 | 10 | Sí |
| `hse_seguridad_higiene` | 2 | 8 | Sí |
| `soldadura` | 2 | 6 | No |
| ISO 9001 | n/a | 4 | No |
| `electricidad_industrial` | 1 | 2 | No |

**Lote 2: Transporte de insumos a sitio** (peso total 20)

| Requisito | Nivel mín. | Peso | Obligatorio |
|---|---|---|---|
| `transporte_cargas` | 2 | 10 | Sí |
| `izaje_grua` | 1 | 5 | No |
| `hse_seguridad_higiene` | 1 | 5 | Sí |

### Licitación B (opcional, P2): "Obra menor de estructuras" (Operadora Cordón Dorado)

**Lote 3: Estructuras metálicas** (peso total 20)

| Requisito | Nivel mín. | Peso | Obligatorio |
|---|---|---|---|
| `estructuras_metalicas` | 2 | 10 | Sí |
| `soldadura` | 2 | 6 | No |
| `hse_seguridad_higiene` | 1 | 4 | Sí |

## 6. Resultados esperados

### Ranking Lote 1 (ninguna llega sola)

| Pyme | Score | Cumple obligatorios |
|---|---|---|
| Taller Mecánico Cuyo | 63,3 | No (falta HSE) |
| Seguridad Industrial Andina | 54,7 | No (falta mecánica pesada) |
| Soldaduras del Oeste | 20,0 | No |
| EcoServicios Calingasta | 13,3 | No |
| Transportes Cordillera | 13,3 | No |

**UTE esperada:** Taller Mecánico Cuyo + Seguridad Industrial Andina → cobertura 100, `score_total` 95 (100 − 5 por el 2.º miembro). Es **la única UTE** que debe quedar persistida (ver poda y deduplicación en `CONTEXT.md` §4.3).

### Ranking Lote 2 (una pyme llega sola, no se genera UTE)

| Pyme | Score | Cumple obligatorios |
|---|---|---|
| Transportes Cordillera | 100 | Sí |
| Seguridad Industrial Andina | 25 | No |
| EcoServicios Calingasta | 25 | No |
| Taller Mecánico Cuyo | 0 | No |
| Soldaduras del Oeste | 0 | No |

### Ranking Lote 3 (opcional)

| Pyme | Score | Cumple obligatorios |
|---|---|---|
| Soldaduras del Oeste | 80 | No (falta HSE) |
| Seguridad Industrial Andina | 50 | No |
| EcoServicios Calingasta | 20 | No |
| Transportes Cordillera | 20 | No |
| Taller Mecánico Cuyo | 15 | No |

**UTE esperada:** Soldaduras del Oeste + Seguridad Industrial Andina → cobertura 100, `score_total` 95. Desempate: las tres candidatas para completar la brecha (HSE) aportan lo mismo, gana Andina por mayor score individual.

## 7. Guion de demo (90 s)

1. Entrar como **minera** y abrir el Lote 1: el ranking muestra que nadie pasa del 64%.
2. Mostrar la UTE sugerida Cuyo + Andina al 100% con qué aporta cada una.
3. Entrar como **pyme** (Cuyo): ver el 63% y la brecha "te falta: HSE, ISO..." con la alianza sugerida.
4. Abrir el Lote 2: Transportes Cordillera llega al 100% sin necesidad de UTE (el match directo también funciona).

## 8. Cómo verificar el algoritmo

Después de `npm run seed`, `ranking_lote(<lote 1>)` debe devolver exactamente los scores de la tabla del Lote 1, y `generar_utes(<lote 1>)` debe crear una sola UTE con dos miembros. Si difiere, hay un bug en el RPC (o en el seed), no en la interfaz.
