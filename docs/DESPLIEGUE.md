# Guía de despliegue

Para que el MVP tenga una URL pública hacen falta 4 cosas, todas gratis:

1. **MongoDB Atlas** → la base de datos
2. **Render** → los 3 servicios del backend (Usuarios, Status y Gateway)
3. **Vercel** → el frontend
4. Conectar todo con las URL de cada uno

Antes de empezar, el código tiene que estar subido a GitHub.

---

## Paso 0: inventar las dos claves secretas

Escribí en un bloc de notas dos claves largas inventadas (letras y números, sin espacios). Ejemplo:

```
JWT_SECRET=pp3Grupo7JwtClave2026xYz
GATEWAY_SECRET=pp3Grupo7GatewayClave2026aBc
```

Las vas a pegar en varios lugares. **Tienen que ser exactamente iguales en todos.**

---

## Paso 1: MongoDB Atlas (la base de datos)

1. Entrá a https://www.mongodb.com/cloud/atlas/register y creá una cuenta.
2. Creá un cluster **M0 (Free)**. Elegí la región más cercana (São Paulo).
3. En **Database Access** → **Add New Database User**: creá un usuario y contraseña. **Anotalos.**
4. En **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`). Hace falta porque Render no tiene una IP fija.
5. Volvé a **Database** → **Connect** → **Drivers**. Copiá la dirección, que se ve así:
   ```
   mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Armá **dos direcciones**, una para cada servicio, agregando el nombre de la base después de `.net/`:
   ```
   Usuarios: mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/pp3_usuarios?retryWrites=true&w=majority
   Status:   mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/pp3_status?retryWrites=true&w=majority
   ```
   Así cada servicio tiene su propia base (patrón "base de datos por servicio").

---

## Paso 2: Render (el backend)

Entrá a https://render.com y creá una cuenta **con tu usuario de GitHub**.

Vas a crear **3 servicios**, uno por carpeta. Para cada uno: **New +** → **Web Service** → elegí el repo `panel-asistencia-comunicacion`.

### 2.1 Servicio Usuarios

| Campo | Valor |
|---|---|
| Name | `pp3-usuarios` |
| Root Directory | `servicio-usuarios` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

En **Environment Variables** agregá:

| Key | Value |
|---|---|
| `MONGO_URI` | la dirección de **Usuarios** del paso 1 |
| `JWT_SECRET` | tu clave del paso 0 |
| `GATEWAY_SECRET` | tu clave del paso 0 |

Tocá **Create Web Service**. Cuando termine, arriba aparece la URL, por ejemplo `https://pp3-usuarios.onrender.com`. **Anotala.**

Para probar: abrí `https://pp3-usuarios.onrender.com/health`. Tiene que decir `"estado":"ok"`.

### 2.2 Servicio Status

Igual que el anterior, con estos cambios:

| Campo | Valor |
|---|---|
| Name | `pp3-status` |
| Root Directory | `servicio-status` |

| Key | Value |
|---|---|
| `MONGO_URI` | la dirección de **Status** del paso 1 |
| `GATEWAY_SECRET` | tu clave del paso 0 |
| `FRONTEND_URL` | por ahora dejalo vacío; lo completás en el paso 4 |

**Anotá la URL**, por ejemplo `https://pp3-status.onrender.com`.

### 2.3 API Gateway

| Campo | Valor |
|---|---|
| Name | `pp3-gateway` |
| Root Directory | `gateway` |

| Key | Value |
|---|---|
| `USUARIOS_URL` | URL del paso 2.1 (sin `/` al final) |
| `STATUS_URL` | URL del paso 2.2 (sin `/` al final) |
| `JWT_SECRET` | tu clave del paso 0 |
| `GATEWAY_SECRET` | tu clave del paso 0 |

**Anotá la URL**, por ejemplo `https://pp3-gateway.onrender.com`.

Para probar: abrí `https://pp3-gateway.onrender.com/api/health`.

---

## Paso 3: Vercel (el frontend)

1. En tu compu, abrí `frontend/js/config.js` y cambiá esta línea con la URL del gateway (con `/api` al final):
   ```js
   const API_PRODUCCION = 'https://pp3-gateway.onrender.com/api';
   ```
2. Subí ese cambio a GitHub:
   ```bash
   git add frontend/js/config.js
   git commit -m "Configura la URL del gateway en producción"
   git push
   ```
3. Entrá a https://vercel.com con tu usuario de GitHub.
4. **Add New** → **Project** → elegí el repo `panel-asistencia-comunicacion`.
5. En **Root Directory** tocá **Edit** y elegí la carpeta `frontend`.
6. **Framework Preset**: Other. Tocá **Deploy**.
7. Te da una URL, por ejemplo `https://panel-asistencia-comunicacion.vercel.app`. **Esa es la URL del MVP.**

---

## Paso 4: conectar todo

1. En Render, en **pp3-status** → **Environment**, completá:
   - `FRONTEND_URL` = la URL de Vercel (así el botón "Copiar link" arma el link correcto).
2. En Render, en **pp3-gateway** → **Environment**, agregá:
   - `FRONTEND_URL` = la URL de Vercel (así solo tu página puede usar la API).
3. Guardá. Render reinicia los servicios solo.
4. Poné la URL de Vercel en el README, en "MVP online".

---

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| La primera vez tarda casi un minuto | En el plan gratis, Render "duerme" los servicios después de 15 minutos sin uso | Antes de la defensa, abrí los 3 `/health` para despertarlos |
| "No se pudo conectar con el servidor" | La URL de `config.js` está mal, o falta `/api` | Revisá el paso 3.1 |
| "Tu sesión venció" apenas iniciás sesión | `JWT_SECRET` distinto en usuarios y gateway | Copiá la misma clave en los dos |
| "El servicio no está disponible" | El gateway no llega a un servicio | Revisá `USUARIOS_URL` y `STATUS_URL`, y que el servicio esté en verde en Render |
| Error 403 "Acceso solo a través del API Gateway" | `GATEWAY_SECRET` distinto entre gateway y servicio | Copiá la misma clave en los tres |
| El servicio no arranca: "No se pudo conectar a la base de datos" | `MONGO_URI` mal escrita, o falta permitir el acceso en Network Access | Revisá el paso 1 |

---

## Para la demo en la defensa

- Despertá los servicios 5 minutos antes (abrí los 3 `/health`).
- Llevá 3 dispositivos o ventanas (normal, incógnito y otro navegador) con 3 usuarios ya creados, para que se vea el promedio.
- Si querés mostrarlo con menos personas, en Render podés poner `MIN_PARTICIPANTES=1` en **pp3-status**. Explicá que en uso real es 3 para cuidar el anonimato.
