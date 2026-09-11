# Deuda visual pendiente

Detectada en el QA de aceptación. **No resolver de forma aislada**: va en la
próxima ronda de dirección visual, no mezclada con cambios de contenido.

| # | Tema | Detalle | Severidad |
|---|---|---|---|
| 1 | Scrim del menú móvil | El menú del navbar no oscurece el fondo. `backdrop-blur` en el header crea un bloque contenedor, así que el scrim `fixed inset-0` mide 390×72 px en vez de la pantalla. El drawer de filtros no está afectado | Alta |
| 2 | Cuero demasiado claro | `brand/interior.jpg` es cognac (media `#9b6d4b`); la referencia es vinotinto oscuro (media `#42322e`). Hoy solo se usa en /contacto | Alta |
| 3 | Vinotinto de interfaz | Los botones usan `#5f0913`, tomado del escudo. Los comps usan `#4d101b`, más profundo. Falta decidir cuál manda | Media |
| 4 | Navbar contextual | La referencia alterna navbar negro en detalle y estados, con "Agendar cita" como CTA. Hoy hay un solo navbar crema con "Ver inventario". La variante `tone="dark"` ya existe pero no se usa | Media |
| 5 | 404 | La referencia centra el número con el auto sangrando abajo; la implementación es a dos columnas alineada a la izquierda | Media |
| 6 | Inventario vacío | Falta la fila de confianza inferior de la referencia: certificados, asesoría, experiencia | Baja |
| 7 | Admin crear | La referencia usa selects para marca y modelo y chips para colores; hoy son campos de texto | Baja |

## Alcance admin por decidir

`/admin/categorias` y `/admin/configuracion` existen solo para que la barra
lateral no tenga enlaces rotos. Probablemente se retiren.
