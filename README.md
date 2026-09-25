# Mariscos El Gordo — Módulo de Autenticación y Registro de Insumos

Módulo básico del sistema de inventario multi-sucursal: autenticación con JWT,
roles (`admin` / `encargado`) y CRUD de insumos, con pruebas unitarias (Jest)
y pipeline de CI/CD (GitHub Actions).

## Requisitos
- Node.js 18 o superior
- npm

## Instalación y ejecución local

```bash
npm install
npm start
```

El servidor corre en `http://localhost:3000`.

Usuario administrador ya creado (sembrado) para pruebas:
- **usuario:** `admin`
- **contraseña:** `admin123`

## Endpoints principales

| Método | Ruta                     | Rol requerido       | Descripción                          |
|--------|--------------------------|----------------------|---------------------------------------|
| POST   | /api/auth/login          | público              | Inicia sesión, regresa un JWT         |
| POST   | /api/auth/register       | admin                | Crea un nuevo usuario (encargado)     |
| GET    | /api/insumos             | admin o encargado    | Lista todos los insumos               |
| GET    | /api/insumos/:id         | admin o encargado    | Consulta un insumo                    |
| POST   | /api/insumos             | admin                | Da de alta un nuevo insumo            |
| PUT    | /api/insumos/:id/stock   | admin o encargado    | Actualiza el stock (entrada/salida)   |
| DELETE | /api/insumos/:id         | admin                | Elimina un insumo                     |

Ejemplo de login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Pruebas unitarias y cobertura

```bash
npm test
```

Esto corre Jest con Supertest y genera un reporte de cobertura en `coverage/`.
Resultado obtenido en este proyecto: **26 pruebas, 97.1% de cobertura**
(umbral mínimo exigido: 80%). El reporte completo en texto está en
`tests/coverage-report.txt` y el reporte HTML navegable en `coverage/lcov-report/index.html`
(se genera al correr `npm test`, no se sube al repo).

## Pipeline de CI/CD (GitHub Actions)

El archivo `.github/workflows/ci-cd.yml` define 4 jobs que corren automáticamente
al hacer `push` a `main`:

1. **test** — instala dependencias y corre `npm test` (falla el pipeline si la
   cobertura baja de 80%).
2. **sonarcloud** — analiza la calidad del código con SonarCloud (requiere el
   secreto `SONAR_TOKEN`, ver abajo).
3. **deploy** — dispara un despliegue automático a un entorno de prueba en
   Render (requiere el secreto `RENDER_DEPLOY_HOOK`).
4. **zap-scan** — corre un escaneo baseline de OWASP ZAP contra la URL del
   entorno de prueba ya desplegado.

### Cómo dejarlo funcionando en tu propio repositorio

1. Sube este código a un repositorio de GitHub (ver sección siguiente).
2. Crea un servicio gratuito en [Render](https://render.com):
   - New > Web Service > conecta tu repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Copia la URL pública que te da Render (ej. `https://mariscos-inventario.onrender.com`).
   - En Settings > Deploy Hook, copia la URL del hook.
3. En GitHub, ve a tu repo > **Settings > Secrets and variables > Actions**:
   - Agrega el secreto `RENDER_DEPLOY_HOOK` con la URL del paso anterior.
   - Agrega una variable `TARGET_URL` (pestaña *Variables*) con la URL pública de tu app en Render.
4. (Opcional, para SonarCloud) Crea una cuenta gratuita en
   [sonarcloud.io](https://sonarcloud.io), importa el repo, copia tu token y
   agrégalo como secreto `SONAR_TOKEN`. Edita `sonar-project.properties` y
   pon tu organización real.
5. Haz `git push` a `main` y ve la pestaña **Actions** de tu repo para ver los
   4 jobs corriendo y sus reportes.

## Cómo subir este proyecto a GitHub (paso a paso)

```bash
cd mariscos-inventario
git init
git add .
git commit -m "Modulo de autenticacion JWT y registro de insumos"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mariscos-inventario.git
git push -u origin main
```

(Crea antes el repositorio vacío en github.com con el botón "New repository",
sin marcar ningún archivo inicial, y copia la URL que te da GitHub para el
comando `git remote add origin ...`.)

## Cómo correr OWASP ZAP manualmente (en tu computadora)

1. Descarga OWASP ZAP: https://www.zaproxy.org/download/
2. Corre la app localmente: `npm start` (queda en `http://localhost:3000`).
3. Abre ZAP > pestaña "Quick Start" > **Automated Scan**.
4. En "URL to attack" pon `http://localhost:3000`.
5. Dale "Attack". ZAP va a rastrear las rutas y buscar vulnerabilidades
   comunes (XSS, inyección SQL, cabeceras de seguridad faltantes, etc.).
6. Al terminar, ve a **Report > Generate Report** y expórtalo como HTML o PDF;
   ese es el reporte que se entrega.
   Nota: como esta API no tiene formularios HTML ni base de datos SQL real,
   es esperable que ZAP no encuentre XSS/SQLi (no hay superficie de ataque
   para eso), pero sí puede marcar advertencias sobre cabeceras de seguridad
   faltantes (por ejemplo `X-Content-Type-Options`), que puedes documentar y
   corregir agregando el paquete `helmet` a la app como mejora.

## Cómo correr SonarQube manualmente (en tu computadora)

**Opción A — SonarCloud (más fácil, no requiere instalar nada):**
1. Crea cuenta gratuita en https://sonarcloud.io con tu cuenta de GitHub.
2. Importa tu repositorio.
3. Sigue el asistente: te va a dar un token y el análisis puede correr
   directo en GitHub Actions (ya está configurado en `ci-cd.yml`, solo falta
   el secreto `SONAR_TOKEN`).
4. Los resultados (deuda técnica, code smells, bugs, vulnerabilidades) se ven
   en el dashboard de sonarcloud.io.

**Opción B — SonarQube local con Docker:**
```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community
```
1. Abre `http://localhost:9000` (usuario/contraseña por defecto: `admin`/`admin`).
2. Crea un proyecto nuevo y genera un token.
3. Instala el scanner: `npm install -g sonarqube-scanner`
4. Corre: `sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.login=TU_TOKEN`
5. Revisa el dashboard: deuda técnica, code smells, duplicación de código, etc.

## Estructura del proyecto

```
mariscos-inventario/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── data/
│   └── utils/
├── tests/
├── .github/workflows/ci-cd.yml
├── sonar-project.properties
└── package.json
```
