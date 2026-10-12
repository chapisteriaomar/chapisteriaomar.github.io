import { FIREBASE_CONFIG, DEFAULTS } from "./config.js?v=22";
import { I18N } from "./i18n.js?v=22";
// Textos originales (los editados desde el panel se guardan en Firestore: site/texts)
const BASE = JSON.parse(JSON.stringify(I18N));
function applyTexts(over) { for (const l of Object.keys(BASE)) I18N[l] = { ...BASE[l], ...(over?.[l] || {}) }; }

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const cld = (u, w = 1200) => u && u.includes("/upload/") && !u.includes("/upload/f_auto") ? u.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${w}/`) : u;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const editMode = new URLSearchParams(location.search).has("edit") && window.parent !== window;
const state = { cfg: { ...DEFAULTS }, works: [], ops: [], clients: [], reviews: [], lang: "es", db: null, fb: null };

/* ================= textos ES / EN ================= */
const t = k => I18N[state.lang][k] ?? I18N.es[k] ?? k;
function applyLang(lang) {
  state.lang = lang; document.documentElement.lang = lang;
  try { localStorage.setItem("lang", lang); } catch {}
  $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  $$(".lang button").forEach(b => b.classList.toggle("on", b.dataset.l === lang));
  $("#mq").innerHTML = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6].map(i => t("ticker." + i)).filter(Boolean).map(s => `<span>${esc(s)}</span>`).join("");
  splitHero(); renderStats();
}
$$(".lang button").forEach(b => b.onclick = () => applyLang(b.dataset.l));

// blur + stroke: parte los textos del video en palabras (no en el editor, que necesita el texto plano)
function splitHero() {
  if (editMode) return;
  let i = 0;
  $$("#xpText .fx").forEach(el => el.innerHTML = el.textContent.split(/(\s+)/).map(w => /^\s*$/.test(w) ? w : `<span class="bw" style="--i:${i++}">${esc(w)}</span>`).join(""));
}

/* ================= animated content ================= */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
const reveal = () => $$(".rv:not(.in)").forEach(el => io.observe(el));

/* ================= count up: "+1.500" cuenta de 0 a 1500 conservando lo de antes y después ================= */
function countUp(el) {
  const m = el.dataset.v.match(/^(\D*)(\d+(?:\.\d{3})*)(.*)$/); if (!m || calm) return;
  const end = +m[2].replace(/\./g, ""), dots = m[2].includes("."), t0 = performance.now();
  const step = now => {
    const p = Math.min((now - t0) / 1600, 1), v = Math.round(end * (1 - (1 - p) ** 3));
    el.textContent = m[1] + (dots ? v.toLocaleString("es-AR") : v) + m[3];
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } }), { threshold: .6 });
function renderStats() {
  const s = state.cfg.stats || {};
  $("#stats").innerHTML = [["years", "stat.years"], ["vehicles", "stat.vehicles"], ["provinces", "stat.provinces"], ["ops", "stat.ops"]].filter(([k]) => s[k])
    .map(([k, l]) => `<div class="stat glass rv in"><b data-v="${esc(s[k])}">${esc(s[k])}</b><span>${esc(t(l))}</span></div>`).join("");
  $$("#stats b").forEach(b => cio.observe(b));
}

/* ================= scroll: video que se expande, logo que se achica, pasos en profundidad ================= */
const xp = $("#top"), frame = $("#xpFrame"), txt = $("#xpText"), hdr = $("#hdr");
const dc = $("#operativo"), steps = $$("#dcStage li");
const prog = el => Math.min(Math.max(-el.getBoundingClientRect().top / (el.offsetHeight - innerHeight), 0), 1);
function onScroll() {
  const e = Math.min(prog(xp) / .7, 1), k = 1 - e, side = Math.max(16, innerWidth * .025);
  frame.style.setProperty("--t", 96 * k + "px"); frame.style.setProperty("--b", side * k + "px");
  frame.style.setProperty("--s", side * k + "px"); frame.style.setProperty("--r", 28 * k + "px");
  txt.style.opacity = Math.max(1 - e * 1.6, 0); txt.style.transform = `translateY(${-e * 70}px)`;
  hdr.style.setProperty("--lg", Math.max(1 - e * 2.5, 0));
  // depth carousel: el paso activo adelante, los demás se alejan en profundidad
  const f = prog(dc) * (steps.length - 1);
  steps.forEach((li, i) => {
    const d = i - f, a = Math.abs(d);
    li.style.transform = `translate(-50%,-50%) translateY(${d * 110}px) translateZ(${-a * 320}px) rotateX(${-d * 14}deg)`;
    li.style.opacity = Math.max(1 - a * .55, 0);
    li.style.filter = `blur(${Math.min(a * 4, 10)}px)`;
    li.style.zIndex = 10 - Math.round(a);
  });
}
addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
addEventListener("resize", onScroll);

/* ================= magnet: los botones principales se acercan al cursor ================= */
if (!calm && matchMedia("(pointer:fine)").matches) $$(".mag").forEach(el => {
  el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px,${(e.clientY - r.top - r.height / 2) * .4}px)`; });
  el.addEventListener("pointerleave", () => el.style.transform = "");
});

