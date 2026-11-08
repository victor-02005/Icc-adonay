# Backend ICC Adonay

API (FastAPI) + panel de administración en `/admin`. Roles: **admin**, **secretaria**, **editor**.

## Publicar (Neon + Render, ambos con plan gratis)
1. **Base de datos:** crea una cuenta en neon.tech → New project. Copia la "connection string" (empieza con `postgresql://`).
2. **Backend:** sube este repositorio a GitHub. En render.com → New → Blueprint, elige el repositorio (usa `backend/render.yaml`).
3. En Render completa las variables:
   - `DATABASE_URL`: la cadena de Neon.
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD`: tu acceso inicial (mínimo 12 caracteres).
   - `SITE_ORIGINS`: la dirección de tu sitio, ej. `https://tu-dominio.com` (sin barra final).
4. Cuando termine, abre `https://TU-API.onrender.com/admin` e inicia sesión. Crea usuarios para secretaría y editores.
5. En el sitio, edita `js/config.js`: `window.ICC_API="https://TU-API.onrender.com";` y sube el cambio a GitHub.

El plan gratis de Render se "duerme" tras 15 min sin uso: la primera visita puede tardar ~30 s (el sitio usa `data.js` mientras tanto).

## Prueba local
```
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edítalo
export $(grep -v '^#' .env | xargs)
uvicorn app.main:app --reload
```
Panel en http://localhost:8000/admin

## Seguridad incluida
Contraseñas con Argon2id · cookie de sesión HttpOnly/Secure/SameSite=Strict · permisos validados en el servidor · límite de intentos de login y de solicitudes · registro de actividad · consultas parametrizadas (SQLAlchemy) · el contenido se escapa al mostrarse.

## Pendiente
Segundo factor (MFA), subida de imágenes desde el panel (hoy se pone la ruta o enlace), recuperación de contraseña por correo y copias de seguridad automáticas (Neon ofrece restauración a un punto anterior).
