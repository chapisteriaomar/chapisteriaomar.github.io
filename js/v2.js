import { FIREBASE_CONFIG, DEFAULTS } from "./config.js?v=23";
import { I18N } from "./i18n.js?v=28";
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
  $$(".chips input").forEach(r => r.value = r.nextElementSibling.textContent);
  splitHero(); splitReveal(); renderStats();
}
$$(".lang button").forEach(b => b.onclick = () => applyLang(b.dataset.l));

/* ================= modo claro / oscuro ================= */
const isLight = () => document.documentElement.dataset.theme === "light";
$("#themeBtn").onclick = () => {
  const next = isLight() ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
  map?.setStyle(mapStyle());
};

// blur text: parte los textos del video en palabras (no en el editor, que necesita el texto plano)
function splitHero() {
  if (editMode) return;
  let i = 0;
  $$("#xpText .fx").forEach(el => el.innerHTML = el.textContent.split(/(\s+)/).map(w => /^\s*$/.test(w) ? w : `<span class="bw" style="--i:${i++}">${esc(w)}</span>`).join(""));
}
// scroll reveal: los títulos de sección se parten en palabras que se aclaran al bajar
function splitReveal() {
  if (editMode || calm) return;
  $$(".h2").forEach(el => { el.classList.add("sr"); el.innerHTML = el.textContent.split(/(\s+)/).map(w => /^\s*$/.test(w) ? w : `<span class="sw">${esc(w)}</span>`).join(""); });
}
function updReveal() {
  $$(".sr").forEach(el => {
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const ws = el.children, p = Math.min(Math.max((innerHeight - r.top) / (innerHeight * .55), 0), 1) * (ws.length + 1);
    el.style.transform = `rotate(${(1 - Math.min(p / ws.length, 1)) * 3}deg)`;
    for (let i = 0; i < ws.length; i++) { const w = Math.min(Math.max(p - i, 0), 1); ws[i].style.opacity = .12 + .88 * w; ws[i].style.filter = `blur(${(1 - w) * 4}px)`; }
  });
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
// counter: cada dígito es un rodillo 0-9 que gira hasta su valor
function roll(el) {
  if (calm) return;
  el.innerHTML = [...el.dataset.v].map(c => /\d/.test(c) ? `<span class="roll"><span>${"0123456789".split("").map(d => `<i>${d}</i>`).join("")}</span></span>` : esc(c)).join("");
  const ds = [...el.dataset.v].filter(c => /\d/.test(c));
  requestAnimationFrame(() => requestAnimationFrame(() => $$(".roll>span", el).forEach((s, i) => s.style.transform = `translateY(-${ds[i]}em)`)));
}
const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { (state.cfg.rolling ? roll : countUp)(e.target); cio.unobserve(e.target); } }), { threshold: .6 });
function renderStats() {
  const s = state.cfg.stats || {};
  $("#stats").innerHTML = [["years", "stat.years"], ["vehicles", "stat.vehicles"], ["provinces", "stat.provinces"], ["ops", "stat.ops"]].filter(([k]) => s[k])
    .map(([k, l]) => `<div class="stat glass rv in"><b data-v="${esc(s[k])}">${esc(s[k])}</b><span>${esc(t(l))}</span></div>`).join("");
  $$("#stats b").forEach(b => cio.observe(b));
}

/* ================= scroll: video que se expande, logo que se achica, pasos en profundidad ================= */
const xp = $("#top"), frame = $("#xpFrame"), txt = $("#xpText"), hdr = $("#hdr"), gb = $(".gblur");
const dc = $("#operativo"), steps = $$("#dcStage li");
const prog = el => Math.min(Math.max(-el.getBoundingClientRect().top / (el.offsetHeight - innerHeight), 0), 1);
function onScroll() {
  const e = Math.min(prog(xp) / .7, 1), k = 1 - e, side = Math.max(16, innerWidth * .025);
  frame.style.setProperty("--t", 96 * k + "px"); frame.style.setProperty("--b", side * k + "px");
  frame.style.setProperty("--s", side * k + "px"); frame.style.setProperty("--r", 28 * k + "px");
  txt.style.opacity = Math.max(1 - e * 1.6, 0); txt.style.transform = `translateY(${-e * 70}px)`;
  hdr.style.setProperty("--lg", Math.max(1 - e * 2.5, 0));
  // barra de arriba: 0% arriba de todo, 100% al llegar a Contacto
  hdr.style.setProperty("--pg", Math.min(Math.max(scrollY / Math.max($("#contacto").offsetTop - innerHeight * .4, 1), 0), 1));
  // el desenfoque de abajo se apaga al final para no tapar el pie
  gb.style.opacity = Math.min((document.documentElement.scrollHeight - innerHeight - scrollY) / 160, 1);
  // depth carousel: el paso activo adelante, los demás se alejan en profundidad
  const f = prog(dc) * (steps.length - 1);
  steps.forEach((li, i) => {
    const d = i - f, a = Math.abs(d);
    li.style.transform = `translate(-50%,-50%) translateY(${d * 110}px) translateZ(${-a * 320}px) rotateX(${-d * 14}deg)`;
    li.style.opacity = Math.max(1 - a * .55, 0);
    li.style.filter = `blur(${Math.min(a * 4, 10)}px)`;
    li.style.zIndex = 10 - Math.round(a);
  });
  updReveal();
}
addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
addEventListener("resize", onScroll);

