# Legal y protección de datos

Qué trata MILLE, con qué base, qué se puede demostrar y qué falta. Está
escrito para quien tenga que responderle a un abogado o a la Superintendencia
de Industria y Comercio, no para vender nada.

El marco es colombiano: **Ley 1581 de 2012**, el **Decreto 1377 de 2013**
—compilado en el Decreto 1074 de 2015—, la **Ley 1480 de 2011** en lo que
corresponde, la **Ley 527 de 1999** para el valor probatorio de los mensajes
de datos y la **Ley 2300 de 2023** para los mensajes comerciales. El RGPD
europeo **no** aplica aquí; cuando algo se hace por buena práctica y no por
obligación legal colombiana, se dice.

## Modelo jurídico

MILLE Motor Culture es una **marca operada por personas naturales en asocio**.
No hay sociedad constituida, y no hace falta inventarle una: el art. 3, lit.
e) de la Ley 1581 define al Responsable como la persona natural o jurídica
que, «por sí misma o en asocio con otros», decide sobre la base de datos o su
tratamiento.

En ninguna parte del código aparece «S.A.S.» ni un NIT, y una prueba lo
comprueba (`tests/legal.test.ts`).

**Registro Nacional de Bases de Datos: no aplica**, y la base es el texto
operativo, no una lectura rápida. El art. 1 del **Decreto 90 de 2018**
reemplazó el art. 2.2.2.26.1.2 del Decreto 1074 de 2015, que ahora dice que
serán objeto de inscripción las bases de datos tratadas por los Responsables
que reúnan estas características:

> a) Sociedades y entidades sin ánimo de lucro que tengan activos totales
> superiores a 100.000 Unidades de Valor Tributario (UVT).
> b) Personas jurídicas de naturaleza pública.

MILLE no es ninguna de las tres cosas: no es sociedad, no es entidad sin ánimo
de lucro y no es persona jurídica de naturaleza pública. Queda fuera del
ámbito de inscripción **por no ser persona jurídica**, antes incluso de llegar
al umbral de activos.

Los considerandos del propio decreto cierran la cuestión y conviene citarlos,
porque es donde la gente se confunde: la limitación del universo de obligados
«no implica de ninguna manera que las personas jurídicas y naturales que se
exceptúan […] queden relevadas del cumplimiento de los demás deberes
establecidos para los Responsables del Tratamiento». **No registrar no exime
de nada más.**

Si MILLE se constituye como sociedad, la obligación tampoco nace sola:
dependería de superar los 100.000 UVT en activos totales. Ver la ficha de
datos pendientes.

## Lo que falta, y por qué no se rellenó

Dos datos que la norma exige y que **nadie ha confirmado**:

1. **Nombre legal completo e identificación** de las personas Responsables
   (art. 12, lit. d) de la Ley 1581; art. 13, num. 1 del Decreto 1377).
2. **Dirección física de notificaciones** del proyecto.

No se deducen de un nombre abreviado, de un correo, de un commit ni de una
cuenta de GitHub, y no se publica la dirección de residencia de nadie como si
fuera la de una marca. `LEGAL_RESPONSIBLES` en `src/lib/legal.ts` arranca
**vacío** y `LEGAL_CONTACT.physicalAddress` en `null`, igual que `site.email`
y `site.phone` arrancaron en `null` mientras no existieron.

Mientras estén vacíos:

- la sección 01 de `/privacidad` **lo dice** en vez de publicar una
  identificación inventada;
- `/admin/configuracion` lista exactamente lo que falta;
- todo lo demás de la política sí aplica y los derechos se pueden ejercer hoy.

Rellenarlos es editar `src/lib/legal.ts` y **subir la versión** de la
política, porque es un cambio material.

### Por qué se publica igual, en vez de esperar

Era una decisión real, con dos opciones: (A) publicar la política diciendo
honestamente que faltan esos dos datos, o (B) no publicarla hasta tenerlos. Se
eligió **A**, y el razonamiento importa:

- El art. 13 del Decreto 1377 obliga a que la política **se ponga en
  conocimiento** de los titulares, y los arts. 17, lit. c) y 18, lit. f) de la
  Ley 1581 obligan a informar la finalidad y a tener el manual interno. No
  publicar ninguna política mientras el sitio sigue recogiendo datos incumple
  todo eso de forma más grave que publicarla con un elemento identificatorio
  pendiente y señalado.
