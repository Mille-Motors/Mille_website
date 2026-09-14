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

`/admin/categorias` ya administra la taxonomía de verdad y se queda.
`/admin/configuracion` sigue siendo informativa a propósito: no habrá nada
que configurar hasta que existan dominio, correo, WhatsApp e Instagram.
**Queda pendiente de decisión humana si esa pantalla se retira o se llena
cuando llegue esa fase.**

## Contenido editable desde admin — RESUELTO

Las cuatro fotografías de la home ya se administran desde **`/admin/contenido`**
y cambiarlas no exige desplegar. Las claves y sus imágenes de respaldo viven
en `src/lib/site-media.ts`; el funcionamiento está en `docs/backend.md`.

| Slot | Clave | Componente | Imagen original |
| --- | --- | --- | --- |
| Hero de la home | `home.hero` | `components/home/Hero.tsx` | `brand/hero.jpg` |
| Capítulo 01, por qué estamos aquí | `home.about.origin` | `components/home/about/ChapterOrigin.tsx` | `vehicles/audi-rs-5-sportback/01.jpg` |
| House of Motor Culture | `home.about.house` | `components/home/about/HouseOfMotorCulture.tsx` | `vehicles/bmw-m4-competition/01.jpg` |
| Capítulo 06, hacia dónde queremos ir | `home.about.future` | `components/home/about/ChapterFuture.tsx` | `vehicles/bmw-r-1250-gs-adventure/01.jpg` |

Los componentes siguen intactos salvo el origen de la imagen: cada uno lee su
slot y, si no se ha cambiado nunca o la base no responde, cae a la fotografía
original del repositorio.

## Ficha técnica — decisión de producto y nota legal

MILLE **no** debe asumir que puede republicar PDFs, brochures, fotografías,
diagramas ni material gráfico OEM completo de BMW, Mercedes-Benz, Audi,
Porsche u otros fabricantes. Reproducir ese material sin permiso validado es
un riesgo que no vale la pena correr.

La dirección acordada es una **Ficha Técnica MILLE**: datos técnicos
verificables, recogidos por nosotros, presentados con diseño propio, con la
fuente registrada y un enlace oficial cuando corresponda.

Alcance previsto cuando se construya: especificaciones, equipamiento,
motorización, potencia, torque, transmisión, tracción, dimensiones cuando sean
relevantes y consumos o autonomía cuando apliquen.

El copy del capítulo 02 ya refleja esta intención. **El sistema de ficha o PDF
no está construido y no debe construirse todavía.**
