# MILLE — Backend

Cómo está montada la parte que no se ve: base de datos, autenticación,
API, administración y despliegue.

## Arquitectura

Todo vive dentro del mismo proyecto Next.js. No hay servicios aparte.

```
Next.js App Router
  │
  ├── Páginas públicas (Server Components)   →  src/app/(public)
  ├── Panel privado (Server Components)      →  src/app/admin/(panel)
  ├── Route Handlers (API)                   →  src/app/api
  │       autorizar → validar → servicio → responder
  ├── Capa de servicios                      →  src/server
  ├── Prisma ORM                             →  src/server/db/prisma.ts
  └── PostgreSQL (Supabase)

Supabase Auth     →  identidad del equipo interno
Supabase Storage  →  fotos nuevas de vehículos
```

Dos reglas que sostienen el resto:

- **`src/lib/vehicles.ts` es la única frontera** entre la interfaz pública y
  el inventario. Antes resolvía desde un módulo de datos de demostración;
  ahora resuelve desde Postgres. Las firmas no cambiaron.
- **Los route handlers no tienen lógica de negocio.** Autorizan, validan,
  llaman a un servicio y serializan. La lógica vive en `src/server`.

## Variables de entorno

Los nombres están en `.env.example`. Para trabajar en local, cópialo a
`.env.local` y rellénalo.

| Variable | Para qué | Dónde se consigue | Puerto |
| --- | --- | --- | --- |
| `DATABASE_URL` | Runtime de la app | Supabase → Connect → **Transaction pooler** | 6543 |
| `DIRECT_URL` | Migraciones y seed | Supabase → Connect → **Direct connection** | 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth y Storage | Supabase → Project Settings → API | — |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Auth y Storage | Supabase → API Keys | — |

Son dos conexiones porque hacen dos cosas distintas.

**El runtime va por el pooler en modo transacción.** Supavisor devuelve la
conexión de servidor al terminar cada transacción, de modo que muchas
instancias serverless comparten pocas conexiones reales de Postgres. El modo
sesión (5432) dedica una conexión por cliente y se agota en cuanto Vercel
escala; durante el QA ya dio `timeout exceeded when trying to connect` con
solo los siete workers de `next build`.

**Las migraciones van por la conexión directa.** Necesitan DDL, advisory
locks y estado de sesión, y nada de eso sobrevive a un pooler que recicla la
conexión entre transacciones.

### Por qué NO lleva `?pgbouncer=true`

En Prisma 5 y 6, con el motor Rust, había que añadir ese parámetro para
desactivar las sentencias preparadas al pasar por un pooler. **En Prisma 7 no
aplica y añadirlo no haría nada:** figura en la lista de parámetros heredados
que el CLI ignora.

Lo que de verdad importa ahora está en `@prisma/adapter-pg`: solo cachea
sentencias preparadas si se le pasa `statementNameGenerator`, y
deliberadamente no se le pasa. Sin él manda las sentencias sin nombre, que es
lo que el modo transacción admite.

> Si alguien añade `statementNameGenerator` buscando rendimiento, romperá
> producción con `prepared statement "s0" already exists` en cuanto dos
> peticiones caigan en la misma conexión de servidor. Está anotado en
> `src/server/db/prisma.ts`, junto al código.

Se verificó contra el pooler real: 30 ejecuciones idénticas seguidas, 40
consultas en paralelo, transacción interactiva y transacción por lotes, más
`BigInt` y `text[]` de ida y vuelta. Sin un solo error.

Si tu proyecto todavía muestra una *anon key* en lugar de una *publishable
key*, define `NEXT_PUBLIC_SUPABASE_ANON_KEY`: la aplicación acepta
cualquiera de las dos.

**No se usa `SUPABASE_SERVICE_ROLE_KEY` en ninguna parte.** Auth y Storage
funcionan con la sesión autenticada del Superadmin, y el acceso a datos va
por conexión Postgres directa. No hace falta, y una clave que salta todas
las políticas es justo lo que no conviene tener rodando por el proyecto.

## Base de datos

Seis tablas. `prisma/schema.prisma` es la referencia.

| Tabla | Qué guarda |
| --- | --- |
| `AdminUser` | Quién del equipo puede entrar. Nunca contraseñas. |
| `Category` | Taxonomía: SUV, Sedán, ADV… ligada a un tipo de vehículo. |
| `Vehicle` | El inventario. |
| `VehicleImage` | Galería ordenada; `position` 0 es la portada. |
| `Inquiry` | Lo que llega de los formularios públicos. |
| `AdminAuditLog` | Quién hizo qué. |

Tres decisiones que conviene conocer:

