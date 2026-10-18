# Diseño del sitio público de MILLE

Cómo se ve y se mueve el sitio público, y por qué. Es el documento que hay que
leer antes de tocar una pantalla: lo que sigue no son preferencias, son las
decisiones que hacen que las páginas parezcan una sola.

El panel de administración (`/admin`) comparte los tokens pero no esta
dirección: es una herramienta de trabajo, no una revista.

## La idea

MILLE es una *House of Motor Culture*. El sitio se lee como una revista de
motor alemana: fotografías enormes, titulares grandes en minúscula, campos de
color planos y casi nada más. La referencia es la web de Porsche Alemania; la
maqueta editorial que la tradujo a MILLE es el punto de partida de la home.

Lo que no hay, a propósito: etiquetas pequeñas sobre los titulares,
numeraciones decorativas, tarjetas de icono más texto, cristal y desenfoque
como adorno, sombras en reposo.

## Color

Tres campos y un acento. Toda la superficie es una de estas tres:

| Token | Valor | Uso |
| --- | --- | --- |
| `cream` | `#f8f5ef` | La página. Texto en `ink`. |
| `dark` | `#101112` | Vehículos, ficha, pie. Texto en `cream`. |
| `burgundy` | `#5f0913` | Cierres y acciones. Sale del escudo. |

`ink` (`#141311`) es el texto sobre crema; `ink-soft` y `ink-muted` son para
texto secundario, nunca para párrafos principales. Los colores no se inventan:
si hace falta uno nuevo, sale de un activo de marca.

Las fotografías editoriales comparten un mismo grado (`photo-grade`: algo más
oscuras y apagadas) para que fuentes distintas se lean como un conjunto. Las
fotografías de **inventario** nunca lo llevan: el color real de un carro es
información.

## Tipografía

Una sola familia para todo el texto: **Barlow Semi Condensed** (400 casi
siempre; 500 para botones y títulos de subsección). **Gilda Display** solo en el
logotipo. El diseño de referencia usa una tipografía propietaria de Porsche; la
de aquí es una alternativa libre elegida por proporciones, no una copia.

Escala (clases en `globals.css`):

- `text-display`: la portada. Fluida, hasta 180 px.
- `text-title`: apertura de sección. Fluida, hasta 114 px.
- `text-heading`: subtítulos y titulares de bloque.
- `text-lead`: la frase de apoyo bajo un titular.
- Cuerpo a 18–20 px; secundario a 15–16 px. Nada por debajo de 14 px.

Titulares en minúscula, con la primera mayúscula, a dos líneas como mucho.
`text-wrap: balance` en titulares y `pretty` en párrafos.

## Espacio y rejilla

- `wrap`: el ancho de página. Márgenes laterales que respiran
  (`--safe`: 24 px en teléfono, hasta 170 px en pantallas grandes) y tope de
  1600 px.
- `section-y`: el padding vertical de una sección (`--space`).
- Las secciones se distinguen por **el campo de color**, no por líneas. Las
  únicas líneas del sitio son las de tablas de datos, acordeones y el pie.
- Un titular grande a la izquierda y una frase corta a la derecha, alineada
  abajo, es el patrón de apertura de casi todas las secciones.

## Forma

Esquinas: 4 px en botones y campos; 14–20 px en fotografías y paneles; círculo
en las flechas de las tarjetas y píldoras en filtros y etiquetas. El botón
principal es burgundy; `cream` sobre campos oscuros o vinotinto; `onDark` con
borde. Toda acción importante termina en flecha.

## Movimiento

Cinco ideas y ninguna más. Todo es transform y opacity, y todo tiene
alternativa para `prefers-reduced-motion`.

1. **La portada llega** (solo CSS): la imagen se asienta y el titular sube
   desde detrás de su línea de base. Nada depende de que el script haya
   cargado.
2. **Las piezas de una sección llegan en orden de lectura**, una sola vez, con
   `{...REVEAL}` (`src/lib/reveal.ts`). Lo observa `RevealObserver`. Las
   fotografías se abren desde un borde (`REVEAL_IMAGE`).
3. **Una sección llega oscura y se aclara a crema** (`TONE_ZONE`): la historia.
4. **Los controles responden a la mano**: se hunden al pulsar (`.press`) y la
   flecha avanza al pasar el puntero (solo con puntero fino).
5. **El menú y el visor de fotografías** abren con la curva de los cajones y
   nunca pasan de 360 ms; el fundido de la galería dura 300 ms.

Reglas: lo que se usa muchas veces al día es corto; nada se anima con
`transition: all`; nada entra desde `scale(0)`; el contenido nunca queda
oculto si el script falla.

## Fotografía

- La portada, la historia, «Vende con MILLE», la cultura, el contacto y la 404
  se administran desde `/admin/contenido` (`src/lib/site-media.ts`). El
  encuadre se elige allí.
- Las del inventario salen de cada vehículo y se encuadran con el punto focal
  en el formulario del vehículo. El marco de las tarjetas y de la ficha es 4:3
  en todos los tamaños: cambiarlo rompe la promesa del editor de encuadre.
- Antes de publicar, toda fotografía necesita titularidad o licencia
  documentada. Ver `docs/image-rights-audit.md` si existe en tu copia.

## Para añadir una sección

1. Elige el campo de color (cream, dark o burgundy) y empieza por el titular
   en `text-title`, con su frase de apoyo a la derecha.
2. Marca las piezas con `{...REVEAL}` y un `style={delay(ms)}` escalonado de
   60–140 ms.
3. Comprueba en 390, 768 y 1440 px, con el teclado, y con el movimiento
   reducido activado.