/* ================= spotlight en servicios ================= */
$$(".svc").forEach(el => el.onpointermove = e => { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", e.clientX - r.left + "px"); el.style.setProperty("--my", e.clientY - r.top + "px"); });

/* ================= contenido desde Firestore ================= */
const pic = (w, size, auto) => w.type === "video"
  ? `<video src="${esc(w.url)}${auto ? "" : "#t=0.5"}" muted playsinline preload="metadata"${auto ? " loop autoplay" : ""}></video>`
  : `<img src="${esc(cld(w.type === "ba" ? w.url2 : w.url, size))}" alt="${esc(w.title || "")}" loading="lazy">`;
function render() {
  const { cfg, works, clients, reviews } = state, media = works.filter(w => w.url), photos = media.filter(w => w.type !== "video");
  const hero = media.find(w => w.type === "video") || media.find(w => w.featured) || media[0];
  $("#heroBg").innerHTML = hero ? pic(hero, 1800, true) : "";
  renderStats();
  // drift wall: tres filas de fotos (repetidas para que el loop no tenga cortes)
  $("#trabajos").hidden = !media.length;
  if (media.length) {
    const rows = [0, 1, 2].map(r => media.filter((_, i) => i % 3 === r)).map((r, i) => r.length ? r : media);
    $("#dw").innerHTML = `<div class="dw-in">${rows.map((r, i) => { const fill = Array.from({ length: Math.max(2, Math.ceil(8 / r.length)) }, () => r).flat();
      return `<div class="dw-row${i % 2 ? " rev" : ""}" style="--d:${60 + i * 15}s">${[...fill, ...fill].map(w => `<div class="media" data-i="${media.indexOf(w)}">${pic(w, 600)}</div>`).join("")}</div>`; }).join("")}</div>`;
    $$("#dw .media").forEach(el => el.onclick = () => openLB(media[+el.dataset.i]));
  }
  $("#companias").hidden = !clients.length;
  $("#logos").innerHTML = clients.map(c => `<div class="glass">${c.logo ? `<img src="${esc(cld(c.logo, 300))}" alt="${esc(c.name)}" loading="lazy">` : esc(c.name)}</div>`).join("");
  $("#resenas").hidden = !reviews.length;
  $("#revs").innerHTML = reviews.map(r => `<blockquote class="rev glass rv"><p>“${esc(r.text)}”</p><b>${esc(r.name)}</b><small>${esc(r.role || "")}</small></blockquote>`).join("");
  // foto de "Empresa" del panel, o una de los trabajos
  const sw = photos[3], sImg = cfg.aboutImg || (sw && (sw.type === "ba" ? sw.url2 : sw.url));
  $("#sustImg").hidden = !sImg; $("#sust").classList.toggle("solo", !sImg);
  if (sImg) $("#sustImg").innerHTML = `<img src="${esc(cld(sImg, 1000))}" alt="" loading="lazy">`;
  const wa = String(cfg.whatsapp || "").replace(/\D/g, "");
  if (wa) { $("#waLink").href = `https://wa.me/${wa}?text=${encodeURIComponent("Hola, los contacto desde chapisteriaomar.com")}`; $("#waText").textContent = "+" + wa; $("#fWa").innerHTML = `<a href="https://wa.me/${wa}">+${wa}</a>`; }
  if (cfg.email) { $("#mailLink").href = "mailto:" + cfg.email; $("#mailText").textContent = cfg.email; $("#fMail").innerHTML = `<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>`; }
  $("#fIg").href = cfg.instagramUrl || `https://instagram.com/${cfg.instagram}`;
  renderMap(); reveal(); onScroll();
}

/* ================= visor ================= */
function openLB(w) {
  $("#lbIn").innerHTML = w.type === "video" ? `<video src="${esc(w.url)}" controls autoplay playsinline></video>` : `<img src="${esc(cld(w.type === "ba" ? w.url2 : w.url, 1800))}" alt="${esc(w.title || "")}">`;
  $("#lb").hidden = false; lenis?.stop();
}
const closeLB = () => { $("#lb").hidden = true; $("#lbIn").innerHTML = ""; lenis?.start(); };
$("#lbX").onclick = closeLB; $("#lb").onclick = e => { if (e.target.id === "lb") closeLB(); };
addEventListener("keydown", e => { if (e.key === "Escape" && !$("#lb").hidden) closeLB(); });

/* ================= mapa de operativos ================= */
let map, layer;
function renderMap() {
  if (!window.L) return;
  if (!map) {
    map = L.map("map", { scrollWheelZoom: false }).setView([-36.5, -63.5], 4);
    const tiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles &copy; Esri &middot; &copy; OpenStreetMap", maxZoom: 16 }).addTo(map);
    let fails = 0; tiles.on("tileerror", () => { if (++fails === 4) tiles.setUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"); });
    layer = L.layerGroup().addTo(map);
    map.on("click", () => map.scrollWheelZoom.enable());
  }
  layer.clearLayers();
  const ms = state.ops.filter(o => o.lat != null && o.lng != null).map(o => L.marker([o.lat, o.lng], { icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }) })
    .bindPopup(`<b>${esc(o.name)}</b>${esc([o.province, o.year].filter(Boolean).join(" · "))}${o.units ? ` · ${esc(o.units)} ${esc(t("map.units"))}` : ""}`).addTo(layer));
  if (ms.length) map.fitBounds(L.featureGroup(ms).getBounds().pad(.35), { maxZoom: 7 });
}

/* ================= formulario ================= */
$("#leadForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, msg = $("#formMsg"), btn = f.querySelector("button[type=submit]");
  if (f.website.value) return; // honeypot
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(f)); delete data.website;
  btn.disabled = true; btn.textContent = t("f.sending"); msg.className = "form-msg full"; msg.textContent = "";
  try {
    if (!state.db) throw new Error("no-db");
    const { fs } = state.fb;
    await fs.addDoc(fs.collection(state.db, "leads"), { ...data, lang: state.lang, createdAt: fs.serverTimestamp(), read: false });
    msg.textContent = t("f.ok"); msg.classList.add("ok"); f.reset();
  } catch (err) {
    console.warn(err);
    // respaldo: abrir WhatsApp con los datos
    const wa = String(state.cfg.whatsapp || "").replace(/\D/g, "");
    if (wa) open(`https://wa.me/${wa}?text=${encodeURIComponent(Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"))}`, "_blank");
    msg.textContent = t("f.err"); msg.classList.add("err");
  }
  btn.disabled = false; btn.textContent = t("f.send");
});