- **Disponibilidad y publicación son ejes distintos.**
  `availabilityStatus` (`AVAILABLE` / `RESERVED` / `SOLD`) es si se puede
  comprar; `publicationStatus` (`DRAFT` / `PUBLISHED` / `ARCHIVED`) es si se
  ve en el sitio. Un vehículo vendido puede seguir publicado.
- **`price` es `BigInt`.** Los precios van en pesos enteros y los valores
  altos del inventario ya rozan el límite de `int4`. Se convierte a `number`
  en el mapeo, muy por debajo de `MAX_SAFE_INTEGER`. Nunca `float`.
- **`equipment` es `text[]`.** Conserva el orden sin otra tabla.

`fuelType`, `transmission` y `drivetrain` son texto, no enums de Postgres:
sus etiquetas llevan tildes y paréntesis, y el conjunto válido se valida con
Zod contra las mismas uniones que usa la interfaz. Ampliar la lista no exige
una migración.

### Migraciones

```bash
npm run db:migrate      # crear y aplicar en desarrollo
npm run db:deploy       # aplicar en producción
npm run db:status       # ver qué falta
```

Hay tres migraciones:

1. `..._init` — el esquema.
2. `..._rls` — cierra la Data API y crea `public.is_active_superadmin()`.
3. `..._storage` — bucket de imágenes y sus políticas.

Nunca `prisma migrate reset` ni `prisma db push` contra Supabase.

### Seed

```bash
npm run db:seed
```

Siembra las 13 categorías y los 22 vehículos originales (16 carros, 6 motos)
con sus slugs, estados e imágenes exactos, para que pasar de datos de
demostración a base de datos no cambie ni una URL ni una foto. Los fixtures
están en `prisma/fixtures/`, fuera de `src`, para que la aplicación no pueda
importarlos y volver a tener dos fuentes de verdad.

Es idempotente: identifica categorías por `(tipo, slug)` y vehículos por
`slug`, así que ejecutarlo dos veces actualiza en vez de duplicar. Y solo
borra las imágenes que él mismo sembró (`source = LEGACY`): si ya subiste
fotos desde el admin, reejecutarlo no las toca.

### RLS y exposición

Supabase publica el esquema `public` por PostgREST con los roles `anon` y
`authenticated`. Esta aplicación no usa esa API, así que la migración de RLS
cierra la superficie entera: activa RLS sin políticas en las seis tablas
**y** revoca los privilegios a esos dos roles. Son dos capas a propósito;
depender de una sola para que la lista de solicitudes de MILLE no sea
pública es poco.

La autorización real, en cualquier caso, la aplica el servidor en cada
endpoint. Esto es la red, no la puerta.

## Autenticación

Correo y contraseña contra Supabase Auth. Sin magic link, sin OAuth y **sin
registro público**: el sitio público no tiene cuentas de usuario y no las va
a tener.

La identidad la da Supabase; el permiso lo da `AdminUser`. Las dos
condiciones se comprueban siempre juntas — tener sesión en el proyecto de
Supabase no convierte a nadie en Superadmin — y en un solo sitio:
`src/server/auth/session.ts`.

| Función | Para qué |
| --- | --- |
| `getAdminSession()` | Resuelve la sesión, o `null`. Memoizada por petición. |
| `requireSuperadminPage()` | Páginas: redirige al login. |
| `requireSuperadmin()` | Endpoints: lanza 401 o 403. |

`proxy.ts` (en Next.js 16 lo que antes era `middleware.ts`) refresca la
sesión y redirige `/admin` al login cuando no hay ninguna. Eso es comodidad
de navegación, no autorización: cada página y cada endpoint privado vuelve a
comprobar el rol contra la base por su cuenta.

### Crear el primer Superadmin

No hay credenciales por defecto ni cuentas de ejemplo. El proceso es:

1. En Supabase: **Authentication → Users → Add user**. Crea la cuenta con su
   correo y una contraseña, con el correo ya confirmado.
2. En el repositorio, con `.env.local` configurado:

   ```bash
   npm run admin:grant -- persona@ejemplo.com
   ```

3. Entrar en `/admin/login`.

El script no ve ni pide la contraseña: solo crea la fila de `AdminUser` con
`role = SUPERADMIN` y `active = true`, y la enlaza con `auth.users` si ya
existe. Si la creas antes que el usuario de Supabase, el enlace se hace solo
en el primer inicio de sesión, porque la sesión también se resuelve por
correo.

**Añadir a otra persona** es lo mismo: crearla en Supabase y volver a
ejecutar `admin:grant` con su correo.

**Quitarle el acceso a alguien:**

```bash
npm run admin:grant -- persona@ejemplo.com --revoke
```

Desactiva la fila sin borrarla, para que su historial de auditoría siga
teniendo nombre.

## Storage

