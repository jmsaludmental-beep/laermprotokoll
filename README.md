# Lärmprotokoll Hamburg (öffentliche Website)

Statische Seite mit Upload von Videos/Fotos/Audio und öffentlicher Liste nach Datum.
Funktioniert mit dem Gratis-Plan von Supabase (Datenbank) und dem kostenlosen
Cloudinary-Upload-Widget (Dateispeicher).

## 1) Gratis-Projekt in Supabase anlegen

1. Ein Projekt in Supabase anlegen (Free-Plan).
2. Im **SQL Editor** ausführen:

```sql
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  neighbor text not null,
  email text,
  description text not null,
  noise_type text,
  event_date date,
  event_time time,
  reported_count integer default 0,
  hidden boolean default false,
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

Falls die Tabelle bereits existiert, nur diese Spalten ergänzen:

```sql
alter table public.entries
  add column if not exists noise_type text,
  add column if not exists event_date date,
  add column if not exists event_time time,
  add column if not exists reported_count integer default 0,
  add column if not exists hidden boolean default false;
```

Report-Function (blendet Einträge nach 3 Meldungen aus):

```sql
create or replace function public.report_entry(entry_id uuid)
returns table(reported_count integer, hidden boolean)
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
declare new_hidden boolean;
begin
  update public.entries
  set reported_count = coalesce(reported_count, 0) + 1,
      hidden = case
        when coalesce(reported_count, 0) + 1 >= 3 then true
        else hidden
      end
  where id = entry_id
  returning reported_count, hidden into new_count, new_hidden;

  return query select new_count, new_hidden;
end;
$$;

grant execute on function public.report_entry(uuid) to anon, authenticated;
```

## 2) Cloudinary einrichten

1. Cloudinary-Konto erstellen.
2. Einen **unsigned Upload Preset** anlegen.
3. Im Preset Dateitypen und Größenlimits setzen.
4. Optional: Eingehende Video-Transformationen konfigurieren, um die Dateigröße zu senken.

## 3) Schlüssel in `app.js` eintragen

In `app.js` ersetzen:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`
- `YOUR_CLOUDINARY_CLOUD_NAME`
- `YOUR_UNSIGNED_PRESET`

Zu finden unter **Project Settings → API**.

## 4) Kostenlos veröffentlichen

Einfache Optionen:

1. GitHub Pages: Dateien ins Repo hochladen und Pages aktivieren.
2. Netlify: Projektordner hochladen und in Minuten veröffentlichen.

## Datenschutzhinweise

Bitte keine Gesichter Dritter aufnehmen. Nutze bei Bedarf Kennungen statt
vollständiger Namen.
