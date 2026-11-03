# Propuesta de políticas RLS (issue #15)

**Estado: solo propuesta.** No se ha cambiado nada en Supabase. Cualquier cambio irá en una migración nueva (`004_...sql`) y necesita la aprobación del grupo antes de aplicarse.

## Qué significa RLS
RLS (Row Level Security) es un filtro de Supabase que decide, tabla por tabla, quién puede leer, insertar, modificar o borrar filas. Con RLS activado y sin política, nadie puede nada. Cada política abre un permiso.

Hay dos tipos de usuario hoy:
- **Visitante (`anon`):** cualquiera que abre la web sin iniciar sesión.
- **Usuario con sesión (`authenticated`):** quien entra con un correo y contraseña creados por el grupo.

## Cómo está ahora (`002_seguridad.sql` y `003_ajustes.sql`)

| Tabla | Visitante | Usuario con sesión |
|---|---|---|
| `sesion` | solo leer | leer, crear, modificar y borrar |
| `alumno` | nada | todo |
| `monitor` | nada | todo |
| `inscripcion` | nada | todo |
| `imparte` | nada | todo |
| `material_escuela` | nada | todo |
| `prestamo_material` | nada | todo |

Todas las políticas de escritura usan `using (true)` o `with check (true)`: cualquier usuario con sesión puede hacer todo.

## Riesgos que se ven
1. **Todos los usuarios valen lo mismo.** Un monitor podría borrar alumnos o sesiones. Hoy no es un problema porque solo entra el grupo.
2. **Depende de que el registro libre siga desactivado.** Si alguien lo activara, cualquiera que se registrara vería los DNI y teléfonos de todos.
3. **Las plazas libres no las ve un visitante.** Los conteos usan `imparte` e `inscripcion`, que solo leen usuarios con sesión.

## Propuesta
### Paso 1: guardar el rol de cada usuario
Una tabla nueva `perfil` (`id` = el id del usuario de Supabase Auth, `rol` = `administrador` o `monitor`). Cada usuario nuevo se crea a mano y se le da un rol.

### Paso 2: permisos por rol

| Tabla | Visitante | Monitor | Administrador |
|---|---|---|---|
| `sesion` | leer | leer | todo |
| `alumno` | nada | leer, crear y modificar | todo |
| `monitor` | nada | leer | todo |
| `inscripcion` | nada | leer, crear y borrar | todo |
| `imparte` | nada | leer | todo |
| `material_escuela` | nada | leer | todo |
| `prestamo_material` | nada | leer, crear y borrar | todo |
| `perfil` | nada | leer el suyo | todo |

La idea: el monitor hace el trabajo del día a día (inscribir, prestar y devolver material) pero no borra alumnos, sesiones ni monitores, y no cambia la plantilla.

### Paso 3 (opcional): plazas libres públicas
Una vista o función en la base de datos que devuelva solo el número de plazas libres por sesión, sin datos personales, para que un visitante lo pueda ver.

## Qué decidir antes de aplicar nada
- ¿Queréis dos roles (monitor y administrador) o basta con que todos los usuarios sean iguales?
- ¿Los alumnos van a iniciar sesión algún día? Si es así, hace falta un tercer rol y que cada alumno solo vea lo suyo.
- ¿Queréis que los visitantes vean las plazas libres?

Con las respuestas, se escribe `004_roles.sql`, se explica su efecto en el modelo E-R y se aplica solo tras vuestra aprobación. `CLAUDE.md` se actualizaría con la tabla `perfil` si se crea.
