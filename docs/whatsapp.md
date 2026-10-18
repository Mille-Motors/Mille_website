# WhatsApp

Línea: **+57 312 638 5028** (WhatsApp Business, app). Atención: todos los días, de 9 a. m. a 6 p. m., hora de Bogotá.

## Qué hace el sitio

| Dónde | Qué hay |
|---|---|
| Todas las páginas públicas (menos la ficha de un vehículo) | Botón flotante abajo a la derecha. Abre un menú con cuatro motivos: **buscar**, **hablar de mi vehículo**, **agendar cita** y **otra consulta**. Cada uno abre WhatsApp con su mensaje ya escrito. El menú dice si estamos en horario. |
| Ficha de un vehículo, escritorio | Botón flotante directo (sin menú) a un chat que **ya nombra ese vehículo**: marca, modelo, año, precio y el enlace a la ficha. |
| Ficha de un vehículo, móvil | La barra fija de abajo (precio + WhatsApp), con el mismo mensaje. |
| Menú, pie, `/contacto`, 404 | Enlaces con el mensaje general. |
| Home, «Vende con MILLE» | Botón que abre el chat con el mensaje de `vender` ya escrito. |
| `/privacidad` | Política de tratamiento de datos (Ley 1581). Enlazada en el pie y bajo el botón de enviar de los dos formularios. |

Todo sale de `site.phone` en `src/data/site.ts`. Si ese valor vuelve a ser `null`, todo lo de WhatsApp desaparece solo; nunca hay un botón que abra un número falso.

Los mensajes viven en `src/lib/whatsapp.ts`. Las líneas con `___` son para que la persona las rellene antes de enviar.

## Conteo de clics

Cada clic a un enlace marcado con `data-wa-source` se cuenta en la tabla `WhatsappClick` (qué enlace, qué motivo, qué vehículo, qué página). **No se guarda IP, dispositivo ni nada que identifique a nadie.** Se ve en el dashboard del admin (`/admin`), sección «Clics a WhatsApp».

Un clic es una intención, no una conversación: las conversaciones reales viven en la app de WhatsApp Business.

**Antes de que el conteo funcione en producción hay que aplicar la migración** `20261017090000_whatsapp_clicks` con `npm run db:deploy`. Mientras no se aplique, nada se rompe: el botón funciona igual y el dashboard esconde la sección.

Para marcar un enlace nuevo basta añadir `data-wa-source="…"` (una de las fuentes de `src/lib/whatsapp-click.ts`) y, si aplica, `data-wa-intent` y `data-wa-slug`.

## Configurar la app de WhatsApp Business (a mano, en el teléfono)

Los textos están listos para pegar. Las rutas de los menús cambian un poco según la versión de la app.

**Perfil del negocio** → categoría *Automotriz*, dirección *Bogotá, Colombia*, sitio web `https://millemotorculture.com`, y la descripción:

> House of Motor Culture. Carros y motos seleccionados, y una comunidad construida alrededor de las máquinas. Bogotá.

**Horario** → todos los días, 9:00 a. m. – 6:00 p. m.

**Mensaje de bienvenida** (Herramientas para la empresa → Mensaje de bienvenida):

> Hola, gracias por escribir a MILLE. 👋 Cuéntanos qué necesitas: si buscas un vehículo, si quieres hablar del tuyo o si quieres agendar una visita. Te respondemos en cuanto podamos.

**Mensaje de ausencia** (Mensaje de ausencia → fuera del horario):

> Gracias por escribir a MILLE. Ahora estamos fuera de horario: atendemos todos los días de 9 a. m. a 6 p. m. Déjanos tu mensaje y te respondemos apenas abramos.

**Respuestas rápidas** (se escriben con `/`):

| Atajo | Mensaje |
|---|---|
| `/hola` | Hola, soy {tu nombre} de MILLE. ¿En qué te podemos ayudar? |
| `/busco` | Cuéntanos qué buscas: ¿carro o moto?, ¿qué marca o tipo te interesa?, ¿presupuesto aproximado y ciudad? Con eso te contamos qué tenemos o cómo ayudarte a encontrarlo. |
| `/vender` | Gracias por escribirnos. Para conocer tu vehículo cuéntanos: marca, modelo, año, kilometraje y ciudad. Si puedes, mándanos unas fotos. |
| `/cita` | Visitamos solo con cita previa. ¿Qué día y a qué hora te queda bien? Atendemos todos los días de 9 a. m. a 6 p. m. |
| `/ubicacion` | Estamos en Bogotá y atendemos solo con cita previa. Te compartimos la dirección al confirmar tu visita. |
| `/gracias` | Gracias por escribirnos. Cualquier cosa, aquí estamos. |

**Etiquetas** → *Comprador*, *Vendedor*, *Cita*, *Seguimiento*. Se asignan a mano.

**Enlace corto y código QR** (Herramientas para la empresa → Enlace corto): sirve para Instagram, el Reel y tarjetas. Es independiente del mensaje que arma el sitio.

**Catálogo** (Herramientas para la empresa → Catálogo): se llena con vehículos **reales** (el inventario actual del sitio es de demostración). Por cada uno: hasta 10 fotos, nombre, precio, descripción y el **enlace a su ficha** en `https://millemotorculture.com/vehiculos/<slug>`. No sincroniza con el sitio: cuando un vehículo se vende, se quita a mano. Antes de llenarlo, subir un artículo de prueba para confirmar que Meta acepta vehículos completos en el catálogo.

## Política de datos

`src/app/(public)/privacidad/page.tsx`. Habla de lo que de verdad hace el sitio: formularios, WhatsApp y el conteo de clics; y describe los proveedores solo hasta donde llega la evidencia técnica. **Si cambia algo de eso —por ejemplo, si se añade analítica o un CRM—, hay que actualizar el texto y la fecha.** Antes de poner la política en vigor deben completarse la identidad legal y los canales formales de contacto del responsable, y revisarse la clasificación contractual de los proveedores internacionales.

## Fase 2 (no construida)

Catálogo conectado y respuestas automáticas por preguntas requieren la API de WhatsApp Business (proveedor, costo y verificación de Meta) y un feed de inventario generado desde la base de datos. Solo tiene sentido con inventario real y volumen de conversaciones que lo justifique.
