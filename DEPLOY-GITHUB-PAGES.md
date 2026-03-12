# Desplegar Demet Toreo PWA en GitHub Pages

Sigue estos pasos para publicar la app en **GitHub Pages**. La URL quedará así:  
`https://<tu-usuario>.github.io/demet_pwa/mapa.html`

---

## 1. Crear el repositorio en GitHub

1. Entra en [github.com](https://github.com) e inicia sesión.
2. Clic en **"+"** (arriba derecha) → **"New repository"**.
3. Configura:
   - **Repository name:** `demet_pwa` (o el nombre que quieras; la URL usará este nombre).
   - **Description:** opcional, ej. "Mapa de edificios Demet Toreo".
   - **Public**.
   - No marques "Add a README" (si ya tienes archivos locales).
4. Clic en **"Create repository"**.

---

## 2. Conectar tu carpeta local con GitHub

Abre la terminal en la carpeta del proyecto (`demet_pwa`) y ejecuta:

```bash
cd /Users/gamasoft/Documents/cursor_proys/demet_pwa
```

Si **aún no** has usado Git en esta carpeta:

```bash
git init
git add .
git commit -m "Primera versión: mapa edificios y PWA"
```

Si **ya** tienes un repo (por ejemplo con `origin` apuntando a otro sitio), comprueba la remota:

```bash
git remote -v
```

- Si no hay `origin` o quieres usar tu nuevo repo:

```bash
git remote remove origin
git remote add origin https://github.com/<TU-USUARIO>/demet_pwa.git
```

Sustituye `<TU-USUARIO>` por tu nombre de usuario de GitHub.

---

## 3. Subir el código

```bash
git add .
git status
git commit -m "Preparado para GitHub Pages"
git branch -M main
git push -u origin main
```

Si GitHub te pide autenticación, usa tu usuario y un **Personal Access Token** (no la contraseña) o configura SSH.

---

## 4. Activar GitHub Pages

1. En GitHub, abre el repositorio **demet_pwa**.
2. Ve a **Settings** (del repo).
3. En el menú izquierdo, **Pages**.
4. En **"Build and deployment"**:
   - **Source:** "Deploy from a branch".
   - **Branch:** `main` (o la rama donde hayas subido los archivos).
   - **Folder:** `/ (root)`.
5. Clic en **Save**.

---

## 5. Esperar y probar

- GitHub tarda 1–2 minutos en publicar.
- La URL de la app será:
  - **Página del mapa:**  
    `https://<TU-USUARIO>.github.io/demet_pwa/mapa.html`
  - **Raíz del sitio:**  
    `https://<TU-USUARIO>.github.io/demet_pwa/`

Abre esa URL en el navegador. Si ves el mapa, el despliegue está correcto. La PWA (instalar, offline) también funcionará en esa URL.

---

## Resumen de URLs

| Dónde              | URL |
|--------------------|-----|
| Repositorio        | `https://github.com/<TU-USUARIO>/demet_pwa` |
| Mapa (app)         | `https://<TU-USUARIO>.github.io/demet_pwa/mapa.html` |
| PWA instalable     | Misma URL; el navegador ofrecerá "Instalar". |

---

## Si cambias el nombre del repositorio

Si en el paso 1 usas otro nombre (por ejemplo `mapa-toreo`), la URL será:

`https://<TU-USUARIO>.github.io/mapa-toreo/mapa.html`

El proyecto ya está preparado para funcionar en cualquier subruta (raíz o `/demet_pwa/`, etc.) gracias a las rutas relativas en `manifest.json` y al Service Worker.
