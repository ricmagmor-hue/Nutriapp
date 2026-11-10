# De localhost a producción

Hoy Despensa guarda todo en el navegador (`localStorage`, clave `despensa-v2`). No hay cuentas reales: quien abre el sitio ve los perfiles de ese navegador. Para producción hace falta una base de datos, un inicio de sesión y reglas de quién puede ver qué.

Hay dos perfiles. No hace falta un tercer rol de administrador para salir a producción.

| Perfil en la app | Rol en la base | Qué puede hacer |
| --- | --- | --- |
| Día a día | `hogar` | Su inventario, recetas, compras, personas del hogar y favoritos. Acepta códigos de nutriólogo, uno por persona. |
| Nutriólogo | `nutriologo` | Tiene muchos pacientes. Genera códigos, asigna porciones y ve el hogar de cada paciente. No entra al inventario de un hogar que no lo vinculó. |

Un paciente es una persona del hogar (`household_members`), no el hogar entero. El vínculo es `nutritionist_patients`: un nutriólogo, muchos pacientes; cada persona, un solo nutriólogo. Si Ana y Leo viven juntos y los dos son pacientes, el nutriólogo ve “mismo hogar” aunque el otro paciente sea de otro nutriólogo. De ese otro paciente solo ve el nombre, no su plan.

## Base de datos

PostgreSQL. Los identificadores son `uuid`. Las contraseñas no se guardan en claro: solo `password_hash`.

```sql
create type user_role as enum ('hogar', 'nutriologo');
create type meal_kind as enum ('desayuno', 'comida', 'cena', 'colacion');

create table users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  role user_role not null,
  use_equivalents boolean not null default false
);

create table household_members (
  id uuid primary key,
  household_id uuid not null references users (id),
  name text not null,
  kind text not null check (kind in ('self', 'family')),
  age int,
  sex text,
  weight_kg numeric
);

create table nutritionist_patients (
  id uuid primary key,
  nutritionist_id uuid not null references users (id),
  household_id uuid not null references users (id),
  member_id uuid not null unique references household_members (id)
);

create table invites (
  code text primary key,
  nutritionist_id uuid not null references users (id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table diets (
  id uuid primary key,
  member_id uuid not null references household_members (id),
  name text not null,
  calories int not null,
  protein_g int not null,
  carbs_g int not null,
  fat_g int not null,
  notes text not null default '',
  active boolean not null,
  assigned_by uuid references users (id)
);

create table diet_meals (
  id uuid primary key,
  diet_id uuid not null references diets (id) on delete cascade,
  name text not null,
  kind meal_kind not null,
  portions jsonb not null default '{}'
);

create table favorites (
  user_id uuid not null references users (id),
  recipe_id text not null,
  meal_key text not null,
  primary key (user_id, recipe_id, meal_key)
);

create table inventory_items (
  id uuid primary key,
  household_id uuid not null references users (id),
  catalog_id text,
  name text not null,
  quantity numeric not null,
  unit text not null,
  min_quantity numeric not null,
  buy_quantity numeric not null
);

create table shopping_extras (
  id uuid primary key,
  household_id uuid not null references users (id),
  catalog_id text,
  name text not null,
  quantity numeric not null,
  unit text not null,
  note text not null default ''
);

create table cooked_entries (
  id uuid primary key,
  household_id uuid not null references users (id),
  recipe_id text not null,
  name text not null,
  servings numeric not null,
  at timestamptz not null
);

create index patients_by_nutritionist on nutritionist_patients (nutritionist_id);
create index patients_by_household on nutritionist_patients (household_id);
create index members_by_household on household_members (household_id);
```

Las recetas y la guía de equivalentes pueden seguir en el código. No cambian por usuario.

La búsqueda de pacientes, cuando deje de ser local, es esta:

```sql
select m.name as paciente, h.name as hogar
from nutritionist_patients p
join household_members m on m.id = p.member_id
join users h on h.id = p.household_id
where p.nutritionist_id = $nutriologo
  and (m.name ilike '%' || $texto || '%' or h.name ilike '%' || $texto || '%')
order by m.name;
```

El “mismo hogar” sale de las otras filas de `nutritionist_patients` con el mismo `household_id`.

## Quién puede leer y escribir

Cada petición lleva la sesión del usuario. El servidor rechaza lo que no cumpla esto.

| Dato | Hogar | Nutriólogo |
| --- | --- | --- |
| Su propio usuario | Lee y cambia su nombre | Lee y cambia su nombre |
| Personas del hogar | Solo las de su `household_id` | Solo pacientes vinculados, más el nombre de otros pacientes de ese mismo hogar |
| Plan y porciones | Lee el de sus personas | Crea y edita solo el de sus pacientes |
| Código de invitación | Lo acepta y elige a qué persona | Lo crea. Al usarse, nace una fila en `nutritionist_patients` |
| Inventario, compras, cocinado | Solo su hogar | Ve el cocinado reciente de los hogares de sus pacientes. No edita el inventario |
| Favoritos | Los suyos. La calificación es el conteo de `favorites` de todos los usuarios | Igual, en su propia cocina |

Al iniciar sesión, `users.role` decide la pantalla: `hogar` entra a inventario; `nutriologo` entra a pacientes.

## Paso a paso

1. Crear un proyecto de PostgreSQL (Supabase, Neon o RDS). Guardar la URL de conexión fuera del repositorio, en una variable `DATABASE_URL`.
2. Correr el SQL de arriba una vez. Es el esquema inicial.
3. Agregar un servidor (el front de Vite no puede hablarle a la base directo). Endpoints mínimos: registro e inicio de sesión, hogar y personas, códigos, pacientes, planes, inventario y favoritos.
4. Sustituir `loadState` / `saveState` por esas llamadas. La forma de los datos ya está en `src/types.ts`.
5. Aplicar la tabla de permisos en el servidor, no solo escondiendo botones.
6. Publicar el front y el servidor con HTTPS. El navegador deja de ser el almacén.
7. Los perfiles de localhost no viajan solos. Quien ya los use tendrá que registrarse de nuevo, o se hace un import único del JSON de `despensa-v2`.

Hasta cerrar el paso 5, el sitio sigue siendo de un solo navegador. El archivo de producción no reemplaza el inicio de sesión: lo describe para construirlo.
