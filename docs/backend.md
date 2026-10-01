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
| `DIRECT_URL` | Migraciones y seed | Supabase → Connect → **Session pooler** | 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth y Storage | Supabase → Project Settings → API | — |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Auth y Storage | Supabase → API Keys | — |

Son dos conexiones porque hacen dos cosas distintas.

**El runtime va por el pooler en modo transacción.** Supavisor devuelve la
conexión de servidor al terminar cada transacción, de modo que muchas
instancias serverless comparten pocas conexiones reales de Postgres. El modo
sesión (5432) dedica una conexión por cliente y se agota en cuanto Vercel
escala; durante el QA ya dio `timeout exceeded when trying to connect` con
solo los siete workers de `next build`.

**Las migraciones van por una conexión en modo sesión.** Necesitan DDL,
advisory locks y estado de sesión, y nada de eso sobrevive a un pooler que
recicla la conexión entre transacciones.

> **Por qué el pooler de sesión y no `db.<ref>.supabase.co`.** El endpoint
> directo de Supabase solo publica registro AAAA: es IPv6 exclusivamente. Las
> redes sin ruta IPv6 hacia AWS —y los entornos de build de muchos
> proveedores— no llegan a él, y el síntoma es un `P1001` o un `ENOTFOUND`
> que parece una caída de la base cuando no lo es. El pooler de sesión
> (puerto 5432) es el reemplazo IPv4 que documenta Supabase y admite todo lo
> que Prisma Migrate necesita.

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
| `Category` | Carrocería del carro (SUV, Sedán, Pickup, Coupé…) o categoría de la moto (ADV, Naked…), ligada a un tipo de vehículo. |
| `Vehicle` | El inventario. |
| `VehicleImage` | Galería ordenada; `position` 0 es la portada. |
| `Inquiry` | Lo que llega de los formularios públicos. |
| `SiteMedia` | Las cuatro fotografías estructurales de la home. |
| `AdminAuditLog` | Quién hizo qué. |

Tres decisiones que conviene conocer:

- **Disponibilidad y publicación son ejes distintos.**
  `availabilityStatus` (`AVAILABLE` / `RESERVED` / `SOLD`) es si se puede
  comprar; `publicationStatus` (`DRAFT` / `PUBLISHED` / `ARCHIVED`) es si se
  ve en el sitio. Un vehículo vendido puede seguir publicado.
- **`price` es `BigInt`.** Los precios van en pesos enteros y los valores
  altos del inventario ya rozan el límite de `int4`. Se convierte a `number`
  en el mapeo, muy por debajo de `MAX_SAFE_INTEGER`. Nunca `float`.
- **El equipamiento son tres columnas, no cien booleanos.** `features` es
  `text[]` con claves del catálogo de `src/lib/equipment-catalog.ts`;
  `specialEquipment` es `jsonb` con las opciones destacadas de esa unidad
  (`[{ name, description }]`); `equipment` es `text[]` con lo que se escribió
  a mano. Ninguna necesita una tabla de unión: nadie consulta el catálogo al
  revés, y `features @> ARRAY[...]` sobre un índice GIN cubriría ese caso el
  día que aparezca.
- **Lo técnico avanzado es nulo cuando no se conoce.** Potencia, torque,
  0–100, batería, autonomía, fechas de SOAT: todas admiten `NULL`, y la ficha
  pública oculta lo que es nulo en vez de escribir "N/A". Es la única forma de
  que la ficha pueda ser muy completa sin llegar a inventar un dato.
- **Las fechas administrativas son `date`, no `timestamp`.** Un vencimiento de
  SOAT es un día del calendario. Guardarlo como instante lo corría un día al
  leerlo en Bogotá (UTC−5), así que el mapeo convierte a `"YYYY-MM-DD"` en UTC
  y la interfaz lo formatea con `formatDateOnly()`.

