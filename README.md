# Lärmprotokoll Hamburg (web pública)

Página estática con subida de videos/fotos/audios y listado público ordenado por fecha.
Funciona con el plan gratuito de Supabase (base de datos + storage) y hosting gratis
en GitHub Pages o Netlify.

## 1) Crear proyecto gratis en Supabase

1. Crear un proyecto en Supabase (plan Free).
2. En **Storage**, crear un bucket público llamado `laermprotokoll`.
3. En **SQL Editor**, ejecutar:

```sql
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  neighbor text not null,
  email text,
  description text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz default now()
);

alter table public.entries enable row level security;

create policy "public read" on public.entries
for select using (true);

create policy "public insert" on public.entries
for insert with check (true);
```

## 2) Configurar claves en `app.js`

En `app.js` reemplaza:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

Las encuentras en **Project Settings → API**.

## 3) Publicar gratis

Opciones simples:

1. GitHub Pages: sube estos archivos a un repositorio y activa Pages.
2. Netlify: arrastra la carpeta del proyecto y publica en minutos.

## Notas de privacidad

Evita capturar rostros de terceros. Usa identificadores en lugar de nombres completos
si lo prefieres.
