# Mantenimiento de datos

## Arquitectura

Los cuatro JSON de `data/` son la fuente editable del contenido deportivo y editorial:

- `clasificacion.json`: temporada, competición, jornada actual y estadísticas del equipo.
- `partidos.json`: jornada, fecha ISO 8601 con zona horaria, rivales, escudos locales, estado, marcador, crónica, acta y pabellón.
- `plantilla.json`: jugadores, dorsal, posición, `fechaNacimiento` (ISO `AAAA-MM-DD` o `null`), nacionalidad, ciudad natal, foto y redes; incluye también el cuerpo técnico.
- `noticias.json`: identificador estable, fecha ISO, categoría, titular, resumen, párrafos, imagen y texto alternativo.

`js/main.js` solicita esos recursos cuando el sitio se sirve por HTTP y genera portada, calendario, clasificación, noticias, fichas de partido y plantilla. Para abrir las páginas directamente con `file://`, `js/data-fallback.js` contiene una copia de respaldo de esos JSON. Actualízala después de cambiar los datos:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\generar-respaldo.ps1
```

Cuando un JSON no se pueda cargar por HTTP, el sitio informa del problema en la consola y usa el respaldo. El formulario del prototipo no guarda datos personales ni confirma altas, pedidos o reservas: hace falta conectar un canal de recepción del club antes de producción.

## Conexión con fuentes externas

### ASOBAL

La integración recomendada es un proceso del lado servidor (tarea programada o función) que consulte una API autorizada o una exportación acordada, normalice los datos al esquema anterior y publique los JSON. No se debe llamar a una fuente sin CORS desde el navegador, incluir credenciales en JavaScript ni depender de scraping que incumpla las condiciones del proveedor. Registrar la hora de actualización y validar marcador, jornada, fecha y equipo antes de publicar.

### Google Sheets

Se puede usar una hoja con pestañas `Clasificación`, `Partidos`, `Plantilla` y `Noticias`. Un proceso de publicación autorizado exporta cada pestaña, valida columnas y tipos, transforma filas a los esquemas JSON y genera `js/data-fallback.js`. Para hojas privadas, las credenciales se mantienen en el servidor o en el gestor de secretos del despliegue; nunca se publican en el repositorio ni en el navegador.

## Flujo de actualización por rol

1. **Responsable deportivo:** actualiza resultados, fechas, jornada, clasificación y actas en la fuente acordada.
2. **Responsable de plantilla:** confirma altas/bajas, dorsales, posiciones y datos biográficos verificables; deja `fechaNacimiento` como `null` si no existe una fuente fiable.
3. **Redacción:** edita titulares, resúmenes, cuerpo, categoría, fecha e imágenes de noticias.
4. **Editor/a web:** revisa JSON (estructura, enlaces de imágenes, IDs únicos y fechas), ejecuta `scripts\generar-respaldo.ps1` y prueba el sitio por HTTP y `file://`.
5. **Responsable del sitio:** publica el cambio y comprueba las páginas afectadas, los formularios y los enlaces internos.

No sustituir datos no confirmados por valores estimados: la interfaz muestra «Por confirmar» cuando faltan datos personales y el detalle del partido indica cuándo el acta está pendiente.
