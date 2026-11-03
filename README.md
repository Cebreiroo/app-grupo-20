# app-grupo-20

Aplicación web para organizar sesiones de surf: horarios, playas, niveles, monitores, alumnos inscritos y material de la escuela.

**Web publicada:** https://cebreiroo.github.io/app-grupo-20/

Cualquiera puede ver la lista de sesiones. Para añadir o modificar datos hay que iniciar sesión con un usuario creado por el grupo (el registro libre está desactivado).

## Grupo 20
- David Bolaños Olveira
- Álvaro Carreira Saborido
- Alexandre Cebreiro Vega

## Cómo está hecha
- Página estática: `index.html`, `estilos.css` y `app.js`, sin compilación.
- Base de datos y usuarios: Supabase, con `supabase-js` cargado desde un CDN.
- Publicación: GitHub Pages, desde la rama `main`. Cada cambio fusionado en `main` se publica solo.
- Migraciones SQL del modelo de datos en `supabase/migraciones/`.
- Diagrama entidad-relación original en `docs/modelo-er.png`.
- Propuesta de permisos por rol en `docs/politicas-rls.md`.

Más detalles para quien trabaje en el proyecto en [CLAUDE.md](CLAUDE.md).

## Probarla en tu ordenador
Hace falta servir la carpeta con un servidor local (abrir `index.html` con doble clic puede fallar en algunos navegadores). Por ejemplo, con Python instalado:

```bash
python -m http.server 8000
```

y abrir http://localhost:8000.
