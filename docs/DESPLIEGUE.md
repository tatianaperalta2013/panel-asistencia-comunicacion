# Cómo publicar el MVP

Todo es gratis. Orden: **MongoDB Atlas → Render (3 servicios) → Vercel**.

## Paso 0: dos claves secretas

Inventá dos claves largas, sin espacios, y guardalas en un bloc de notas. Van a ir en varios lugares, **siempre iguales**:

```
JWT_SECRET=pp3Grupo7JwtClave2026xYz
GATEWAY_SECRET=pp3Grupo7GatewayClave2026aBc
```

## Paso 1: MongoDB Atlas

1. Creá una cuenta en https://www.mongodb.com/cloud/atlas/register.
2. Creá un cluster **M0 (Free)**.
3. **Database Access → Add New Database User:** creá usuario y contraseña, y anotalos.
4. **Network Access → Add IP Address → Allow Access from Anywhere.**
5. **Connect → Drivers:** copiá la dirección y armá dos, una por base (cambia lo que va después de `.net/`):
   ```
   mongodb+srv://USUARIO:CLAVE@cluster0.xxxxx.mongodb.net/bdd_usuarios?retryWrites=true&w=majority
   mongodb+srv://USUARIO:CLAVE@cluster0.xxxxx.mongodb.net/bdd_status?retryWrites=true&w=majority
   ```

## Paso 2: Render (los 3 backends)

Entrá a https://render.com con tu cuenta de GitHub. Para cada servicio: **New + → Web Service** → elegí el repo.

Configuración común a los tres: **Runtime:** Node · **Build Command:** `npm install` · **Start Command:** `npm start` · **Instance Type:** Free.

| Name | Root Directory | Environment Variables |
|---|---|---|
| `pp3-usuarios` | `servicio-usuarios` | `MONGO_URI` (bdd_usuarios), `JWT_SECRET`, `GATEWAY_SECRET` |
| `pp3-status` | `servicio-status` | `MONGO_URI` (bdd_status), `GATEWAY_SECRET` |
| `pp3-gateway` | `gateway` | `USUARIOS_URL`, `STATUS_URL`, `JWT_SECRET`, `GATEWAY_SECRET` |

- Creá primero **usuarios** y **status**, y anotá la URL que te da cada uno (por ejemplo `https://pp3-usuarios.onrender.com`).
- En el **gateway**, `USUARIOS_URL` y `STATUS_URL` son esas URL, sin `/` al final.
- Para probar cada uno: abrí `https://...onrender.com/health`. Tiene que decir `{"estado":"ok"}`.

## Paso 3: Vercel (el frontend)

1. En `frontend/js/config.js` poné la URL del gateway:
   ```js
   const GATEWAY_PRODUCCION = 'https://pp3-gateway.onrender.com';
   ```
2. Subilo a GitHub: `git add .`, `git commit -m "Configura URL del gateway"` y `git push`.
3. Entrá a https://vercel.com con GitHub → **Add New → Project** → elegí el repo.
4. **Root Directory:** `frontend` · **Framework Preset:** Other → **Deploy**.
5. La URL que te da (por ejemplo `https://panel-asistencia.vercel.app`) es **la URL del MVP**. Ponela en el README.

## Paso 4: seguridad final

En Render, en **pp3-gateway → Environment**, agregá `FRONTEND_URL` con la URL de Vercel. Así solo tu página puede usar la API.

## Si algo falla

| Problema | Solución |
|---|---|
| La primera vez tarda casi 1 minuto | Render gratis "duerme" los servicios. Antes de la defensa, abrí los 3 `/health` |
| "Tu sesión venció" apenas entrás | `JWT_SECRET` distinto en usuarios y gateway |
| "Acceso solo a través del API Gateway" | `GATEWAY_SECRET` distinto en algún servicio |
| "El servicio no responde" | Revisá `USUARIOS_URL` y `STATUS_URL` en el gateway |
| No conecta a la base | Revisá `MONGO_URI` y **Network Access** en Atlas |
