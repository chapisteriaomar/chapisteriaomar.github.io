import { FIREBASE_CONFIG, DEFAULTS } from "./config.js";
import { I18N } from "./i18n.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Cloudinary: optimizar URLs al vuelo
export const cld = (url, w = 1200) =>
  url && url.includes("/upload/") && !url.includes("/upload/f_auto")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${w}/`) : url;

const state = { cfg: { ...DEFAULTS }, works: [], ops: [], clients: [], reviews: [], filter: "all", lang: "es", db: null, fb: null };

/* ================= i18n ================= */
function t(k) { return I18N[state.lang][k] ?? I18N.es[k] ?? k; }
function applyLang(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach(el => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
  $$(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
  try { localStorage.setItem("lang", lang); } catch {}
  renderStats(); renderTicker(); renderOps();
}
$$(".lang button").forEach(b => b.onclick = () => applyLang(b.dataset.lang));

/* ================= nav ================= */
const nav = $("#nav");
addEventListener("scroll", () => nav.classList.toggle("solid", scrollY > 30), { passive: true });
$("#burger").onclick = () => nav.classList.toggle("open");
$$("#navLinks a").forEach(a => a.onclick = () => nav.classList.remove("open"));
const secObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) $$("#navLinks a").forEach(a => a.classList.toggle("act", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
$$("section[id]").forEach(s => secObs.observe(s));

/* ================= reveal ================= */
const rev = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rev.unobserve(e.target); } }), { threshold: .12 });
const observeReveal = () => $$(".reveal:not(.in)").forEach(el => rev.observe(el));

/* ================= hero: reflejo de tablero PDR ================= */
(function reflection() {
  const c = $("#reflect"), x = c.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, dpr, running = true, t0 = performance.now();
  const mouse = { x: .68, y: .5, tx: .68, ty: .5 };
  const dents = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 20 + Math.random() * 26, a: 6 + Math.random() * 8, p: i * 1.7 }));
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function draw(now) {
    const tm = (now - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    x.clearRect(0, 0, W, H);
    const gap = W < 700 ? 12 : 15, step = 8;
    const list = [{ x: mouse.x * W, y: mouse.y * H, s: Math.min(W, H) * .16, a: 34 }].concat(
      dents.map(d => ({ x: ((d.x + tm * .006) % 1) * W, y: d.y * H, s: d.s, a: d.a * (.6 + .4 * Math.sin(tm * .8 + d.p)) })));
    for (let i = 0, y0 = -gap; y0 < H + gap; i++, y0 += gap) {
      const hl = i % 6 === 0;
      x.beginPath();
      for (let px = 0; px <= W + step; px += step) {
        let dy = 0;
        for (const d of list) {
          const ddx = px - d.x, ddy = y0 - d.y, r2 = ddx * ddx + ddy * ddy, s2 = d.s * d.s;
          if (r2 < s2 * 9) dy += d.a * (ddy / d.s) * Math.exp(-r2 / (2 * s2));
        }
        px ? x.lineTo(px, y0 + dy) : x.moveTo(px, y0 + dy);
      }
      x.strokeStyle = hl ? "rgba(221,60,51,.75)" : "rgba(255,255,255,.22)";
      x.lineWidth = hl ? 1.4 : 1;
      x.stroke();
    }
    if (running && !reduce) requestAnimationFrame(draw);
  }
  size(); addEventListener("resize", size);
  addEventListener("pointermove", e => { if (scrollY < H) { mouse.tx = e.clientX / W; mouse.ty = (e.clientY + scrollY) / H; } }, { passive: true });
  new IntersectionObserver(([e]) => { const was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(draw); }).observe(c);
  requestAnimationFrame(draw);
})();

/* ================= render ================= */
function renderStats() {
  const s = state.cfg.stats || {};
  const items = [["years", "stat.years"], ["vehicles", "stat.vehicles"], ["provinces", "stat.provinces"], ["ops", "stat.ops"]].filter(([k]) => s[k]);
  $("#heroStats").innerHTML = items.map(([k, l]) => `<div class="stat"><b>${esc(s[k])}</b><span>${t(l)}</span></div>`).join("");
}
function renderTicker() {
  const words = state.lang === "en"
    ? ["Paintless Dent Repair", "Hail Damage", "Mobile Operations", "Insurers", "Fleets", "Argentina & abroad"]
    : ["Desabollado sin pintura", "Granizo", "Operativos móviles", "Aseguradoras", "Flotas", "Argentina y exterior"];
  const one = words.map(w => `<span>${w}</span><i>◆</i>`).join("");
  $("#ticker").innerHTML = one + one;
}
function renderConfig() {
  const c = state.cfg;
  renderStats();
  $("#locMain").href = c.tallerMaps; $("#locMainName").textContent = c.tallerNombre || "Chapistería Omar";
  $("#locBase").href = c.baseMaps; $("#locBaseName").textContent = c.baseNombre || "Chapistería Omar Solutions";
  $("#igLink").href = c.instagramUrl || `https://instagram.com/${c.instagram}`;
  $("#igHandle").textContent = "@" + (c.instagram || "").replace("@", "");
  if (c.whatsapp) {
    const n = String(c.whatsapp).replace(/\D/g, "");
    $("#waLink").href = `https://wa.me/${n}?text=${encodeURIComponent("Hola, los contacto desde chapisteriaomar.com")}`;
    $("#waText").textContent = "+" + n; $("#waLink").hidden = false;
  }
  if (c.email) { $("#mailLink").href = "mailto:" + c.email; $("#mailText").textContent = c.email; $("#mailLink").hidden = false; }
  if (c.aboutImg) { const a = $("#aboutImg"); a.style.backgroundImage = `url("${cld(c.aboutImg, 1000)}")`; a.classList.add("has"); }
}