- La alternativa coherente con (B) sería **apagar los formularios** para no
  tratar datos sin política completa. Es desproporcionado: el resto de la
  política —finalidades, categorías, derechos, procedimiento, plazos,
  proveedores, retención— está completo y es exacto, y el titular puede
  ejercer **todos** sus derechos hoy por un canal real.
- Lo que no se hizo en ningún caso: inventar el dato para que desapareciera el
  aviso.

Aun así es un **BLOCKER real**: la política no está jurídicamente completa
mientras falte la identificación del art. 12, lit. d) y del art. 13, num. 1, y
así se reporta. Lo que está completo es todo lo demás.

## Canales confirmados

| Canal | Valor | Dónde vive |
| --- | --- | --- |
| Dominio | `https://millemotorculture.com` | `site.url` |
| Correo | `millemotorculture@gmail.com` | `LEGAL_CONTACT.email` |
| Instagram | `@millemotorculture` | `site.instagram` |
| WhatsApp | la línea real del proyecto | `site.phone` |
| Domicilio | Bogotá, Colombia | `LEGAL_CONTACT.domicile` |

El correo sirve a la vez de canal general y de **canal electrónico para los
derechos del titular**, hasta que exista uno especializado. No hay buzones por
función: no existe dominio de correo propio, y una dirección que nadie lee no
es un canal de atención. Una prueba verifica que no aparezca ninguno.

## Pagos: no aplica

El sitio **no procesa pagos**. No hay checkout, pasarela, tarjetas,
billeteras, anticipos ni reservas pagadas; no hay tablas de pago, ni
reembolsos, ni webhooks. Por eso:

- **Política de reembolsos independiente: NO APLICA.** No hay pago que
  reembolsar en el sitio.
- **Reversión del pago (art. 51 de la Ley 1480): no hay pago que revertir
  aquí.** La norma opera cuando la venta se hace por un mecanismo de comercio
  electrónico y el pago se realizó con tarjeta u otro instrumento de pago
  electrónico, y obliga a los *participantes del proceso de pago*. El sitio no
  ofrece instrumento de pago ni participa en ningún proceso de pago. Lo que
  **no** se afirma: que un comprador que pagó por otro medio no tenga
  derechos; eso depende de ese medio y de quien recibió el pago, no de este
  sitio.
- **Derecho de retracto (art. 47): es una figura DISTINTA y no depende del
  pago electrónico.** Depende de que el contrato se haya celebrado con
  financiación del productor o proveedor, venta de tiempos compartidos, o
  métodos no tradicionales o **a distancia** (definida en el art. 5, num. 16
  como la venta sin contacto directo con el producto). El razonamiento
  correcto para MILLE no es «no hay pagos», es **que en el sitio no se celebra
  ninguna compraventa**: no hay oferta aceptable aquí, un formulario no
  perfecciona el negocio y las visitas se coordinan con cita previa y contacto
  directo con el vehículo.

  Si una venta concreta, formalizada después y fuera del sitio, queda cubierta
  por el art. 47 es una cuestión que depende de **cómo se celebre esa venta y
  de quién sea el vendedor**. Los Términos lo dicen así y no cierran la puerta
  a nadie. Esto es precisamente una de las preguntas de modelo comercial que
  los fundadores deben confirmar.

Tres pruebas lo vigilan: ninguna pasarela importada, ninguna en las
dependencias, ninguna variable de entorno de pagos.

## Inventario de datos personales

Todo lo que el sistema trata. Nada más que esto.