`fuelType`, `transmission`, `drivetrain` y el resto de vocabularios cerrados
son texto, no enums de Postgres: sus etiquetas llevan tildes y paréntesis, y
el conjunto válido se valida con Zod contra las mismas uniones que usa la
interfaz. Ampliar la lista no exige una migración.

### La taxonomía: carrocería, propulsión, tracción y carácter

Son cuatro cosas distintas y cada una tiene su columna. Antes se mezclaban en
`Category`, que ofrecía a la vez SUV, Sedán, Híbrido, Eléctrico, Deportivo y
4x4 — tres conceptos en una lista. El resultado era que un X5 enchufable
encajaba en dos categorías y un M3 y un Golf GTI, que son un sedán y un
hatchback, caían en el mismo cajón "Deportivo" y no se podían encontrar por su
forma real.

| Concepto | Dónde vive | Valores |
| --- | --- | --- |
| Carrocería / tipo de moto | `Category` (relación) | `src/lib/body-types.ts` |
| Propulsión | `Vehicle.fuelType` | `FUEL_TYPES` |
| Transmisión | `Vehicle.transmission` | `transmissionsFor(tipo)` |
| Marchas | `Vehicle.gearCount` | 1–8, opcional |
| Tracción (solo carro) | `Vehicle.drivetrain` | `DRIVETRAINS` |
| Transmisión final (solo moto) | `Vehicle.finalDrive` | `FINAL_DRIVES` |
| Arquitectura de motor | `Vehicle.engineLayout` | `engineLayoutsFor(tipo)` |
| Carácter | `Vehicle.tags` (`text[]`) | `tagsFor(tipo)` |

Los vocabularios están en `src/types/vehicle.ts` y son la **fuente única**: de
ahí salen los `<option>` del admin, los del filtro público y los `z.enum` de la
validación. No hay ninguna opción escrita dos veces. Las carrocerías son filas
administrables desde `/admin/categorias`, y el conjunto con el que arranca una
base limpia —el mismo que usó la migración y que usa el seed— está en
`src/lib/body-types.ts`.

`src/types/vehicle.ts` exporta además `hasCombustionEngine()`,
`hasElectricDrive()`, `hasTractionBattery()`, `hasPlugCharging()` e
`isFullyElectric()`. El formulario decide con ellas qué secciones pedir y la
ficha pública qué bloques dibujar, de modo que no existen dos criterios
distintos de "esto es un híbrido".

### Carro y moto no son el mismo formulario

Un carro y una moto comparten marca, modelo, año, precio, kilometraje,
combustible, ciudad, documentación, fotografías y descripción. Casi todo lo
demás es distinto, y antes no lo era: a una moto se le pedía tracción
integral, se le ofrecía "Carrocería: ADV", se le guardaba un color de
interior que no tiene y se le exigía todo eso para publicarla — mientras que
la caja, las marchas y la transmisión final, que es lo que cualquier revista
publica de una moto, no cabían en ninguna columna.

`vehicleType` decide ahora el vocabulario, los campos, la validación, los
requisitos de publicación, los filtros y las etiquetas públicas. La
autoridad son cuatro funciones en `src/types/vehicle.ts`:

| Función | Responde |
| --- | --- |
| `usesDrivetrain(tipo)` | ¿Tiene FWD/RWD/AWD? Solo carro. |
| `usesFinalDrive(tipo)` | ¿Cadena, correa o cardán? Solo moto. |
| `usesInteriorColor(tipo)` | ¿Tiene habitáculo que tapizar? Solo carro. |
| `categoryLabel(tipo)` | "Carrocería" o "Tipo de moto". |

más `transmissionsFor()`, `engineLayoutsFor()` y `tagsFor()`, que devuelven
el vocabulario del universo. Nadie ofrece la unión: existe solo para validar
y para ordenar facetas.

Tres detalles que conviene no deshacer:

- **El quickshifter no es una transmisión.** Una Panigale con caja manual
  secuencial de seis marchas y quickshifter tiene una caja manual
  secuencial; el quickshifter es equipamiento, y está en la plantilla.
