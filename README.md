# MILLE

Vitrina digital de vehículos premium en Bogotá.

Aplicación full-stack: la interfaz pública está cerrada y el inventario, la
autenticación, el almacenamiento y los formularios funcionan contra una base
de datos real.

La parte de servidor está documentada aparte, en
[`docs/backend.md`](docs/backend.md): esquema, migraciones, seed, Auth,
Storage, API, administración y despliegue.

## Arranque

```bash
npm install
cp .env.example .env.local   # y rellenar los valores — ver docs/backend.md
npm run db:deploy            # aplicar migraciones
npm run db:seed              # sembrar el inventario inicial
npm run dev                  # http://localhost:3000
```

```bash
npm run build      # build de producción
npm run lint       # lint
npm run typecheck  # tipos
```

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. En el
servidor, Prisma 7 sobre PostgreSQL (Supabase), Supabase Auth para el equipo
interno, Supabase Storage para las fotos y Zod para validar. `lucide-react`
para iconos y `tailwind-merge` para resolver conflictos de clases.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Home |
| `/vehiculos` | Inventario con filtros y orden |
| `/vehiculos/[slug]` | Detalle del vehículo |
| `/contacto` | Contacto y formulario |
| `/admin/login` | Entrada del equipo interno |
| `/admin` | Dashboard |
| `/admin/vehiculos` | Listado administrable |
| `/admin/vehiculos/nuevo` | Crear vehículo |
| `/admin/vehiculos/[id]/editar` | Editar vehículo |
| `/admin/solicitudes` | Solicitudes recibidas |
| `/admin/categorias` | Categorías |

El sitio público no pide cuenta en ninguna parte. `/admin` no se enlaza
desde ninguna página pública.

## Dónde vive cada cosa

```
prisma/schema.prisma     Esquema de la base de datos
prisma/seed.ts           Seed idempotente del inventario inicial
prisma/fixtures/         El inventario original, solo para el seed
src/types/vehicle.ts     Modelo de dominio que consume la interfaz
src/data/site.ts         Contacto, redes y navegación
src/server/              Capa de servicios — auth · vehicles · inquiries ·
                         categories · storage · db · http
src/app/api/             Route handlers públicos y de administración
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
- Dominio, correo corporativo, WhatsApp e Instagram: todavía no existen, y
  el sitio no muestra ninguno inventado. Tendrán su propia fase.
- Google Search Console: verificar la propiedad de dominio y enviar el
  sitemap. El sitio ya se indexa (`/robots.txt` y `/sitemap.xml` publicados).
- Notificación por correo de las solicitudes. Hoy se leen en
  `/admin/solicitudes`.