| Dato | Origen | Finalidad | Base | Dónde se guarda | Quién accede | Retención |
| --- | --- | --- | --- | --- | --- | --- |
| Nombre, teléfono, correo, mensaje, vehículo, página de origen | Formulario público | Responder la consulta, identificar el vehículo, coordinar visita | Autorización expresa | `Inquiry` | SUPERADMIN | 24 meses (interno) |
| Hora de servidor, origen, versión de política, id y texto del consentimiento, huella SHA-256 | Generado por el servidor | Prueba de la autorización | Deber legal (art. 17 b) | `ConsentEvent` | SUPERADMIN | 5 años (interno) |
| IP, cabecera de origen, agente de usuario, id de petición | Cabeceras del proxy, **server-side** | Valor probatorio del consentimiento | Deber legal (art. 17 b) | `ConsentEvent` | SUPERADMIN | 5 años (interno) |
| Nombre, correo/teléfono, asunto, estado, respuesta | Correo o WhatsApp, registrado por el equipo | Atender derechos del titular | Deber legal (arts. 14–15) | `PrivacyRequest` | SUPERADMIN | 5 años (interno) |
| Enlace, intención, vehículo, ruta | Clic en WhatsApp | Saber si el botón se usa | Interés operativo; **sin dato personal** | `WhatsappClick` | SUPERADMIN | 24 meses (interno) |
| Fuente, autor, licencia, autorizante, referencia de prueba | Propietario, dealer o fotógrafo | Acreditar derechos de uso de la imagen | Interés legítimo y contractual | Columnas `rights*` | SUPERADMIN | Mientras se use la imagen |
| Correo, nombre, último acceso | Equipo interno | Autorizar el panel | Relación con el equipo | `AdminUser` | SUPERADMIN | Mientras dure el acceso |
| Correo del admin, acción, entidad, metadata | Acción administrativa | Responsabilidad demostrada | Deber legal (art. 26 Dto. 1377) | `AdminAuditLog` | SUPERADMIN | 5 años (interno) |
| IP | Cabeceras del proxy | Freno antispam | Interés legítimo | **Memoria del servidor** | Nadie | 10 minutos |

**Minimización aplicada.** No se recoge dirección, documento de identidad,
fecha de nacimiento, género ni dato sensible alguno; ningún formulario tiene
un campo para ellos. El conteo de WhatsApp fue diseñado sin IP ni agente ni
identificador y así sigue: es un contador, no un seguimiento. El agente de
usuario **sí** se guarda, pero solo en el evento de consentimiento y por una
razón concreta: el art. 11 de la Ley 527 de 1999 hace valorar «la
confiabilidad en la forma en la que se haya generado» el mensaje de datos.

## Consentimiento demostrable

`accepted = true` no era prueba de nada. `ConsentEvent` lo sustituye.

**Qué se guarda y por qué.** El art. 12 de la Ley 527 de 1999 da por cumplido
un deber de conservación cuando la información es accesible, se conserva en un
formato que reproduce con exactitud lo generado y se guardan origen, destino,
fecha y hora. De ahí salen `textSnapshot`, `textHash`, `source`, `ipAddress` y
`createdAt`.

**El texto es del servidor.** El navegador manda «autoricé», nunca el texto.
Si lo mandara, cualquiera podría guardar como prueba la frase que le
conviniera, y la evidencia dejaría de probar algo sobre MILLE. El servidor lo
resuelve de `CONSENT_TEXTS` y guarda el identificador, el texto literal y su
huella SHA-256. `PrivacyNotice` renderiza esa misma cadena **partiéndola**
para meter el enlace, así que lo visible y lo guardado son el mismo texto —y
hay una prueba que lo compara carácter por carácter.

**Append-only, impuesto por Postgres.** Un trigger rechaza todo `UPDATE` y
todo `DELETE` sobre `ConsentEvent`. No es una convención que haya que
recordar: un `UPDATE` desde cualquier sitio falla igual. Se admite una sola
modificación, comprobada comparando la fila entera: poner `inquiryId` a
`NULL`, que es lo que hace la clave ajena al borrarse la solicitud.

Un detalle honesto: el trigger no vincula al **dueño** de la tabla, que puede
desactivarlo. Protege contra la aplicación, contra la Data API y contra un
error; no contra alguien con las credenciales de administración de la base.
Para eso están el `REVOKE` y el control de esas credenciales.

**Revocar no corrige, añade.** Una revocatoria es un evento nuevo con
`action = REVOKED`. El evento que dice que autorizó sigue ahí, porque eso
también pasó. El estado vigente de alguien es su último evento.

**Qué NO se pudo salvar.** La migración copió las filas de `ConsentRecord` a
`ConsentEvent` con `textVersion`, `textHash` y `textSnapshot` en `NULL` y
`metadata.evidence = "TEXT_NOT_AVAILABLE"`. Son prueba real de autorizaciones
reales, pero del texto exacto no se conserva nada, porque entonces no se
registraba. **No se rellenaron** con el texto de hoy: sería fabricar la prueba
de que alguien leyó algo que no existía. El Admin marca esos eventos como
«Heredado · sin prueba del texto» y el CSV los exporta diciéndolo.

