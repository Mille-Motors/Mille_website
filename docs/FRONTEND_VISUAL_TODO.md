# Deuda visual pendiente

Detectada en el QA de aceptación. **No resolver de forma aislada**: va en la
próxima ronda de dirección visual, no mezclada con cambios de contenido.

| # | Tema | Detalle | Severidad |
|---|---|---|---|
| 1 | ~~Scrim del menú móvil~~ | Resuelto con el rediseño editorial: el menú es ahora una hoja de pantalla completa, sin `backdrop-blur` en la barra. | — |
| 2 | Cuero demasiado claro | `brand/interior.jpg` es cognac (media `#9b6d4b`); la referencia es vinotinto oscuro (media `#42322e`). Hoy solo se usa en /contacto | Alta |
| 3 | Vinotinto de interfaz | Los botones usan `#5f0913`, tomado del escudo. Los comps usan `#4d101b`, más profundo. Falta decidir cuál manda | Media |
| 4 | ~~Navbar contextual~~ | Reemplazado por la barra del rediseño: transparente sobre la portada de la home, crema en el resto. | — |
| 5 | ~~404~~ | Rediseñada con el sistema editorial. | — |
| 6 | Inventario vacío | Falta la fila de confianza inferior de la referencia: certificados, asesoría, experiencia | Baja |
| 7 | Admin crear | La referencia usa selects para marca y modelo y chips para colores; hoy son campos de texto | Baja |

## Alcance admin por decidir

`/admin/categorias` ya administra la taxonomía de verdad y se queda.
`/admin/configuracion` sigue siendo informativa a propósito: no habrá nada
que configurar hasta que existan dominio, correo, WhatsApp e Instagram.
**Queda pendiente de decisión humana si esa pantalla se retira o se llena
cuando llegue esa fase.**

## Contenido editable desde admin — RESUELTO

Las fotografías de la home, el contacto y la 404 se administran desde
**`/admin/contenido`** y cambiarlas no exige desplegar. Las claves y sus
imágenes de respaldo viven en `src/lib/site-media.ts`; el funcionamiento está
en `docs/backend.md`. Tras el rediseño editorial son ocho slots:

| Slot | Clave | Componente | Imagen original |
| --- | --- | --- | --- |
| Portada de la home | `home.hero` | `components/home/Hero.tsx` | `brand/hero.jpg` |
| Destacados: primera fotografía | `home.featured.a` | `components/home/FeaturedVehicles.tsx` | `vehicles/bmw-m4-competition/01.jpg` |
| Destacados: segunda fotografía | `home.featured.b` | `components/home/FeaturedVehicles.tsx` | `vehicles/audi-rs-5-sportback/02.jpg` |
| Historia: «Nos pasa desde siempre» | `home.about.origin` | `components/home/Story.tsx` | `vehicles/porsche-macan/02.jpg` |
| Vende con MILLE | `home.about.house` | `components/home/SellCampaign.tsx` | `vehicles/jeep-grand-cherokee-limited/01.jpg` |
| Cultura: «Fuera del garaje» | `home.about.future` | `components/home/Culture.tsx` | `vehicles/bmw-r-1250-gs-adventure/01.jpg` |
| Contacto | `contact.hero` | `app/(public)/contacto/page.tsx` | `brand/night.jpg` |
| Error 404 | `error.404` | `app/not-found.tsx` | `brand/night.jpg` |

Las dos fotografías de «Destacados» solo se ven mientras no haya dos
vehículos destacados en el inventario; cuando los hay, la sección enseña esos
vehículos.

Cada componente lee su slot y, si no se ha cambiado nunca o la base no
responde, cae a la fotografía original del repositorio. Una fila sembrada como
`LEGACY` que apunte a un archivo que ya no es el original del slot se ignora:
manda el código.

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