/* ================= Firebase ================= */
const FB = "https://www.gstatic.com/firebasejs/10.12.4/";
let fbInit = null;
function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey) return Promise.resolve(null);
  return fbInit ||= (async () => {
    const [{ initializeApp, getApps, getApp }, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js")]);
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    state.fb = { app, fs }; state.db = fs.getFirestore(app);
    return state.db;
  })();
}
async function loadData() {
  const db = await initFirebase().catch(e => (console.warn("Firebase:", e), null));
  if (!db) return;
  const { fs } = state.fb;
  const get = async name => {
    try { return (await fs.getDocs(fs.query(fs.collection(db, name), fs.orderBy("createdAt", "desc")))).docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (e) { console.warn(name, e); return []; }
  };
  const [cfgSnap, works, ops, clients, reviews, txSnap] = await Promise.all([
    fs.getDoc(fs.doc(db, "site", "config")).catch(() => null), get("works"), get("ops"), get("clients"), get("reviews"),
    fs.getDoc(fs.doc(db, "site", "texts")).catch(() => null)
  ]);
  if (cfgSnap?.exists()) { const d = cfgSnap.data(); state.cfg = { ...DEFAULTS, ...d, stats: { ...DEFAULTS.stats, ...(d.stats || {}) } }; }
  Object.assign(state, { works, ops, clients, reviews });
  if (txSnap?.exists()) applyTexts(txSnap.data());
  applyLang(state.lang); render();
}

/* ================= panel admin (carga diferida) ================= */
async function checkAdmin() {
  if (location.hash !== "#admin") return;
  if (!FIREBASE_CONFIG.apiKey) { alert("Falta completar FIREBASE_CONFIG en js/config.js"); return; }
  try {
    await initFirebase();
    const m = await import("./admin.js?v=22");
    await m.openAdmin(state, { reload: loadData, cld, esc });
  } catch (er) {
    console.error(er);
    alert("No se pudo abrir el panel: " + (er?.message || er));
  }
}
addEventListener("hashchange", checkAdmin);

/* ================= Lenis (si el CDN falla, queda el scroll normal) ================= */
let lenis = null;
if (!editMode && !calm)
  import("https://cdn.jsdelivr.net/npm/lenis@1.3.25/dist/lenis.mjs").then(m => lenis = new m.default({ autoRaf: true, anchors: true })).catch(console.warn);

/* ================= init ================= */
$("#yr").textContent = new Date().getFullYear();
let saved = "es"; try { saved = localStorage.getItem("lang") || (navigator.language?.startsWith("es") ? "es" : "en"); } catch {}
applyLang(saved); render();
loadData().catch(er => console.error("Carga de datos:", er)).then(() => editMode
  ? import("./editor.js?v=22").then(m => m.initEditor({ state, t, I18N, BASE, applyLang }))
  : checkAdmin());