`ConsentRecord` **queda congelada**: nadie la escribe y el Admin no la lee.
No se tiró porque destruiría la prueba primaria sin ganar nada, y porque
romperia el envío de formularios durante los minutos en que un despliegue
tiene vivo el código viejo con el esquema nuevo.

## La IP, server-side

`src/server/http/client-ip.ts` es el **único** sitio del proyecto que
averigua una IP. Lee, en este orden:

1. `x-vercel-forwarded-for` — la pone la plataforma y un proxy propio por
   delante no la reemplaza;
2. `x-forwarded-for` — equivalente; Vercel la sobrescribe y no reenvía IPs
   externas, justamente para evitar suplantación, pero **sí** puede quedar
   alterada si se pone un proxy propio por delante;
3. `x-real-ip` — último recurso.

Se guarda también **de qué cabecera salió** (`ipSource`), porque de eso
depende cuánto vale el dato. Lo que no tenga forma de dirección se descarta, y
sin ninguna cabecera el valor es `null` — es el caso de desarrollo local, y
escribir `127.0.0.1` o `desconocida` ensuciaría la evidencia con algo que
parece un dato. El freno antispam usa esta misma función: dos formas de
averiguar la IP serían dos respuestas posibles a la misma pregunta.

### Hasta dónde llega la garantía

Que el cliente no pueda falsear esas cabeceras es una propiedad de la
**plataforma**, no algo que el código pueda verificar: desde la función solo
se ve una cadena de texto. Conviene no confundir las dos cosas:

- **Detrás del edge de Vercel**, que es cómo se sirve el sitio, la IP la pone
  Vercel y la cabecera entrante del cliente se descarta. Vercel declara que
  sobrescribe `X-Forwarded-For` y que no reenvía IPs externas, justamente para
  evitar suplantación, y que un `X-Forwarded-For` propio solo se admite con el
  Trusted Proxy de plan Enterprise, que MILLE no usa.
- **Mandar la cabecera a mano con `curl` en local demuestra el parseo, no la
  autenticidad.** Si la aplicación quedara accesible sin pasar por ese edge, o
  detrás de un proxy que no reescriba la cabecera, llegaría lo que el cliente
  quisiera.

Por eso la IP se trata como **indicio corroborante** —junto a la hora de
servidor, el origen del formulario y la huella del texto— y no como
identificación fuerte de nadie. Ninguna decisión depende solo de ella. La
política pública dice qué se registra y de dónde se lee, sin prometer que sea
infalsificable.

Si algún día se pone Cloudflare o un balanceador propio delante, este archivo
es lo único que hay que revisar — y **habría** que revisarlo: con un proxy
intermedio el primer salto de la cadena deja de ser el cliente.

## Cookies: auditoría real

Se buscó en todo `src`:

| Qué se buscó | Resultado |
| --- | --- |
| `document.cookie` | 0 |
| `localStorage` / `sessionStorage` | 0 |
| `cookies()` | 1 — `supabase-server.ts`, solo rutas de administración |
| Google Analytics, GTM, Meta/TikTok Pixel, Hotjar, Clarity | 0 |
| Analítica de la plataforma | 0 |
| Iframes de terceros (YouTube, Maps) | 0 |
| Proveedor externo de fuentes | 0 — se sirven desde el propio build |

**Conclusión: no hay banner, y es la decisión correcta.** Lo único que se
almacena son las cookies de sesión de Supabase Auth, estrictamente necesarias
y solo presentes al entrar a `/admin`. Un gestor de consentimiento para eso
pide un permiso que no hace falta y acostumbra a aceptar sin leer. El día que
haya una tecnología opcional hará falta banner con opciones equivalentes,
preferencias reabribles y bloqueo del script antes de la decisión; la
Política de Cookies ya dice eso.

## Marketing y Ley 2300 de 2023

Hoy MILLE **no envía** comunicaciones comerciales: no hay lista, ni campaña,
ni automatización, ni integración de envío. Por eso **no hay casilla de
mercadeo** en los formularios: una casilla que no gobierna nada es decorativa,
y el enum `ConsentType` tampoco tiene `MARKETING` por lo mismo.

La distinción que importa:

- **Responder una solicitud iniciada por el usuario** no es publicidad. El
  art. 8 de la Ley 2300 exceptúa expresamente «enviar información solicitada
  por el consumidor».
- **Comunicación comercial posterior** es otra finalidad, y exigiría
  consentimiento separado, voluntario y no preseleccionado, cuyo rechazo no
  puede impedir enviar una consulta.