function workMatches(w) {
  const f = state.filter;
  return f === "all" || (f === "ba" ? w.type === "ba" : w.cat === f);
}
function renderWorks() {
  const list = state.works.filter(workMatches);
  $("#workGrid").innerHTML = list.map((w, i) => {
    const big = w.featured ? " big" : "";
    const tag = w.type === "ba" ? `<span class="wk-tag">${t("work.ba")}</span>` : "";
    const media = w.type === "video"
      ? `<video src="${esc(w.url)}#t=0.5" muted playsinline preload="metadata"></video><span class="wk-play"></span>`
      : `<img src="${esc(cld(w.type === "ba" ? w.url2 : w.url, w.featured ? 1000 : 600))}" alt="${esc(w.title)}" loading="lazy">`;
    return `<figure class="wk${big}" data-i="${i}">${media}${tag}<figcaption class="wk-cap">${esc(w.title || "")}</figcaption></figure>`;
  }).join("");
  $("#workEmpty").classList.toggle("show", !list.length);
  $$("#workGrid .wk").forEach(el => el.onclick = () => openLB(list.map(workToSlide), +el.dataset.i));
}
const workToSlide = w => ({ type: w.type, url: w.url, url2: w.url2, cap: w.title });
$$("#filters button").forEach(b => b.onclick = () => {
  state.filter = b.dataset.f; $$("#filters button").forEach(x => x.classList.toggle("on", x === b)); renderWorks();
});