Bucket `vehicle-images`. Lectura pública — las fotos se ven sin sesión — y
escritura solo para un Superadmin activo.

Las subidas van por el cliente autenticado de quien ha entrado, así que las
políticas se evalúan sobre su sesión. Se valida tamaño (10 MB), extensión y
**los primeros bytes del archivo**: el `Content-Type` que manda el navegador
es una pista, no una prueba.

Las fotos anteriores a la base de datos siguen en `/public` y están marcadas
como `LEGACY`. Se pueden quitar de una ficha, pero el admin no intenta
borrarlas del disco.

Si la migración de storage avisó de que no pudo crear las políticas (el rol
de migración no siempre es dueño de `storage.objects`), aplícalas desde
**Supabase → Storage → Policies** sobre `storage.objects`:

```sql
CREATE POLICY "mille_vehicle_images_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "mille_vehicle_images_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images' AND public.is_active_superadmin());

CREATE POLICY "mille_vehicle_images_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-images' AND public.is_active_superadmin())
  WITH CHECK (bucket_id = 'vehicle-images' AND public.is_active_superadmin());

CREATE POLICY "mille_vehicle_images_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-images' AND public.is_active_superadmin());
```

## API

Forma única de respuesta: `{ data }` cuando sale bien,
`{ error: { code, message, fields? } }` cuando no. Nunca un stacktrace.

**Públicos** — no requieren sesión:

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/vehicles` | Inventario publicado, con filtros. |
| `GET` | `/api/vehicles/[slug]` | Ficha publicada. 404 si es borrador. |
| `POST` | `/api/inquiries` | Guarda una solicitud. |

**Privados** — exigen sesión de Supabase **y** `AdminUser` activo con rol
`SUPERADMIN`:

| Método | Ruta |
| --- | --- |
| `GET` `POST` | `/api/admin/vehicles` |
| `GET` `PATCH` `DELETE` | `/api/admin/vehicles/[id]` |
| `POST` | `/api/admin/vehicles/[id]/publish` |
| `POST` | `/api/admin/vehicles/[id]/availability` |
| `POST` `PATCH` | `/api/admin/vehicles/[id]/images` |
| `DELETE` | `/api/admin/vehicles/[id]/images/[imageId]` |
| `GET` `POST` | `/api/admin/categories` |
| `PATCH` `DELETE` | `/api/admin/categories/[id]` |
| `GET` | `/api/admin/inquiries` |
| `PATCH` | `/api/admin/inquiries/[id]` |

Sin sesión responden **401**; con sesión pero sin rol, **403**.

### Publicar

`POST /api/admin/vehicles/[id]/publish` con `{ "publication": "published" }`.
Antes comprueba lo mínimo: marca, modelo, precio, descripción y al menos una
foto. Si falta algo responde **409** diciendo qué. Despublicar devuelve a
borrador y no borra nada.

`publishedAt` marca la primera publicación y no se reescribe: es un dato
histórico, no un reflejo del estado actual.

### Solicitudes y spam

`POST /api/inquiries` es el único endpoint que acepta escrituras anónimas.
Tiene validación estricta, tope de cuerpo (16 KB), un campo trampa invisible
y un freno de 5 envíos cada 10 minutos por IP.

**Pendiente conocido:** ese freno es en memoria y por instancia. En Vercel,
cada función puede tener su proceso, así que no es un límite global. Frena
el envío repetido y el script casero, que es lo que hace falta hoy; un
límite realmente distribuido necesitaría Redis o similar y no se ha metido
esa dependencia en una V1 de 22 vehículos.

## Caché

El proyecto no usa Cache Components, así que las páginas leen la base en
cada petición. Tras cualquier mutación del admin, `revalidateInventory()`
invalida el caché de ruta de `/`, `/vehiculos`, `/contacto` y la ficha
afectada.

`/vehiculos/[slug]` **no** usa `generateStaticParams`: publicar desde el
admin tiene que verse de inmediato, y prerenderizar ataría cada despliegue a
que la base esté disponible en tiempo de compilación.

### Un slug inválido responde 200, no 404

Se comprobó y se decidió dejarlo así.

`/vehiculos/<slug-que-no-existe>` devuelve **200** con la página de "vehículo
no encontrado" dentro: el contenido es el correcto, el `<title>` es el
correcto y lleva `noindex`; lo que no es correcto es el código de estado.

La causa es el orden de renderizado. Hay tres `loading.tsx` en la cadena
—`(public)`, `(public)/vehiculos` y `(public)/vehiculos/[slug]`— y el de más
arriba abre un Suspense que envía el esqueleto en cuanto empieza la
respuesta. Para cuando la consulta descubre que el vehículo no existe, la
cabecera 200 ya salió. Se intentó resolverlo con un layout de paso por
encima de la frontera y no bastó: la frontera está más arriba todavía.

Arreglarlo exige quitar esos esqueletos de carga, que son parte del frontend
aprobado. Cambiar la experiencia de navegación de todo el inventario por el
código de estado de una URL rota es un mal canje, y más estando el sitio
entero en `noindex`. La API sí responde 404 de verdad
(`GET /api/vehicles/<slug>`), que es donde importa para un cliente
programático.

Cuando se levante el `noindex` para el lanzamiento conviene volver a mirarlo:
ahí un 200 en una URL inexistente sí tiene coste real.

## Administración

`/admin`. No hay ningún enlace desde el sitio público, y no lo habrá: se
entra escribiendo la URL. Eso es discreción, no seguridad.

| Ruta | Qué es |
| --- | --- |
| `/admin/login` | La única puerta de entrada. |
| `/admin` | Dashboard: seis cifras y los últimos movimientos. |
| `/admin/vehiculos` | Listado con búsqueda y filtros. |
| `/admin/vehiculos/nuevo` | Alta. Nace en **borrador**. |
| `/admin/vehiculos/[id]/editar` | Edición, fotos y publicación. |
| `/admin/solicitudes` | Buzón de lo que llega de los formularios. |
| `/admin/categorias` | Taxonomía. |
| `/admin/configuracion` | Deliberadamente vacía (ver más abajo). |

Las pantallas son componentes de servidor que leen la base; las mutaciones
llaman a la API y luego a `router.refresh()`. Lo que se ve después de pulsar
es lo que quedó guardado, no una suposición optimista.

## Despliegue

Variables que Vercel necesita (Production y Preview):

```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`npm run build` ejecuta `prisma generate` antes de `next build`, así que el
cliente se genera en cada despliegue. El cliente generado está en
`src/generated/` y no se versiona.

