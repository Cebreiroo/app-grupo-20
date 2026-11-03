# app-grupo-20

## Qué es la app
Aplicación para organizar sesiones de surf: el material necesario, los horarios y la localización (playa) de las sesiones, el número de alumnos inscritos, etc.

## Grupo 20
- David Bolaños Olveira
- Álvaro Carreira Saborido
- Alexandre Cebreiro Vega

## Tecnología
- Página estática: HTML + CSS + JavaScript, **sin compilación** (sin npm, sin bundlers).
- `supabase-js` cargado desde CDN.
- Base de datos y API: Supabase (proyecto `app-grupo-20`).
- Publicada en GitHub Pages desde la rama `main`: https://cebreiroo.github.io/app-grupo-20/ (Cloudflare Pages se descartó para tener una sola publicación).
- Ficheros de la web: `index.html` (estructura), `estilos.css` (aspecto) y `app.js` (código).
- Migraciones SQL en `supabase/migraciones/`.

### Conexión a Supabase (datos públicos)
- Project URL: `https://ecmkodlfmxmwlncxxoik.supabase.co`
- Publishable key: `sb_publishable_ksICiDz4rmTde3bdbNZMeA_EvEI_Xz7`

La publishable key está pensada para ir en el navegador; lo que protege los datos son las políticas RLS. La secret key no se anota aquí ni en ningún otro sitio del repo.

## Modelo de datos (resumen)
El modelo entidad-relación original está en `docs/modelo-er.png`. Nombres en español, minúsculas y sin tildes.

| Tabla | Clave primaria | Para qué sirve |
|---|---|---|
| `alumno` | `dni` | Datos del alumno (nombre, edad, teléfono, nivel) |
| `monitor` | `dni_monitor` | Datos del monitor (nombre, edad, teléfono) |
| `sesion` | `id_sesion` | Fecha, hora de inicio, playa, nivel y duración |
| `inscripcion` | (`dni_alumno`, `id_sesion`) | Resuelve la N:M alumno–sesión |
| `imparte` | (`id_sesion`, `dni_monitor`) | Resuelve la N:M monitor–sesión |
| `material_escuela` | `id_material` | Catálogo de material con su stock total: una fila por tipo y medida (`tipo_material`, `medida`, `stock`; único por tipo y medida) |
| `prestamo_material` | (`dni_alumno`, `id_sesion`, `id_material`) | Unidad de material que un alumno usa en una sesión; cuelga de `inscripcion` |

Reglas de negocio: niveles `iniciacion`, `medio` o `avanzado`; máximo 3 monitores por sesión y 5 alumnos por monitor.

Stock de material (migración `004_stock_material.sql`): 60 tablas (15 de cada medida: 6'0, 6'6, 7'0 y 8'0) y 70 neoprenos (S 15, M 25, L 20, XL 10).
- El stock disponible no se guarda: se calcula como stock total − unidades prestadas en las sesiones que coinciden en el tiempo. Cada sesión ocupa el material desde su inicio hasta 30 minutos después de acabar. Así, sesiones simultáneas (en cualquier playa) comparten stock y, entre sesiones que no coinciden, el stock está completo.
- Cada alumno puede coger como máximo 1 tabla y 1 neopreno por sesión. Lo comprueba un trigger de la base de datos, que también rechaza el préstamo si no queda stock.
- Funciones de la base de datos: `stock_disponible(id_material, id_sesion)` y `material_disponible(id_sesion)`.
- Un préstamo no se edita: se devuelve (se borra la fila) y se vuelve a prestar.
Las sesiones se ofrecen en franjas horarias fijas a la semana y los alumnos se apuntan a la que les encaje.

## Reglas de trabajo
1. **Explicar cada cambio para principiantes**: qué se ha hecho, por qué y qué efecto tiene, sin dar nada por sabido.
2. **No cambiar tablas sin aprobación** del grupo: ni crear, ni modificar, ni borrar, ni aplicar migraciones en Supabase hasta que lo aprueben.
3. **No usar nunca la secret key de Supabase.** En el navegador solo se usa la publishable (anon) key; la seguridad la dan las políticas RLS.
4. Trabajar siempre en una rama nueva, nunca directamente en `main`.
