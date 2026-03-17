# Lärmprotokoll Hamburg (öffentliche Website)

Statische Seite mit Upload von Videos/Fotos/Audio y gestión profesional de reportes.

Funciona con:
- **Supabase**: Base de datos, Autenticación (Magic Link) y RLS.
- **Cloudinary**: Alojamiento de medios (unsigned upload).
- **GitHub Pages**: Hosting estático.

## Configuración de Supabase

1. Crea una tabla `entries` con las columnas: `neighbor`, `email`, `full_address`, `description`, `noise_type`, `event_date`, `event_time`, `file_url`, `file_type`.
2. Crea una vista pública `public_entries` para ocultar datos sensibles:
   ```sql
   CREATE VIEW public_entries AS
   SELECT id, created_at, description, noise_type, event_date, event_time, file_url, file_type, neighbor
   FROM entries;
   ```
3. Configura las políticas RLS para proteger la privacidad de los vecinos.

## Instalación Local

1. Clona el repositorio.
2. Abre `app.js` y `admin.js` y añade tus credenciales de Supabase y Cloudinary.
3. Abre `index.html` en tu navegador (o usa un servidor local).

## Despliegue

Sube los cambios a la rama `main` y activa GitHub Pages en la configuración del repositorio.