/* ================= sonidos suaves (sintetizados, sin archivos); se apagan desde el panel ================= */
let ac;
function sfx(kind) {
  if (state.cfg.sounds === false || editMode) return;
  try {
    ac ||= new AudioContext(); if (ac.state === "suspended") ac.resume();
    const now = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
    const tone = (f, t0, dur, vol, type = "sine") => {
      const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.value = f;
      v.gain.setValueAtTime(0, now + t0); v.gain.linearRampToValueAtTime(vol, now + t0 + .02); v.gain.exponentialRampToValueAtTime(.0001, now + t0 + dur);
      o.connect(v).connect(g); o.start(now + t0); o.stop(now + t0 + dur);
    };
    if (kind === "open") { // soplido: ruido filtrado que sube, como cuando se abre algo
      const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const fl = ac.createBiquadFilter(); fl.type = "bandpass"; fl.Q.value = .8;
      fl.frequency.setValueAtTime(300, now); fl.frequency.exponentialRampToValueAtTime(2400, now + 1);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.06, now + .35); g.gain.exponentialRampToValueAtTime(.0001, now + 1.15);
      n.buffer = b; n.connect(fl).connect(g); n.start(now);
    }
    if (kind === "tick") tone(1400, 0, .06, .05, "triangle");
    if (kind === "done") { tone(659, 0, .5, .08); tone(988, .12, .7, .07); }
    if (kind === "err") tone(220, 0, .3, .07, "triangle");
  } catch {}
}

