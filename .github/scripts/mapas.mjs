// Arma chapisteriaomar.com/map1…map30 desde map-plantilla.html: el título de la vista previa es la dirección del taller
// de ese operativo (la carga cada uno en Desabollito → Operativo → Mensajes al cliente). Sin dirección: "Cómo llegar al taller".
import fs from "fs";
const TOTAL = 30;
const plantilla = fs.readFileSync("map-plantilla.html", "utf8");
const r = await fetch("https://desabollito-bot.desabollito.workers.dev/mapas");
if (!r.ok) throw new Error("El bot no respondió: " + r.status);
const dir = new Map((await r.json()).map(x => [Number(x.n), String(x.direccion || "").trim()]));
const esc = t => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
for (let n = 1; n <= TOTAL; n++) {
  fs.mkdirSync(`map${n}`, { recursive: true });
  fs.writeFileSync(`map${n}/index.html`, plantilla.replace(/__N__/g, String(n)).replace(/__TITULO__/g, esc(dir.get(n) || "Cómo llegar al taller")));
}
console.log("mapas:", [...dir].map(([n, d]) => `${n}=${d}`).join(" | ") || "ninguno con número");
