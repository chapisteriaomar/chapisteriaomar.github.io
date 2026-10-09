# chapisteriaomar.com — Chapistería Omar Solutions

Sitio estático (GitHub Pages) + Firebase (Firestore y Auth, sin Storage) + Cloudinary (fotos/videos).

## 1. GitHub Pages
1. Crear repo (ej. `chapisteriaomar/chapisteriaomar.github.io` o cualquier nombre) y subir **todo el contenido de esta carpeta** a la raíz.
2. Settings → Pages → Source: `Deploy from a branch` → `main` / `root`.
3. Custom domain: `chapisteriaomar.com` (el archivo `CNAME` ya está incluido). Activar **Enforce HTTPS** cuando aparezca.

## 2. Dominio en Cloudflare
DNS del dominio (nube **gris / DNS only** hasta que GitHub emita el certificado; después se puede pasar a naranja con SSL "Full"):

| Tipo  | Nombre | Valor |
|-------|--------|-------|
| A     | @      | 185.199.108.153 |
| A     | @      | 185.199.109.153 |
| A     | @      | 185.199.110.153 |
| A     | @      | 185.199.111.153 |
| CNAME | www    | `<usuario>.github.io` |

## 3. Firebase (proyecto nuevo)
1. Crear proyecto → agregar app **Web** → copiar la config en `js/config.js` (`FIREBASE_CONFIG`).
2. **Firestore Database** → crear (modo producción) → pestaña *Reglas* → pegar `firestore.rules` y poner el email admin.
3. **Authentication** → Email/Password → habilitar → *Users* → *Add user* (ese email + contraseña).
4. Authentication → Settings → **Authorized domains** → agregar `chapisteriaomar.com`.

## 4. Cloudinary (cuenta nueva)
1. Copiar el **Cloud name** en `js/config.js` (`CLOUDINARY.cloudName`).
2. Settings → Upload → **Add upload preset** → Signing mode: **Unsigned** → guardar y copiar el nombre en `uploadPreset`.

## 5. Uso
- Panel: `https://chapisteriaomar.com/#admin` (o el punto `·` del pie de página).
- **Trabajos**: fotos/videos sueltos o pares Antes/Después (con slider).
- **Operativos**: se marcan en el mapa; "en curso" titila en el mapa público.
- **Config**: WhatsApp, email, links de Maps (taller y base operativa temporal), cifras del inicio, foto de la empresa.
- **Consultas**: lo que envían las compañías desde el formulario.

Idioma ES/EN automático según el navegador, con selector arriba a la derecha.