/* ================= magnet: los botones principales se acercan al cursor ================= */
if (!calm && matchMedia("(pointer:fine)").matches) $$(".mag").forEach(el => {
  el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px,${(e.clientY - r.top - r.height / 2) * .4}px)`; });
  el.addEventListener("pointerleave", () => el.style.transform = "");
});

/* ================= contenido desde Firestore ================= */
const pic = (w, size, auto) => w.type === "video"
  ? `<video src="${esc(w.url)}${auto ? "" : "#t=0.5"}" muted playsinline preload="metadata"${auto ? " loop autoplay" : ""}></video>`
  : `<img src="${esc(cld(w.type === "ba" ? w.url2 : w.url, size))}" alt="${esc(w.title || "")}" loading="lazy">`;
function render() {
  const { cfg, works, clients, reviews } = state, media = works.filter(w => w.url), photos = media.filter(w => w.type !== "video");
  const hero = media.find(w => w.type === "video") || media.find(w => w.featured) || media[0];
  $("#heroBg").innerHTML = hero ? pic(hero, 1800, true) : "";
  renderStats();
  // drift wall: tres filas de fotos repetidas para que el loop no corte (sin videos: decenas repetidos traban la página)
  $("#trabajos").hidden = !photos.length;
  if (photos.length) {
    const rows = [0, 1, 2].map(r => photos.filter((_, i) => i % 3 === r)).map(r => r.length ? r : photos);
    $("#dw").innerHTML = `<div class="dw-in">${rows.map((r, i) => { const fill = Array.from({ length: Math.max(2, Math.ceil(8 / r.length)) }, () => r).flat();
      return `<div class="dw-row${i % 2 ? " rev" : ""}" style="--d:${60 + i * 15}s">${[...fill, ...fill].map(w => `<div class="media" data-i="${photos.indexOf(w)}">${pic(w, 600)}</div>`).join("")}</div>`; }).join("")}</div>`;
    $$("#dw .media").forEach(el => el.onclick = () => openLB(photos[+el.dataset.i]));
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
  renderLocs(); renderMap(); reveal(); onScroll();
}

/* ================= ubicaciones: taller + operativos en curso, en carrusel con profundidad ================= */
const cf = $("#cf");
function renderLocs() {
  const c = state.cfg, tag = k => `<span class="loc-tag"><i></i><span data-i18n="${k}">${esc(t(k))}</span></span>`;
  // taller y operativos en curso: al tocar se dan vuelta preguntando "¿Ir a la ubicación?"; el segundo toque abre Google Maps
  const flip = (cls, name, desc, url) => `<div class="loc ${cls}" role="button" tabindex="0" data-url="${esc(url || "")}"><div class="loc-in">
    <div class="loc-f glass">${tag(cls === "main" ? "loc.main" : "loc.base")}<h3>${name}</h3><p>${desc}</p></div>
    <div class="loc-b glass"><b data-i18n="loc.ask">${esc(t("loc.ask"))}</b><small data-i18n="loc.again">${esc(t("loc.again"))}</small></div></div></div>`;
  // operativos terminados (los del mapa): al tocarlos, el mapa vuela hasta ese punto
  const past = state.ops.filter(o => !o.live && o.lat != null && o.lng != null);
  cf.innerHTML = flip("main", esc(c.tallerNombre || "Chapistería Omar"), `<span data-i18n="loc.mainD">${esc(t("loc.mainD"))}</span>`, c.tallerMaps)
    + (c.bases || []).filter(b => b.nombre).map(b => flip("live", esc(b.nombre), b.detalle ? esc(b.detalle) : `<span data-i18n="loc.baseD">${esc(t("loc.baseD"))}</span>`, b.maps)).join("")
    + past.map(o => `<button class="loc past" data-op="${state.ops.indexOf(o)}"><div class="loc-in"><div class="loc-f glass">${tag("loc.past")}<h3>${esc(o.name)}</h3><p>${esc([o.province, o.year].filter(Boolean).join(" · "))}${o.units ? ` · ${esc(o.units)} <span data-i18n="map.units">${esc(t("map.units"))}</span>` : ""}</p></div></div></button>`).join("");
  $$("[data-op]", cf).forEach(b => b.onclick = () => {
    const m = pinByOp.get(state.ops[+b.dataset.op]); if (!m) return;
    map.flyTo({ center: m.getLngLat(), zoom: 8, pitch: 50, duration: calm ? 0 : 1800 });
    if (!m.getPopup().isOpen()) m.togglePopup();
  });
  $$("[data-url]", cf).forEach(el => {
    const go = () => {
      if (!el.classList.contains("flip")) { $$(".loc.flip", cf).forEach(x => x.classList.remove("flip")); el.classList.add("flip"); sfx("tick"); return; }
      el.classList.remove("flip"); if (el.dataset.url) open(el.dataset.url, "_blank", "noopener");
    };
    el.onclick = go;
    el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  coverflow();
}
// tocar fuera de una tarjeta dada vuelta la vuelve a su frente
addEventListener("pointerdown", e => { if (!e.target.closest?.(".loc")) $$(".loc.flip", cf).forEach(x => x.classList.remove("flip")); });
// cada tarjeta gira y se aleja según su distancia al centro
function coverflow() {
  const mid = cf.scrollLeft + cf.clientWidth / 2;
  $$(".loc", cf).forEach(el => {
    const d = Math.max(-2, Math.min(2, (el.offsetLeft + el.offsetWidth / 2 - mid) / (el.offsetWidth + 20))), a = Math.abs(d);
    el.style.transform = `rotateY(${-d * 32}deg) translateZ(${-a * 130}px) scale(${1 - a * .06})`;
    el.style.opacity = 1 - a * .35;
  });
}
cf.addEventListener("scroll", () => requestAnimationFrame(coverflow), { passive: true });
addEventListener("resize", coverflow);
$$(".cf-nav button").forEach(b => b.onclick = () => cf.scrollBy({ left: b.dataset.d * ($(".loc", cf)?.offsetWidth + 20 || 300), behavior: "smooth" }));

/* ================= visor ================= */
function openLB(w) {
  $("#lbIn").innerHTML = w.type === "video" ? `<video src="${esc(w.url)}" controls autoplay playsinline></video>` : `<img src="${esc(cld(w.type === "ba" ? w.url2 : w.url, 1800))}" alt="${esc(w.title || "")}">`;
  $("#lb").hidden = false; lenis?.stop();
}
const closeLB = () => { $("#lb").hidden = true; $("#lbIn").innerHTML = ""; lenis?.start(); };
$("#lbX").onclick = closeLB; $("#lb").onclick = e => { if (e.target.id === "lb") closeLB(); };
addEventListener("keydown", e => { if (e.key === "Escape" && !$("#lb").hidden) closeLB(); });

/* ================= mapa de operativos (MapLibre, vectorial y con animación) ================= */
// estilos de OpenFreeMap: gratis y sin API key
let map, pins = [];
const pinByOp = new Map();
const mapStyle = () => `https://tiles.openfreemap.org/styles/${isLight() ? "positron" : "dark"}`;
const loadScript = (js, css) => new Promise((ok, ko) => {
  document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${css}">`);
  const s = document.createElement("script"); s.src = js; s.onload = ok; s.onerror = ko; document.head.append(s);
});
// se baja recién cuando el mapa está por aparecer, así la entrada a la web no se traba
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return; o.disconnect();
  loadScript("https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js", "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css").then(renderMap, console.warn);
}, { rootMargin: "800px" }).observe($("#map"));
// el panel admin sigue usando Leaflet para cargar operativos
let leafP;
const loadLeaflet = () => leafP ||= loadScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js", "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
function renderMap() {
  if (!window.maplibregl) return;
  if (!map) {
    // arranca lejos y vuela hasta los operativos cuando el mapa entra en pantalla
    map = new maplibregl.Map({ container: "map", style: mapStyle(), center: [-63.5, -30], zoom: 1.6, attributionControl: { compact: true }, cooperativeGestures: true });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); fly(); } }, { threshold: .5 }).observe($("#map"));
  }
  pins.forEach(p => p.remove()); pinByOp.clear();
  pins = state.ops.filter(o => o.lat != null && o.lng != null).map(o => {
    const el = document.createElement("div"); el.className = o.live ? "pin live" : "pin";
    const m = new maplibregl.Marker({ element: el }).setLngLat([o.lng, o.lat])
      .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<b>${esc(o.name)}</b>${esc([o.province, o.year].filter(Boolean).join(" · "))}${o.units ? ` · ${esc(o.units)} ${esc(t("map.units"))}` : ""}`)).addTo(map);
    pinByOp.set(o, m); return m;
  });
}
function fly() {
  if (!pins.length) return map.flyTo({ center: [-63.5, -36.5], zoom: 3.6, pitch: 40, duration: calm ? 0 : 2600 });
  const b = new maplibregl.LngLatBounds(); pins.forEach(p => b.extend(p.getLngLat()));
  map.fitBounds(b, { padding: 70, maxZoom: 6.5, pitch: 40, bearing: -8, duration: calm ? 0 : 2600 });
}
/* ================= formulario ================= */
// slide commit: se arrastra la manija hasta el final para enviar; con teclado, Enter envía directo
const sc = $("#sc"), scH = $("#scH");
const scMax = () => sc.clientWidth - scH.offsetWidth - 10;
const scSet = r => { sc.style.setProperty("--x", r); sc.style.setProperty("--hx", r * scMax() + "px"); };
let dragX = null;
scH.addEventListener("pointerdown", e => { if (sc.matches(".busy,.done")) return; dragX = e.clientX; sc.classList.add("drag"); scH.setPointerCapture(e.pointerId); scH.style.transform = ""; });
scH.addEventListener("pointermove", e => { if (dragX != null) scSet(Math.min(Math.max((e.clientX - dragX) / scMax(), 0), 1)); });
scH.addEventListener("pointerup", () => {
  if (dragX == null) return; dragX = null; sc.classList.remove("drag");
  if (+sc.style.getPropertyValue("--x") > .85) { scSet(1); sfx("tick"); $("#leadForm").requestSubmit(); } else scSet(0);
});
// un clic de mouse o dedo sin arrastrar no envía; Enter (detail 0) sí
scH.addEventListener("click", e => { if (e.detail > 0) e.preventDefault(); });
$$(".chips input").forEach(r => r.addEventListener("change", () => sfx("tick")));

$("#leadForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, msg = $("#formMsg");
  if (sc.matches(".busy,.done")) return;
  if (f.website.value) return; // honeypot
  if (!f.checkValidity()) { scSet(0); f.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(f)); delete data.website;
  scSet(1); sc.classList.add("busy"); msg.className = "form-msg full"; msg.textContent = "";
  try {
    if (!state.db) throw new Error("no-db");
    const { fs } = state.fb;
    await fs.addDoc(fs.collection(state.db, "leads"), { ...data, lang: state.lang, createdAt: fs.serverTimestamp(), read: false });
    sc.classList.replace("busy", "done"); sfx("done"); msg.textContent = t("f.ok"); msg.classList.add("ok"); f.reset();
  } catch (err) {
    console.warn(err);
    // respaldo: abrir WhatsApp con los datos
    const wa = String(state.cfg.whatsapp || "").replace(/\D/g, "");
    if (wa) open(`https://wa.me/${wa}?text=${encodeURIComponent(Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"))}`, "_blank");
    sc.classList.remove("busy"); scSet(0); sfx("err"); msg.textContent = t("f.err"); msg.classList.add("err");
  }
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
  // opciones del panel: sin botón de idioma la web queda en español; sin botón de tema, en oscuro
  const { showLang, showTheme, showKicker, dcLen } = state.cfg;
  $(".lang").hidden = showLang === false; $("#themeBtn").hidden = showTheme === false;
  $("#xpText .kicker").hidden = showKicker === false;
  if (dcLen) dc.style.setProperty("--dcl", dcLen + "vh");
  if (showLang === false) state.lang = "es";
  if (showTheme === false) delete document.documentElement.dataset.theme;
  Object.assign(state, { works, ops, clients, reviews });
  if (txSnap?.exists()) applyTexts(txSnap.data());
  applyLang(state.lang); render();
}