- **`hasCombustionEngine(null)` devuelve `true`**, al revés que las demás
  predicciones de propulsión. Esconder el motor térmico porque todavía no
  se eligió el combustible dejaba el formulario sin cilindrada nada más
  abrirlo. Enseñar los campos vacíos no afirma nada; esconderlos sí.
- **`keepOnTypeChange()` es la única regla** sobre qué sobrevive a un cambio
  de universo, y la llaman el formulario y el servicio. Estuvo escrita dos
  veces y se desincronizaron: el formulario limpiaba la transmisión y el
  servicio no, así que un carro podía quedar guardado con una caja de moto.

#### Dónde se valida el vocabulario

Zod comprueba que un valor exista en **alguno** de los dos vocabularios.
Que exista en **el que toca** lo comprueba `assertVocabulary()` en el
servicio, y tiene que ser ahí: un `PATCH` puede no traer `vehicleType`, y
entonces el universo efectivo es el de la fila, que solo el servicio conoce.

#### La placa

`plateEnding` es texto. En carro es el dígito del pico y placa —el servicio
exige `^[0-9]$`—; en moto se acepta alfanumérico, porque los formatos
colombianos han cambiado con los años y dar por hecho "número + letra"
dejaría fuera placas válidas. Se normaliza en mayúsculas y sin espacios, y
**no se deduce ningún pico y placa de él**: es un dato que se muestra.

#### El equipamiento es texto

Era un catálogo cerrado de ochenta casillas. Buscar una opción entre decenas
de checkboxes salía más lento que escribirla, y el catálogo no podía nombrar
una suspensión Skyhook ni unas pinzas Brembo Stylema: para motos no servía
casi de nada.

Ahora `equipment` es una línea por elemento, y una línea `[Frenos]` abre una
sección. `src/lib/equipment.ts` tiene las dos plantillas —una por universo—
y el parseo. **Cargar la plantilla y guardar sin tocar nada no inventa
equipamiento**: las líneas sin rellenar ("ABS:" a secas) y las secciones que
se quedan vacías se descartan al guardar.

La migración tradujo las claves del catálogo viejo a líneas con su sección,
así que nadie perdió lo que tenía marcado.

#### Las fechas se escriben

`DateField` (`src/components/ui/DateField.tsx`) es un campo de texto que se
teclea seguido —`01102026` se convierte en `01/10/2026`— con el calendario
nativo detrás de un botón. El `<input type="date">` obligaba a trabajar por
segmentos y a corregir con el ratón.

Hacia fuera siempre viaja ISO. La conversión es **de cadena a cadena** y
está en `src/lib/date-input.ts`: no se construye ningún `Date`, porque
`new Date("2026-10-01")` es medianoche UTC y en Bogotá cae el 30 de
septiembre.

### Migraciones

```bash
npm run db:migrate      # crear y aplicar en desarrollo
npm run db:deploy       # aplicar en producción
npm run db:status       # ver qué falta
```

Las que importan:

1. `..._init` — el esquema.
2. `..._rls` — cierra la Data API y crea `public.is_active_superadmin()`.
3. `..._storage` — bucket de imágenes y sus políticas.
4. `..._site_media*` — las fotografías estructurales de la home.
5. `20260930000000_vehicle_taxonomy_and_specs` — separa carrocería de
   propulsión, tracción y carácter, y añade la ficha técnica ampliada.
6. `20260930120000_incomplete_drafts` — deja que un borrador esté a medias.
7. `20260930150000_draft_nothing_asserted` — y que no afirme nada sin elegir.
8. `20261001090000_motorcycle_semantics` — carro y moto dejan de ser el mismo
   formulario.

Nunca `prisma migrate reset` ni `prisma db push` contra Supabase.

**`npm run db:migrate` no funciona en este proyecto.** `prisma migrate dev`
levanta una *shadow database* y replica en ella todas las migraciones; la de
RLS referencia el esquema `auth` de Supabase, que ahí no existe, y falla con
`schema "auth" does not exist`. Las migraciones nuevas se escriben a mano —el
DDL se saca con `prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --script`— y se aplican con `npm run db:deploy`. Después,
ese mismo `diff` debe salir vacío: es la comprobación de que el esquema y la
base coinciden.

