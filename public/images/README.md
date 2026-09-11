# Imágenes

## Cómo reemplazar la fotografía

Las fotos actuales son **material de demostración** con licencia Unsplash.
No representan inventario real de MILLE y deben reemplazarse por fotografía
propia antes de publicar el sitio.

### Vehículos

Cada vehículo lee sus fotos de `vehicles/<slug>/01.jpg`, `02.jpg`, …
El `slug` es el mismo que aparece en `src/data/vehicles.ts` y en la URL
(`/vehiculos/bmw-x5-xdrive40i`).

Para cambiar las fotos de un vehículo basta con sobrescribir esos archivos.
Si quieres más o menos de cuatro fotos, ajusta el conteo en la llamada a
`gallery()` dentro de `src/data/vehicles.ts`; el contador de la galería
(`1 / 8`) y las miniaturas se ajustan solos.

Relación de aspecto recomendada: 3:2 o 4:3, lado largo de 1600 px o más.

### Marca

| Archivo | Dónde aparece |
| --- | --- |
| `brand/hero.jpg` | Hero de la home |
| `brand/interior.jpg` | Bloque "Una forma de vida" y panel de contacto |
| `brand/night.jpg` | Contacto, 404 y respaldo de vehículos sin foto |

`brand/hero.jpg` es un render de marca propio de MILLE. Los demás son
material de demostración.

### Créditos

`vehicles/CREDITS.json` y `brand/CREDITS.json` registran autor y origen de
cada archivo descargado, por si necesitas atribución mientras siguen en uso.