/* ================= panel admin (carga diferida) ================= */
async function checkAdmin() {
  if (location.hash !== "#admin") return;
  if (!FIREBASE_CONFIG.apiKey) { alert("Falta completar FIREBASE_CONFIG en js/config.js"); return; }
  try {
    await Promise.all([initFirebase(), loadLeaflet().catch(console.warn)]); // el panel usa Leaflet para los operativos
    const m = await import("./admin.js?v=30");
    await m.openAdmin(state, { reload: loadData, cld, esc });
  } catch (er) {
    console.error(er);
    alert("No se pudo abrir el panel: " + (er?.message || er));
  }
}
addEventListener("hashchange", checkAdmin);

/* ================= Lenis (si el CDN falla, queda el scroll normal) ================= */
let lenis = null;
const html = document.documentElement;
if (!editMode && !calm)
  import("https://cdn.jsdelivr.net/npm/lenis@1.3.25/dist/lenis.mjs").then(m => { lenis = new m.default({ autoRaf: true, anchors: true }); if (/intro|opening/.test(html.className)) lenis.stop(); }).catch(console.warn);

/* ================= intro: aurora hasta el primer scroll; ahí la web se abre desde el medio ================= */
if (html.classList.contains("intro")) {
  const ov = $("#intro"), evs = ["wheel", "touchmove", "keydown", "pointerdown"];
  const openIntro = () => {
    if (!html.classList.contains("intro")) return;
    evs.forEach(ev => removeEventListener(ev, openIntro));
    try { sessionStorage.setItem("intro", "1"); } catch {}
    // la página queda quieta hasta que termina de abrirse, así el mismo scroll no se saltea los textos del video
    scrollTo(0, 0); sfx("open"); ov.classList.add("out"); html.classList.replace("intro", "opening"); onScroll();
    ov.addEventListener("animationend", e => { if (e.target !== ov) return; ov.remove(); html.classList.remove("opening"); lenis?.start(); });
  };
  evs.forEach(ev => addEventListener(ev, openIntro, { passive: true }));
  setTimeout(openIntro, 6000); // por si nadie scrollea
}

/* ================= init ================= */
$("#yr").textContent = new Date().getFullYear();
let saved = "es"; try { saved = localStorage.getItem("lang") || (navigator.language?.startsWith("es") ? "es" : "en"); } catch {}
applyLang(saved); render();
loadData().catch(er => console.error("Carga de datos:", er)).then(() => editMode
  ? import("./editor.js?v=23").then(m => m.initEditor({ state, t, I18N, BASE, applyLang }))
  : checkAdmin());