#### Qué hizo la migración de taxonomía

Nada destructivo, y nada adivinado:

- Añadió las columnas nuevas, todas nulas o con defecto.
- Rescató `power` (texto, "340 hp") a `powerHp` (entero) antes de soltarla.
- Leyó `4x4 (AWD)` como `Integral (AWD)`, que es lo que era en casi todo el
  inventario.
- Sembró las ocho carrocerías de carro, idempotente por `(vehicleType, slug)` y
  sin tocar el `active` de las que ya existían.
- Trasladó a su columna lo que las categorías retiradas sí afirmaban:
  `Eléctrico`/`Híbrido` → `fuelType`, `4x4` → `drivetrain = 4x4 (4WD)`,
  `Deportivo` → `tags`.
- Lo que **no** se podía deducir —la carrocería real de un vehículo que estaba
  en "Deportivo" o en "Híbrido"— no se adivinó: el vehículo conserva su
  categoría y se le escribió un `reviewNote` que el formulario de
  administración muestra como aviso hasta que alguien elija.
- Retiró las cuatro categorías falsas: desactivadas si todavía tenían
  vehículos, borradas solo si estaban vacías.

#### Qué hizo la migración de borradores incompletos

Nada: solo dejó de prohibir. `make`, `model` y `description` admiten la cadena
vacía —como ya hacían `version`, `engine` y los colores— y `price` y `mileage`
admiten NULL. Ninguna fila existente cambió, porque todas tenían valor.

El motivo es de producto, no de esquema. Las imágenes cuelgan de un vehículo
—la ruta en Storage es `vehicles/<id>` y `VehicleImage` lleva su clave
ajena—, así que sin fila no hay dónde ponerlas, y eso obligaba a escribir
marca, modelo, precio y descripción **antes** de poder subir una foto. A un
carro se le hacen las fotos antes de escribir nada, así que ese orden lo
imponía la base de datos, no el trabajo.

La alternativa era un almacén temporal de imágenes sin dueño, con su
caducidad y su propio riesgo de huérfanos. No hacía falta: `DRAFT` ya
significa "todavía no está listo".

#### Qué hizo la migración de motos

Añadió `gearCount` y `finalDrive`, convirtió `plateLastDigit` (entero 0–9) en
`plateEnding` (texto) copiando el valor antes de soltar la columna, y
tradujo las claves de `features` a líneas de `equipment` con su sección
—`[Frenos] Brembo Stylema`— antes de soltar también esa columna.

La traducción de claves a etiquetas va **escrita en el SQL** y no leída del
código a propósito: una migración tiene que dar el mismo resultado dentro de
un año, aunque el catálogo ya no exista en el repositorio.

Se verificó sobre una fila real sembrada a propósito antes de aplicarla.

#### Qué hizo la migración de "no afirmar nada"

La anterior dejó que un borrador existiera sin marca, modelo, precio,
kilometraje ni descripción, pero seguía naciendo con **carrocería,
combustible, transmisión, tracción y ciudad puestos**: los primeros valores
de cada lista. El borrador creado solo para subir la foto de un 330e quedaba
guardado como "Gasolina + AWD + SUV en Bogotá".

Nadie había elegido nada de eso. Era un dato inventado escrito en disco, que
además se podía publicar sin que nadie volviera a mirarlo. Así que esas cinco
columnas, más `year`, admiten ahora NULL. Otra migración puramente permisiva:
no toca ni una fila.

Tampoco valía crear una carrocería "Pendiente": una fila falsa en la tabla de
taxonomía aparecería en los filtros públicos, en la navegación por categorías
y en la banda de la portada.