**El build necesita `DATABASE_URL`.** La home y `/contacto` se
prerenderizan, y para eso leen el inventario. Es deliberado: son las dos
páginas que no dependen de la URL, así que se sirven estáticas y
`revalidateInventory()` las refresca cuando el admin publica algo. El
inventario, la ficha de vehículo y todo `/admin` se renderizan por petición
y siempre muestran el estado actual de la base.

Si el build falla por no poder conectar, falla a la vista y con el motivo.
No hay ningún camino por el que se despliegue un inventario inventado.

Las migraciones **no** corren solas en el despliegue. Se aplican a propósito
desde una máquina con `npm run db:deploy`, para que ningún build pueda
alterar el esquema de producción por su cuenta.

## Deuda de dependencias

`npm audit` reporta **4 avisos de severidad alta**. Los cuatro salen de la
misma raíz, el CLI de Prisma:

```
prisma (devDependency)
├─┬ @prisma/config
│ └── deepmerge-ts   ← agotamiento de pila al fusionar objetos recursivos
└── mysql2           ← degradación del plugin de auth, y zlib sin límite
```

**No llegan al runtime.** `prisma` es `devDependency` —solo se usa para
`generate`, `migrate` y `seed`— mientras que lo que se despliega es
`@prisma/client`, que no depende de ninguno de los dos. `mysql2` es el driver
de MySQL que el CLI trae para otras bases de datos; este proyecto es Postgres
y nada lo importa. Se comprobó: no hay una sola referencia a `mysql2` ni a
`deepmerge-ts` en `src/`, `prisma/` ni `scripts/`.

**No se ejecuta `npm audit fix --force`.** Lo que haría es degradar a
`prisma@6`, que es un cambio mayor: Prisma 6 usa el motor Rust en vez del
compilador de consultas en TypeScript, con lo que volverían a hacer falta los
parámetros heredados de conexión y cambiaría el modelo de driver adapters
entero. Cambiar la arquitectura de acceso a datos para silenciar un aviso en
un paquete que no se despliega es un mal canje.

**Qué hacer con esto:** revisar al actualizar Prisma. En cuanto el CLI
publique una versión con `@prisma/config` sobre `deepmerge-ts >= 8` y un
`mysql2 > 3.23.0`, los cuatro avisos desaparecen sin tocar nada más.

## Pendiente, a propósito

- **Canales de contacto.** MILLE no tiene todavía dominio propio, correo
  corporativo, WhatsApp ni Instagram. El sitio no muestra ninguno inventado
  y `/admin/configuracion` no permite escribir uno. Tendrá su propia fase.
- **`noindex` sigue activo.** El sitio no está lanzado.
- **Rate limit distribuido**, como se explica arriba.
- **Sin correo transaccional.** Las solicitudes se guardan y se leen en
  `/admin/solicitudes`. No se notifica a nadie todavía.
