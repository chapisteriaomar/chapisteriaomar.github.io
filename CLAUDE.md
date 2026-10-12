# chapisteriaomar.com — guía rápida para Claude

Web de **Chapistería Omar Solutions** (sacabollos/PDR, granizo, operativos móviles) para presentar a aseguradoras y compañías. Español rioplatense; el usuario quiere respuestas cortas y cambios mínimos.

## Cómo está armado
- **Hosting:** GitHub Pages, repo `chapisteriaomar/chapisteriaomar.github.io`, rama `main`. Push = deploy (1–2 min). Dominio `chapisteriaomar.com` (archivo `CNAME`) comprado en **Cloudflare**, DNS en modo "DNS only" apuntando a GitHub Pages.
- **Sitio estático sin build:** `index.html` + `css/v2.css` + `js/*.js` (módulos ES). Sin frameworks. Leaflet desde cdnjs para mapas, Lenis (scroll suave) desde jsdelivr.
- **Firebase** (proyecto `chapisteriaomarwebpage`): Firestore + Auth email/contraseña. **Sin Storage.** Config en `js/config.js`. Reglas en `firestore.rules` (lectura pública; escribe solo el email admin; `leads` se pueden crear desde el formulario).
- **Cloudinary** (cloud `uxarw5gf`, preset unsigned `chapisteriaomar`): fotos y videos. Se suben desde el panel directo al navegador; en Firestore se guarda solo la URL.
- **Mapas:** Esri (oscuro/claro) con OpenStreetMap de respaldo. CARTO no, porque pide API key.

## Archivos
- `js/v2.js` + `css/v2.css`: web pública (diseño oscuro con vidrio esmerilado, hero con video que se expande al scrollear, pasos en profundidad, pared de fotos, mapa, formulario). Efectos hechos a mano estilo React Bits (sin React).
- `js/i18n.js`: textos ES/EN. Los textos editados desde el panel pisan estos (Firestore `site/texts`).
- `js/admin.js` + `css/admin.css`: panel en `/#admin` (atajo `/admin`). Pestañas: Inicio, Textos de la web, Trabajos, Operativos, Consultas, Compañías, Referencias, Config.
- `js/editor.js`: edición visual de textos (la web dentro de un iframe en el panel, `?edit=1`).
- `data/import.json`: paquetes de contenido que el panel ofrece publicar con un clic ("Contenido nuevo para publicar"). Se marcan como hechos en `site/imports`.
- `reseña/` y `resena/`: redirigen a la reseña de Google, con su propia preview para compartir.
- `assets/`: logos SVG, ícono (la O de OMAR), imágenes de preview `og-home.jpg` y `og-resena2.jpg`.

## Firestore
`site/config` (WhatsApp, email, IG, taller, `bases[]` = operativos móviles en curso, `stats`, `aboutImg`, `mobileOff`) · `site/texts` · `site/imports` · `works` · `ops` · `leads` · `clients` · `reviews`.

## Reglas al cambiar cosas
- Al tocar JS o CSS, **subir el número `?v=N`** en `index.html` y en los imports de `js/v2.js` y `js/admin.js`. Si no, los navegadores siguen usando la versión vieja.
- Firestore y Cloudinary no se alcanzan desde el sandbox de Claude: probar con Playwright y stubs. El usuario publica contenido desde el panel.
- Commits con push directo a `main`.