Cuando exista, esos envíos tendrán que respetar el canal autorizado (art. 2),
los horarios del art. 3 —lunes a viernes de 7:00 a 19:00 y sábados de 8:00 a
15:00, sin domingos ni festivos—, la periodicidad y un mecanismo ágil de baja
(art. 5, par. 2). **MILLE no es gestor de cobranza** y nada de este flujo lo
convierte en uno.

Nota operativa: la línea de WhatsApp atiende de 9:00 a 18:00 todos los días,
domingos incluidos. No hay conflicto —esos horarios son de *atención*, y la
ley limita el *envío* de publicidad— pero el día que se envíe publicidad, los
horarios aplicables son los del art. 3 y no los de atención. **Es el único
punto donde la configuración actual chocaría con la ley si mañana se activara
marketing sin revisarla**, y está anotado para que no se nos pase.

El art. 5 también encarga al MinTIC, con la CRC, implementar un **Registro de
Números Excluidos**. Si algún día MILLE envía publicidad por SMS o llamada,
hay que consultar ese registro antes, además de tener el consentimiento. Hoy
no aplica porque no se envía nada.

## Derechos del titular

Procedimiento operativo, sin portal: llega por correo o WhatsApp y el equipo
lo registra en `/admin/privacidad`.

La **vía y el plazo se deducen del tipo** y no los teclea nadie:

| Vía | Tipos | Plazo | Prórroga |
| --- | --- | --- | --- |
| Consulta (art. 14) | acceso, prueba de autorización, información de uso, otra | 10 días hábiles | +5 |
| Reclamo (art. 15) | actualización, rectificación, supresión, revocatoria, reclamo | 15 días hábiles | +8 |

«Otra» va por consulta: ante la duda, el plazo más corto. El vencimiento se
calcula en **días hábiles colombianos** —`src/lib/colombian-holidays.ts`
implementa los dieciocho festivos, con los traslados al lunes de la Ley 51 de
1983 y los cinco que cuelgan de la Pascua— y se **guarda**, para que corregir
la tabla de festivos no mueva el plazo de un trámite ya abierto.

`identityVerified` no es burocracia: el art. 20 del Decreto 1377 exige
acreditar la identidad, y atender una supresión sin comprobarlo sería borrarle
los datos a alguien a petición de un tercero. El estado `rejected` existe
porque cerrar como «atendida» una supresión que no procede esconde que se
negó y por qué.

## Encargados y transmisión internacional

No se mete a los cuatro en la misma casilla, porque no están en la misma
casilla. Las figuras del art. 3 del Decreto 1377 no son intercambiables:
**transmisión** es un encargado tratando por cuenta del responsable;
**transferencia** es comunicar a otro responsable con fines propios.

| Proveedor | Qué trata | Dónde | Figura afirmable hoy |
| --- | --- | --- | --- |
| Supabase | Base de datos, auth del panel, almacenamiento de fotos | AWS `us-east-1` (verificado en el host de conexión) | **Encargado · transmisión internacional.** Trata por cuenta de MILLE y según nuestra configuración |
| Vercel | Alojamiento y entrega; de sus cabeceras sale la IP | Multirregión | **Encargado · transmisión internacional**, misma razón |
| Google (Gmail) | El buzón oficial | — | **No afirmable como encargado.** Ver abajo |
| Meta (WhatsApp) | La línea de atención | — | **No es encargado de MILLE.** Opera su servicio con fines propios |

**Google/Gmail, dicho con precisión.** El buzón oficial es una cuenta de Gmail
de uso general, no un servicio corporativo contratado. El Cloud Data
Processing Addendum de Google se incorpora a los acuerdos bajo los que Google
presta Google Workspace, Google Cloud Platform o Cloud Identity: una cuenta
gratuita no tiene tal acuerdo al que el addendum pueda engancharse, así que
**no hay un DPA que MILLE pueda invocar** y no se puede afirmar que Google
actúe como encargado por cuenta de MILLE. Google determina aspectos propios de
la operación de su servicio bajo sus términos de consumidor. Lo que sí es de
MILLE, y de lo que responde, es el contenido de los mensajes que conserva.

Esto no invalida el canal —el correo existe, se lee y sirve para ejercer
derechos—, pero es una debilidad documental real y está en la ficha de datos
pendientes como recomendación, no como acción: contratar Workspace sobre el
dominio daría a la vez un DPA y un buzón por función. El prompt de esta fase
pedía expresamente **no** configurar Workspace, así que se reporta y no se
toca.