`vehicleType` es la única excepción y es deliberada: no describe la mecánica
del vehículo sino el universo al que pertenece la ficha —de él dependen qué
carrocerías se ofrecen y en qué listado sale—, así que la pantalla necesita
uno para poder dibujarse. Vive en `src/lib/vehicle-defaults.ts`, que es todo
lo que queda de "valores por defecto".

### Borradores incompletos

Quién valida qué, que es lo único que hay que tener claro aquí:

| Momento | Qué se comprueba | Dónde |
| --- | --- | --- |
| Guardar | La **forma** de cada dato: rangos, fechas reales, enums | `vehicleInputSchema` / `vehiclePatchSchema` |
| Publicar | Que esté **completo**: los doce requisitos | `publicationBlockers()` |
| Cualquier mutación sobre un publicado | Que siga completo | `assertPublishedInvariant()`, dentro de la transacción |

Los doce son: marca, modelo, categoría, año válido, precio, kilometraje,
combustible, transmisión, ciudad, descripción, al menos una fotografía y
—según el universo— **tracción** en un carro o **transmisión final** en una
moto. Ese último es el único que cambia: exigirle a una moto la tracción
integral de un carro la dejaba bloqueada por un campo que su propio
formulario ni siquiera le muestra. Como la base ya no obliga a ninguno, **lo que antes garantizaba
el `NOT NULL` lo garantiza ahora esa lista, y solo ella**: quitar una línea
de `publicationBlockers()` no deja un formulario más cómodo, deja una ficha
pública con huecos.

Doce requisitos no son doce mensajes: marca y modelo comparten uno —"Faltan
la marca o el modelo"— así que un borrador al que solo le falta todo menos
la fotografía devuelve diez. La cuenta de mensajes y la de requisitos no
tienen por qué coincidir.

Guardar a medias, sí. Publicar a medias, nunca. El formulario enseña la lista
mientras el vehículo sigue en borrador y deshabilita el botón de publicar,
pero eso es cortesía: quien decide es el servidor, que rechaza con **409** y
dice qué falta.

`price` y `mileage` son `null` cuando no se saben, y ahí la diferencia con el
0 es real: **0 km es un valor legítimo** —un importado nuevo— así que el cero
no puede hacer también de "sin rellenar". Cuidado con `Number(null)`, que es
0: la conversión pasa por `toPriceNumber()` justamente por eso.

Cambiar de universo a un borrador con carrocería del otro **la deja en
blanco** en vez de fallar: una moto con carrocería "SUV" no significa nada, y
la respuesta honesta es que la carrocería ha dejado de conocerse. Sobre un
vehículo publicado, ese mismo cambio lo revierte entero la invariante.

#### Cuándo nace el borrador

`POST /api/admin/vehicles/draft` crea una fila vacía, y el formulario lo llama
**solo ante la primera acción que necesita persistir** —hoy, la primera
fotografía—. Abrir `/admin/vehiculos/nuevo` y marcharse no crea nada: si el
borrador naciera al renderizar, cada visita dejaría una fila.

Nace **sin nada elegido**: ni carrocería, ni combustible, ni transmisión, ni
tracción, ni ciudad, ni año. Lo único que trae es el universo, y por eso
`src/lib/vehicle-defaults.ts` exporta una sola constante. El formulario hace
lo mismo en su lado —"Seleccionar carrocería", "Seleccionar combustible"…— de
modo que lo que se guarda es exactamente lo que la pantalla enseña: un hueco,
no la primera opción de la lista.

Si la subida que motivó el borrador falla, el formulario llama a
`DELETE /api/admin/vehicles/draft?id=…`, que solo borra borradores sin
solicitudes. Así un fallo de red no deja una fila vacía por intento, y
tampoco una `VehicleImage` apuntando a un objeto que no llegó a subirse.

#### El slug de un borrador

Un borrador sin nombre nace como `borrador`, `borrador-2`… Si eso se quedara
congelado, el carro acabaría publicado en `/vehiculos/borrador`. Así que
mientras `publishedAt` sea `null`, el slug **se rehace** a partir de marca,
modelo y versión en cada guardado. Desde la primera publicación deja de
moverse: romper enlaces compartidos para arreglar una errata es mal negocio.

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