/* ---- mapa de operativos ---- */
let map, layer;
function initMap() {
  if (map || !window.L) return;
  map = L.map("opsMap", { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([-36.5, -63.5], 4);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: "abcd", maxZoom: 18
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  map.on("click", () => map.scrollWheelZoom.enable());
}
function renderOps() {
  initMap(); if (!map) return;
  layer.clearLayers();
  const ops = [...state.ops].sort((a, b) => (!!b.live - !!a.live) || String(b.year || "").localeCompare(String(a.year || "")));
  const list = $("#opsList");
  if (!ops.length) { list.innerHTML = `<p class="empty show">${t("map.empty")}</p>`; return; }
  const markers = [];
  ops.forEach((o, i) => {
    if (o.lat == null || o.lng == null) return;
    const icon = L.divIcon({ className: "", html: `<div class="pin${o.live ? " live" : ""}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
    const m = L.marker([o.lat, o.lng], { icon }).addTo(layer);
    const units = o.units ? ` · ${esc(o.units)} ${t("map.units")}` : "";
    m.bindPopup(`<b>${esc(o.name)}</b><small>${esc([o.province, o.year].filter(Boolean).join(" · "))}${units}</small>${o.desc ? `<p style="margin-top:6px">${esc(o.desc)}</p>` : ""}${o.photos?.length ? `<button class="pop-btn" data-op="${i}">${state.lang === "en" ? "View photos" : "Ver fotos"} (${o.photos.length}) →</button>` : ""}`);
    m.on("popupopen", e => { const b = e.popup.getElement().querySelector(".pop-btn"); if (b) b.onclick = () => openOp(o); hl(i); });
    markers.push(m); o._m = m;
  });
  list.innerHTML = ops.map((o, i) => `<button class="op" data-i="${i}"><b>${esc(o.name)}</b><small>${esc([o.province, o.year].filter(Boolean).join(" · "))}${o.units ? ` · <span class="op-u">${esc(o.units)} ${t("map.units")}</span>` : ""}</small></button>`).join("");
  $$(".op", list).forEach(b => b.onclick = () => { const o = ops[+b.dataset.i]; if (o._m) { map.flyTo(o._m.getLatLng(), 9, { duration: .8 }); o._m.openPopup(); } });
  function hl(i) { $$(".op", list).forEach((b, j) => b.classList.toggle("on", j === i)); }
  if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(.35), { maxZoom: 7 });
}
function openOp(o) { openLB(o.photos.map(u => ({ type: /\.(mp4|mov|webm)$/i.test(u) ? "video" : "image", url: u, cap: o.name })), 0); }

function renderClients() {
  $("#clients").hidden = !state.clients.length;
  $("#clientsList").innerHTML = state.clients.map(c => `<div class="client reveal">${c.logo ? `<img src="${esc(cld(c.logo, 300))}" alt="${esc(c.name)}" loading="lazy">` : esc(c.name)}</div>`).join("");
}
function renderReviews() {
  $("#reviews").hidden = !state.reviews.length;
  $("#reviewsList").innerHTML = state.reviews.map(r => `<blockquote class="rev reveal"><p>${esc(r.text)}</p><b>${esc(r.name)}</b><small>${esc(r.role || "")}</small></blockquote>`).join("");
}

/* ================= lightbox + antes/después ================= */
let lbList = [], lbI = 0;
export function baHTML(a, b) {
  return `<div class="ba"><img src="${esc(cld(b, 1600))}" alt=""><img class="ba-top" src="${esc(cld(a, 1600))}" alt=""><span class="ba-bar"></span><span class="ba-l a">${t("before")}</span><span class="ba-l b">${t("after")}</span></div>`;
}
function bindBA(root) {
  const el = root.querySelector(".ba"); if (!el) return;
  const set = cx => { const r = el.getBoundingClientRect(); el.style.setProperty("--x", Math.max(0, Math.min(100, (cx - r.left) / r.width * 100)) + "%"); };
  let drag = false;
  el.addEventListener("pointerdown", e => { drag = true; el.setPointerCapture(e.pointerId); set(e.clientX); });
  el.addEventListener("pointermove", e => drag && set(e.clientX));
  el.addEventListener("pointerup", () => drag = false);
}
function showLB() {
  const s = lbList[lbI], st = $("#lbStage");
  st.innerHTML = s.type === "ba" ? baHTML(s.url, s.url2)
    : s.type === "video" ? `<video src="${esc(s.url)}" controls autoplay playsinline></video>`
    : `<img src="${esc(cld(s.url, 1800))}" alt="">`;
  bindBA(st);
  $("#lbCap").textContent = s.cap || "";
  $("#lbPrev").style.visibility = $("#lbNext").style.visibility = lbList.length > 1 ? "visible" : "hidden";
}
function openLB(list, i) { lbList = list; lbI = i; $("#lb").hidden = false; document.body.style.overflow = "hidden"; showLB(); }
function closeLB() { $("#lb").hidden = true; $("#lbStage").innerHTML = ""; document.body.style.overflow = ""; }
$("#lbClose").onclick = closeLB;
$("#lbPrev").onclick = () => { lbI = (lbI - 1 + lbList.length) % lbList.length; showLB(); };
$("#lbNext").onclick = () => { lbI = (lbI + 1) % lbList.length; showLB(); };
$("#lb").onclick = e => { if (e.target.id === "lb") closeLB(); };
addEventListener("keydown", e => {
  if ($("#lb").hidden) return;
  if (e.key === "Escape") closeLB(); if (e.key === "ArrowLeft") $("#lbPrev").click(); if (e.key === "ArrowRight") $("#lbNext").click();
});

/* ================= Firebase ================= */
const FB = "https://www.gstatic.com/firebasejs/10.12.4/";
async function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey) return null;
  const [{ initializeApp }, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js")]);
  const app = initializeApp(FIREBASE_CONFIG);
  state.fb = { app, fs }; state.db = fs.getFirestore(app);
  return state.db;
}
async function loadData() {
  const db = await initFirebase().catch(e => (console.warn("Firebase:", e), null));
  if (!db) return;
  const { fs } = state.fb;
  const get = async (name, ord = "createdAt") => {
    try { return (await fs.getDocs(fs.query(fs.collection(db, name), fs.orderBy(ord, "desc")))).docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (e) { console.warn(name, e); return []; }
  };
  const [cfgSnap, works, ops, clients, reviews] = await Promise.all([
    fs.getDoc(fs.doc(db, "site", "config")).catch(() => null), get("works"), get("ops"), get("clients"), get("reviews")
  ]);
  if (cfgSnap?.exists()) state.cfg = { ...DEFAULTS, ...cfgSnap.data(), stats: { ...DEFAULTS.stats, ...(cfgSnap.data().stats || {}) } };
  Object.assign(state, { works, ops, clients, reviews });
  renderConfig(); renderWorks(); renderOps(); renderClients(); renderReviews(); observeReveal();
}

/* ================= contacto ================= */
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
    if (state.cfg.whatsapp) {
      const txt = Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
      open(`https://wa.me/${String(state.cfg.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(txt)}`, "_blank");
    }
    msg.textContent = t("f.err"); msg.classList.add("err");
  }
  btn.disabled = false; btn.textContent = t("f.send");
});

/* ================= admin (carga diferida) ================= */
async function checkAdmin() {
  if (location.hash !== "#admin") return;
  if (!FIREBASE_CONFIG.apiKey) { alert("Falta completar FIREBASE_CONFIG en js/config.js"); return; }
  if (!state.db) await initFirebase();
  const m = await import("./admin.js");
  m.openAdmin(state, { reload: loadData, cld, esc });
}
addEventListener("hashchange", checkAdmin);

/* ================= init ================= */
$("#year").textContent = new Date().getFullYear();
let saved = "es"; try { saved = localStorage.getItem("lang") || (navigator.language?.startsWith("es") ? "es" : "en"); } catch {}
applyLang(saved);
renderConfig(); renderWorks(); renderClients(); renderReviews(); observeReveal();
loadData().then(checkAdmin);
