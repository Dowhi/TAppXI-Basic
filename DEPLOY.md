# Guía para Desplegar en GitHub Pages

## Pasos para subir tu aplicación a GitHub Pages

### 1. Preparar el repositorio en GitHub

1. Crea un nuevo repositorio en GitHub (si aún no lo tienes)
   - Ve a https://github.com/new
   - Nombra tu repositorio (ej: `tappxi-web-replica`)
   - Elige si será público o privado

2. Inicializa Git en tu proyecto local (si no lo has hecho):
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

### 2. Configurar Vite para GitHub Pages

**IMPORTANTE**: Edita `vite.config.ts` y ajusta la variable `base` según el nombre de tu repositorio:

```typescript
// Si tu repositorio se llama "tappxi-web-replica", usa:
const base = '/tappxi-web-replica/';

// Si tu repositorio está en la raíz de tu usuario (usuario.github.io), usa:
const base = '/';
```

### 3. Configurar GitHub Pages (Método 1: GitHub Actions - Recomendado)

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Pages**
3. En **Source**, selecciona **GitHub Actions**
4. El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente cuando hagas push a `main` o `master`

### 4. Hacer el despliegue

Cada vez que hagas push a la rama `main`, el workflow se ejecutará automáticamente:

```bash
git add .
git commit -m "Tu mensaje de commit"
git push origin main
```

### 5. Verificar el despliegue

1. Ve a la pestaña **Actions** en tu repositorio de GitHub
2. Espera a que el workflow termine (puede tardar 1-2 minutos)
3. Una vez completado, tu aplicación estará disponible en:
   - `https://TU-USUARIO.github.io/TU-REPOSITORIO/`

---

## Método Alternativo: Despliegue Manual (sin GitHub Actions)

Si prefieres desplegar manualmente:

1. Instala `gh-pages`:
```bash
npm install --save-dev gh-pages
```

2. Haz el build y despliega:
```bash
npm run build
npx gh-pages -d dist
```

3. Ve a **Settings** → **Pages** en GitHub
4. Selecciona la rama `gh-pages` como fuente
5. Tu aplicación estará disponible en unos minutos

---

## Solución de Problemas

### Los recursos no se cargan correctamente
- Verifica que la variable `base` en `vite.config.ts` coincida con el nombre de tu repositorio
- Asegúrate de que todas las rutas en tu código usen rutas relativas

### El workflow falla
- Verifica que el archivo `.github/workflows/deploy.yml` existe
- Revisa los logs en la pestaña **Actions** de GitHub

### La aplicación no aparece
- Espera 1-2 minutos después del despliegue
- Verifica que GitHub Pages esté habilitado en Settings → Pages
- Asegúrate de que el build se haya completado correctamente


