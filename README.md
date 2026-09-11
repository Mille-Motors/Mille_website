# MILLE

Vitrina digital de vehículos premium en Bogotá.

Esta es la **fase de frontend**: toda la interfaz está terminada y funciona
sobre datos de demostración y estado local. No hay base de datos,
autenticación, almacenamiento ni API todavía.

## Arranque

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npx eslint .     # lint
npx tsc --noEmit # tipos
```

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, `lucide-react` para
iconos y `tailwind-merge` para resolver conflictos de clases en los
componentes reutilizables.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Home |
| `/vehiculos` | Inventario con filtros y orden |
| `/vehiculos/[slug]` | Detalle del vehículo |
| `/contacto` | Contacto y formulario |
| `/admin` | Dashboard |
| `/admin/vehiculos` | Listado administrable |
| `/admin/vehiculos/nuevo` | Crear vehículo |
| `/admin/vehiculos/[id]/editar` | Editar vehículo |

## Dónde vive cada cosa

```
src/types/vehicle.ts     Modelo de datos
src/data/vehicles.ts     Inventario de demostración
src/data/site.ts         Contacto, redes y navegación
src/lib/vehicles.ts      Acceso a datos — la única frontera con el backend
src/lib/filters.ts       Lógica de filtros y orden del inventario
src/lib/format.ts        formatCOP, formatMileage y utilidades de texto
src/components/          ui · layout · brand · home · vehicle · forms · admin
```

## Sistema de diseño

Los tokens viven en el bloque `@theme` de `src/app/globals.css`: colores,
tipografías, radios y sombras. Los colores salen de los activos de marca, no
están inventados: el vinotinto `#5f0913` se tomó del escudo y el crema
`#f8f5ef` de los comps aprobados.

Tipografías: Instrument Serif para titulares y precios, EB Garamond para
texto editorial, DM Sans para interfaz, etiquetas y formularios.

## Lo que falta para producción

- Fotografía propia — ver `public/images/README.md`.
- El número de WhatsApp y el correo en `src/data/site.ts` son marcadores.
- Backend: base de datos, autenticación, storage y envío real de formularios.
  El admin guarda en memoria y se reinicia al recargar.