**Meta/WhatsApp.** Meta no trata los datos por cuenta de MILLE: opera su
propio servicio de mensajería con sus propias finalidades y políticas.
Respecto de ellas actúa por su cuenta, no bajo instrucciones de MILLE.
Llamarlo «encargado» sería falso. MILLE responde por la conversación que
mantiene y por lo que registre de ella.

**La exención del art. 24, num. 2** —no informar ni pedir autorización aparte
para transmisiones internacionales— solo opera **cuando existe el contrato del
art. 25**. MILLE todavía no tiene archivada esa documentación, así que la
política **no se apoya en la exención**: informa quiénes son los proveedores y
qué hace cada uno, que es más de lo que la exención exigiría. Es la postura
prudente y además la más útil para el titular.

**Pendiente, no bloqueante para publicar:** archivar el DPA de Supabase y los
términos/DPA aplicables de Vercel, y confirmar por separado las regiones de
Auth y Storage. La política describe el rol operativo, que es lo verificable,
y en ningún punto afirma que exista contrato firmado.

## Procedencia de imágenes

Dos orígenes, y no se mezclan:

1. **Archivos del repositorio** (`/public/images/…`). Su procedencia ya estaba
   registrada en `public/images/*/CREDITS.json` desde que se descargaron:
   83 fotografías de inventario y 3 de marca, con autor y URL de origen, todas
   con licencia Unsplash salvo `brand/hero.jpg`, que es render propio de
   MILLE. Vive en código, en `REPOSITORY_IMAGE_RIGHTS`, junto al archivo que
   describe. Copiarla a la base crearía dos verdades desincronizables.
2. **Lo que alguien subió** desde el Admin. Eso solo lo sabe quien lo subió,
   así que son columnas: en `Vehicle` (el **lote**, que es como llegan las
   fotos de un carro), en `VehicleImage` (override de **una** foto) y en
   `SiteMedia`.

Resolución, y el bloque gana **entero** y no campo a campo: foto → lote →
repositorio. Mezclar el autor de un dealer con la licencia de un banco daría
una procedencia que no describe a nadie.

**`sourceType` es lo único obligatorio.** Pedir diez campos para registrar que
un propietario mandó las fotos por WhatsApp garantizaría que nadie registrara
nada. Sin él, el estado es **pendiente**, que es una respuesta —«nadie lo ha
registrado»— y **no bloquea nada**: no despublica, no impide subir y el sitio
público sigue igual. Las fotos que ya estaban no reciben una autorización
inventada por existir.

El sitio público **no muestra créditos**, y es correcto: la licencia de
Unsplash agradece la atribución pero no la exige. El flag
`licenseRequiresAttribution` existe para el día que una licencia sí la pida, y
el Admin lo dice en voz alta.

### Cuatro derechos distintos, no uno

Lo más fácil de equivocar aquí es leer «tiene licencia» como «está todo
resuelto». No lo está. Sobre una misma fotografía pueden concurrir:

1. **Derecho de autor del fotógrafo** — es lo que cubre la licencia de
   Unsplash, y lo único que cubre.
2. **Autorización del propietario del vehículo** — otro titular, otro
   consentimiento.
3. **Derechos sobre las marcas visibles** — del fabricante.
4. **Derecho a la imagen de las personas** que aparezcan.

Por eso `authorizedBy` está en `null` en todas las entradas de banco: **nadie
autorizó nada**, hay una licencia de plataforma. Rellenarlo con «Unsplash»
convertiría una licencia en una autorización inexistente. El Admin muestra esa
advertencia cuando la fuente es `stock`.

Consecuencia práctica: las fotografías actuales del inventario son material de
banco que **no representa vehículos reales de MILLE** (ver
`public/images/README.md`). Cuando entren fotografías de vehículos reales
—propias, del propietario o del dealer— harán falta las autorizaciones 2 y,
según el caso, 4. Las reglas de esas autorizaciones son una decisión de los
fundadores y están en la ficha de datos pendientes.

## Seguridad

- `ConsentEvent`, `PrivacyRequest`, `Inquiry`, `ConsentRecord`,
  `AdminAuditLog` y `AdminUser`: **RLS activo y sin políticas**, más `REVOKE`
  a `anon` y `authenticated`. Lo segundo no sobra: RLS no cubre `TRUNCATE` ni
  vincula al dueño de la tabla, y sobre `ConsentEvent` un `TRUNCATE`
  esquivaría el trigger.