## Imágenes del sitio

Las cuatro fotografías de la home que no pertenecen a ningún vehículo: el
hero y las tres de la historia de MILLE. Se administran en
**`/admin/contenido`** y cambiarlas no exige volver a desplegar.

La lista de slots sale de `docs/FRONTEND_VISUAL_TODO.md`, donde quedó anotada
como pendiente "cuando exista backend". No se inventó ninguno.

| Clave | Dónde se ve |
| --- | --- |
| `home.hero` | Portada, junto al titular |
| `home.about.origin` | Capítulo 01 — Por qué estamos aquí |
| `home.about.house` | Placa vinotinto, House of Motor Culture |
| `home.about.future` | Capítulo 06 — Hacia dónde queremos ir |

**No es un CMS.** Las claves viven en `src/lib/site-media.ts` y son una lista
cerrada: el admin cambia la fotografía de un slot existente, no crea slots ni
los renombra. Una clave que no esté en esa lista se rechaza en el endpoint.

### Respaldo

Cada slot conoce la fotografía con la que se construyó el sitio. Si falta la
fila o la base no responde, se sirve esa. Aquí sí corresponde —el archivo
está en el repositorio, es parte del sitio— al contrario que con el
inventario, donde inventar vehículos escondería una caída de producción.

### Storage

Bucket `site-media`, separado de `vehicle-images` a propósito: son dos ciclos
de vida distintos y una limpieza de uno no debe poder alcanzar al otro. Mismas
políticas y misma función `public.is_active_superadmin()`. La ruta la
construye el servidor como `<clave-del-slot>/<uuid>.<ext>`; el nombre del
archivo que sube la persona no llega nunca al bucket.

Al reemplazar una imagen el orden es: subir la nueva, apuntar la base a ella
y solo entonces borrar la anterior. Al revés, un fallo a medias dejaría el
sitio apuntando a un archivo que ya no existe. Solo se borran objetos propios
(`source = STORAGE`); las heredadas viven en `/public` y no se tocan.

**Restaurar original** devuelve el slot a su fotografía de partida y borra del
bucket la que se había subido.

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
| `POST` `DELETE` | `/api/admin/vehicles/draft` |
| `POST` | `/api/admin/vehicles/[id]/publish` |
| `POST` | `/api/admin/vehicles/[id]/availability` |
| `POST` `PATCH` | `/api/admin/vehicles/[id]/images` |
| `DELETE` | `/api/admin/vehicles/[id]/images/[imageId]` |
| `GET` `POST` | `/api/admin/categories` |
| `PATCH` `DELETE` | `/api/admin/categories/[id]` |
| `GET` | `/api/admin/inquiries` |
| `PATCH` | `/api/admin/inquiries/[id]` |
| `GET` | `/api/admin/site-media` |
| `POST` `PATCH` `DELETE` | `/api/admin/site-media/[key]` |

Sin sesión responden **401**; con sesión pero sin rol, **403**.

`GET /api/vehicles` acepta los mismos parámetros que la URL del inventario:
`tipo`, `categoria` (la carrocería, por slug), `marca`, `modelo`,
`combustible`, `transmision`, `traccion`, `ciudad`, `etiqueta`, `minYear`,
`maxYear`, `minPrice`, `maxPrice`, `maxKm`, `destacados`, `orden` y `limit`.
Son condiciones simultáneas: `?categoria=suv&combustible=Híbrido enchufable`
devuelve las SUV enchufables, no la unión de ambas listas. Un valor que no
existe en el inventario devuelve cero y no se descarta en silencio: ensanchar
resultados sin avisar es peor que no devolver ninguno.

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
afectada; al cambiar una imagen del sitio, `revalidateSiteMedia()` invalida
la home. Eso es lo que permite cambiar una fotografía sin desplegar.