- Todos los endpoints nuevos pasan por `requireSuperadmin()`.
- La exportación de consentimientos responde `Cache-Control: no-store` y
  queda en `AdminAuditLog` **con el filtro usado**.
- El CSV neutraliza la inyección de fórmulas (`=`, `+`, `-`, `@`, tab, CR):
  la exportación lleva nombres y agentes de navegador que escribe gente de
  fuera, y una celda `=HYPERLINK(...)` convertiría la prueba en un ataque
  contra quien la abre.
- Las URLs de procedencia se validan contra `http(s)`: una `javascript:` en un
  panel del Admin es un XSS.
- No se expone ninguna clave, token ni cabecera interna. `/admin/configuracion`
  es de solo lectura y muestra únicamente valores ya públicos.

## Retención: norma contra decisión interna

Lo exigido por norma y lo decidido por MILLE se distinguen a propósito. El
art. 11 del Decreto 1377 permite conservar «durante el tiempo que sea
razonable y necesario» y obliga a suprimir cumplida la finalidad; **ninguna
norma fija un número de meses** para lo que trata este sitio. Los plazos de la
tabla de arriba son, por tanto, **internos**, salvo el deber de conservar la
autorización (art. 17, lit. b), que es legal pero sin plazo: los 5 años son la
decisión interna que cubre con holgura el tiempo en que cabe una reclamación.

**No se activó ningún cron destructivo**, y es deliberado: la eliminación de
datos de personas debe ser una decisión verificada, no un trabajo desatendido
que una madrugada borre lo que no debía.

## Qué se puede reconstruir desde el Admin

| Pregunta | Dónde |
| --- | --- |
| ¿Qué política estaba vigente? | `policyVersion` del evento · Configuración |
| ¿Qué autorizó esta persona, y con qué texto? | Consentimientos → Ver evidencia |
| ¿Cuándo, desde qué formulario, desde qué IP? | Consentimientos |
| ¿Revocó? | Consentimientos, evento `REVOKED` |
| ¿Qué solicitud presentó y cómo se resolvió? | Solicitudes de privacidad |
| ¿De dónde salió esta fotografía? | Editar vehículo → Procedencia · Imágenes del sitio |
| ¿Qué configuración legal está vigente y qué falta? | Configuración |
| ¿Quién hizo un cambio administrativo? | `AdminAuditLog` |

`ConsentEvent` y `AdminAuditLog` **no son lo mismo** y no se mezclan:
el primero es evidencia de una decisión del **Titular**; el segundo, de una
acción **administrativa**. Una revocatoria registrada por el equipo deja
constancia en los dos, y eso no es duplicación: uno dice que el titular la
pidió, el otro dice quién la tecleó.

## Versionado

`LEGAL_VERSIONS` en `src/lib/legal.ts` es la fuente única; la fecha legible se
**deriva** de la versión. Antes cada página traía las dos por separado, así que
una corrección podía mover el texto y dejar la versión quieta — y entonces un
consentimiento guardado dejaba de poder demostrar qué se mostró. Una prueba
verifica que ninguna página vuelva a escribir su fecha a mano.

La versión sube cuando cambia algo **material**: qué se trata, para qué, quién
responde, qué derechos, cómo se ejercen. En esta ronda subieron Términos y
Privacidad; **Cookies no**, porque solo se reorganizó su redacción y ninguna
respuesta cambió.

Una versión publicada **no se reescribe**: los `ConsentEvent` antiguos siguen
apuntando a ella. Si cambia la finalidad del tratamiento hará falta
autorización nueva (art. 13 del Decreto 1377) — el versionado está diseñado
para poder manejarlo, y **no** se implementó ninguna campaña de
re-consentimiento, porque hoy no hay nada que re-consentir.

## Cómo se verifica

```
npm test              # incluye consent, privacy-requests, legal, csv,
                      # client-ip, image-provenance y colombian-holidays
npm run test:legal    # contra la base real: trigger append-only, RLS,
                      # REVOKE, CHECK de contacto, plazos y procedencia
```

`npm run test:legal` escribe todo dentro de transacciones que **siempre** se
revierten y comprueba al final que no dejó nada. No toca ninguna fila real.