`/vehiculos/[slug]` **no** usa `generateStaticParams`: publicar desde el
admin tiene que verse de inmediato, y prerenderizar ataría cada despliegue a
que la base esté disponible en tiempo de compilación.

### Un slug inválido responde 404

Lo hacía con 200 y quedó anotado aquí como deuda: había tres `loading.tsx` en
la cadena —`(public)`, `(public)/vehiculos` y `(public)/vehiculos/[slug]`— y
el de más arriba abría un Suspense que enviaba la cabecera antes de que la
consulta descubriera que el vehículo no existe.

Ya no ocurre: de esos esqueletos solo queda el del listado, así que
`notFound()` llega a tiempo. Comprobado en producción sobre tres slugs
inexistentes, los tres **404**. La API responde 404 igual
(`GET /api/vehicles/<slug>`).

La página lleva además `noindex` explícito —`generateMetadata` de la ficha y
la metadata de `not-found.tsx`—, que es lo que impide que una URL rota entre
al índice si el estado volviera a torcerse.

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
| `/admin/categorias` | Carrocerías y categorías de moto. |
| `/admin/configuracion` | Deliberadamente vacía (ver más abajo). |

Las pantallas son componentes de servidor que leen la base; las mutaciones
llaman a la API y luego a `router.refresh()`. Lo que se ve después de pulsar
es lo que quedó guardado, no una suposición optimista.

### El formulario de vehículo

Alta y edición son **el mismo componente**, `VehicleForm`. La ficha pasó de
doce campos a casi noventa, repartidos en secciones plegables
(`FormSection`): información básica y descripción siempre abiertas, lo
técnico plegado, y el sistema híbrido/eléctrico solo existe si el combustible
lo pide — pedirle la batería a un carro a gasolina es invitar a inventar un
número.

Dos piezas que sostienen la simetría entre crear y editar, y que conviene no
romper:

- `toDraft()` y `toPayload()` en `VehicleForm.tsx` son el reverso exacto la
  una de la otra. Si una gana un campo y la otra no, el dato se escribe y se
  pierde en la siguiente edición sin que nada avise.
- `DIRECT_FIELDS` en `src/server/vehicles/service.ts` es la lista única que
  usan `createVehicle` y `updateVehicle`. Solo se escriben a mano los cinco
  que necesitan traducción: tipo, precio, carrocería, disponibilidad y slug.

`vehiclePatchSchema` se deriva de la misma forma que el alta pero **sin
valores por defecto**: un `PATCH` que solo trae el precio no puede llegar al
servicio con `equipment: []` y borrar el equipamiento entero.

Las fotografías están activas desde el primer segundo, sin haber escrito
nada. `ImageManager` es el mismo componente en alta y en edición; la única
diferencia es que en el alta puede recibir `vehicle={null}` y pedir la fila
por `ensureVehicle()` cuando le hace falta. No hay dos implementaciones ni un
orden obligatorio entre las fotos y la ficha.

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
- **Google Search Console.** El sitio ya es indexable y publica
  `/robots.txt` y `/sitemap.xml`; falta verificar la propiedad de dominio
  (TXT en el DNS) y enviar el sitemap. Es trabajo manual, no de código.
- **Rate limit distribuido**, como se explica arriba.
- **Sin correo transaccional.** Las solicitudes se guardan y se leen en
  `/admin/solicitudes`. No se notifica a nadie todavía.
- **Generar descripción y equipamiento con IA.** Sería útil que el admin
  propusiera un borrador de descripción y de equipamiento a partir de marca,
  modelo, versión, año y unas notas, dejando *siempre* la edición manual
  antes de guardar. No está implementado y no debe implementarse todavía: no
  hay integración, ni claves, ni proveedor decidido.
- **Ficha técnica MILLE.** Descrita en `docs/FRONTEND_VISUAL_TODO.md`, con su
  nota legal. Sigue sin construirse.
- **Deuda visual.** Las siete entradas de `docs/FRONTEND_VISUAL_TODO.md` son
  dirección de arte y van juntas en su propia ronda, no sueltas.
