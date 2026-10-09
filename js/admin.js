import { CLOUDINARY } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.4/";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let S, H, fs, db, auth, A, view = "home", open = false, unsub = null;
const cache = { works: [], ops: [], leads: [] };

/* ---------------- íconos ---------------- */
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  quote: '<path d="M7 7h4v4c0 3-2 5-4 5M15 7h4v4c0 3-2 5-4 5"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  up: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>'
};
const ico = n => `<svg viewBox="0 0 24 24">${I[n]}</svg>`;

/* ---------------- abrir / cerrar ---------------- */
export async function openAdmin(state, helpers) {
  if (open) return; open = true;
  S = state; H = helpers; fs = state.fb.fs; db = state.db;
  if (!$("#admCss")) document.head.insertAdjacentHTML("beforeend", '<link id="admCss" rel="stylesheet" href="css/admin.css">');
  if (!$(".toasts")) document.body.insertAdjacentHTML("beforeend", '<div class="toasts"></div>');
  A = await import(FB + "firebase-auth.js");
  auth = A.getAuth(state.fb.app);
  const el = $("#adm"); el.hidden = false; document.body.style.overflow = "hidden";
  unsub = A.onAuthStateChanged(auth, u => { if (open) u ? shell() : login(); });
}
function close() {
  open = false; unsub?.(); unsub = null;
  $("#adm").hidden = true; $("#adm").innerHTML = ""; document.body.style.overflow = "";
  history.replaceState(null, "", location.pathname); H.reload();
}

/* ---------------- utilidades ---------------- */
const e = s => H.esc(s);
const col = n => fs.collection(db, n);
const list = async n => (await fs.getDocs(fs.query(col(n), fs.orderBy("createdAt", "desc")))).docs.map(d => ({ id: d.id, ...d.data() }));
const add = (n, d) => fs.addDoc(col(n), { ...d, createdAt: fs.serverTimestamp() });
const del = (n, id) => fs.deleteDoc(fs.doc(db, n, id));
const upd = (n, id, d) => fs.updateDoc(fs.doc(db, n, id), d);
const CATS = [["granizo", "Granizo"], ["pdr", "PDR"], ["taller", "Taller"]];
const catOpts = v => CATS.map(([k, l]) => `<option value="${k}"${k === v ? " selected" : ""}>${l}</option>`).join("");
const opOpts = v => `<option value="">Sin operativo</option>` + cache.ops.map(o => `<option value="${o.id}"${o.id === v ? " selected" : ""}>${e(o.name)}${o.year ? " · " + e(o.year) : ""}</option>`).join("");
const fmtDate = ts => ts?.toDate ? ts.toDate().toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "";
const isVideoUrl = u => /\/video\/upload\//.test(u) || /\.(mp4|mov|webm)$/i.test(u);
const thumb = (u, w = 400) => isVideoUrl(u) ? u.replace("/video/upload/", `/video/upload/so_1,w_${w},c_fill,ar_4:3/`).replace(/\.\w+$/, ".jpg") : H.cld(u, w);

function toast(msg, err) {
  const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.textContent = msg;
  $(".toasts").append(t); setTimeout(() => t.remove(), err ? 5000 : 2600);
}
async function busy(btn, fn) {
  const html = btn.innerHTML; btn.disabled = true; btn.textContent = "Guardando…";
  try { await fn(); } catch (er) { console.error(er); toast(er.message || String(er), true); }
  btn.disabled = false; btn.innerHTML = html;
}

/* Achica fotos grandes antes de subir (más rápido desde el celular) */
async function prep(file) {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type) || file.size < 1.6e6) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", .86));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}
async function upload(file, onProg) {
  if (!CLOUDINARY.cloudName || !CLOUDINARY.uploadPreset) throw new Error("Falta configurar Cloudinary en js/config.js");
  const f = await prep(file);
  return new Promise((res, rej) => {
    const fd = new FormData();
    fd.append("file", f); fd.append("upload_preset", CLOUDINARY.uploadPreset);
    if (CLOUDINARY.folder) fd.append("folder", CLOUDINARY.folder);
    const x = new XMLHttpRequest();
    x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
    x.upload.onprogress = ev => ev.lengthComputable && onProg?.(ev.loaded / ev.total);
    x.onload = () => { try { const r = JSON.parse(x.responseText); r.secure_url ? res(r.secure_url) : rej(new Error(r.error?.message || "Error al subir")); } catch (er) { rej(er); } };
    x.onerror = () => rej(new Error("Sin conexión al subir"));
    x.send(fd);
  });
}
async function pool(items, n, fn) {
  let i = 0; const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
}

/* Zona de arrastrar y soltar */
function dropzone(el, { multiple = true, accept = "image/*,video/*", title = "Arrastrá fotos o videos acá", hint = "o tocá para elegir del celular / compu", onFiles }) {
  el.classList.add("dz");
  el.innerHTML = `${ico("up")}<b>${title}</b><small>${hint}</small><input type="file" ${multiple ? "multiple" : ""} accept="${accept}">`;
  const inp = $("input", el);
  el.onclick = ev => { if (ev.target !== inp) inp.click(); };
  inp.onchange = () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ""; };
  el.ondragover = ev => { ev.preventDefault(); el.classList.add("over"); };
  el.ondragleave = () => el.classList.remove("over");
  el.ondrop = ev => { ev.preventDefault(); el.classList.remove("over"); const fl = [...ev.dataTransfer.files].filter(f => /^(image|video)\//.test(f.type)); if (fl.length) onFiles(multiple ? fl : [fl[0]]); };
}
function imgPick(el, label, onFile, existing) {
  el.classList.add("dz");
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.hidden = true;
  const empty = () => { el.classList.remove("has-img"); el.innerHTML = `${ico("up")}<b>${label}</b><small>arrastrá o tocá</small>`; el.append(inp); };
  const show = src => { el.classList.add("has-img"); el.innerHTML = `<img src="${src}" alt=""><span class="dz-tag">${label} · tocá para cambiar</span>`; el.append(inp); };
  const take = f => { if (!f || !f.type.startsWith("image")) return; show(URL.createObjectURL(f)); onFile(f); };
  existing ? show(existing) : empty();
  el.onclick = ev => { if (ev.target !== inp) inp.click(); };
  inp.onchange = () => { take(inp.files[0]); inp.value = ""; };
  el.ondragover = ev => { ev.preventDefault(); el.classList.add("over"); };
  el.ondragleave = () => el.classList.remove("over");
  el.ondrop = ev => { ev.preventDefault(); el.classList.remove("over"); take(ev.dataTransfer.files[0]); };
}

/* ---------------- login ---------------- */
function login() {
  $("#adm").innerHTML = `<div class="ad ad-login" style="display:grid"><form id="lf">
      <img src="${document.documentElement.dataset.theme === "light" ? "assets/logo-chico-dark.svg" : "assets/logo-chico.svg"}" alt="">
      <label class="f"><span>Email</span><input name="e" type="email" required autocomplete="username"></label>
      <label class="f"><span>Contraseña</span><input name="p" type="password" required autocomplete="current-password"></label>
      <p class="err" id="le"></p>
      <button class="b red big">Ingresar</button>
      <button type="button" class="b ghost" id="lc">Volver al sitio</button></form></div>`;
  $("#lc").onclick = close;
  $("#lf").onsubmit = async ev => {
    ev.preventDefault();
    try { await A.signInWithEmailAndPassword(auth, ev.target.e.value, ev.target.p.value); }
    catch { $("#le").textContent = "Email o contraseña incorrectos."; }
  };
}

/* ---------------- estructura ---------------- */
const NAV = [["home", "Inicio", "home"], ["works", "Trabajos", "img"], ["ops", "Operativos", "pin"], ["leads", "Consultas", "inbox"],
  ["clients", "Compañías", "shield"], ["reviews", "Referencias", "quote"], ["config", "Config", "gear"]];
async function shell() {
  $("#adm").innerHTML = `<div class="ad">
    <aside class="ad-side">
      <div class="ad-logo"><img src="${document.documentElement.dataset.theme === "light" ? "assets/logo-chico-dark.svg" : "assets/logo-chico.svg"}" alt=""></div>
      ${NAV.map(([k, l, i]) => `<button class="ad-nav" data-v="${k}">${ico(i)}<span>${l}</span>${k === "leads" ? '<span class="badge" id="unread" hidden></span>' : ""}</button>`).join("")}
      <div class="grow"></div>
      <button class="ad-nav side-only" id="ax">${ico("eye")}<span>Ver sitio</span></button>
      <button class="ad-nav side-only" id="ao">${ico("out")}<span>Salir</span></button>
    </aside>
    <main class="ad-main"><header class="ad-head"><h1 id="vt"></h1><div class="bar" id="va"></div></header><div class="ad-content" id="imp" style="padding-bottom:0" hidden></div><div class="ad-content" id="vc"></div></main>
  </div>`;
  $("#ax").onclick = close;
  $("#ao").onclick = () => A.signOut(auth);
  $$(".ad-nav[data-v]").forEach(b => b.onclick = () => go(b.dataset.v));
  await refresh();
  go(view);
  checkImport();
}

/* ---------- contenido pendiente de importar (data/import.json del repo) ---------- */
async function checkImport() {
  let pk;
  try { pk = await (await fetch("data/import.json?t=" + Date.now(), { cache: "no-store" })).json(); } catch { return; }
  if (!pk?.id) return;
  const ref = fs.doc(db, "site", "imports");
  const done = await fs.getDoc(ref).then(d => d.exists() ? d.data() : {}).catch(() => ({}));
  if (done[pk.id]) return;
  const box = $("#imp"); box.hidden = false;
  box.innerHTML = `<div class="ad-card" style="border-color:var(--red);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin:0">
    <div><h2 style="font:700 19px var(--disp);text-transform:uppercase;letter-spacing:.06em">Contenido nuevo para publicar</h2>
    <p style="color:var(--muted);font-size:14px">${e(pk.titulo || pk.id)}</p></div>
    <button class="b red big" id="impGo">${ico("up")} Publicar ahora</button></div>`;
  $("#impGo").onclick = ev => busy(ev.currentTarget, async () => {
    const asFile = async path => { const b = await (await fetch(path)).blob(); return new File([b], path.split("/").pop(), { type: b.type }); };
    const opIds = {};
    for (const o of pk.ops || []) {
      const photos = []; for (const p of o.photos || []) photos.push(await upload(await asFile(p)));
      const { key, photos: _, ...data } = o;
      const r = await add("ops", { ...data, photos });
      opIds[key] = r.id;
    }
    for (const w of pk.works || []) {
      const url = await upload(await asFile(w.file));
      await add("works", { title: w.title || "", cat: w.cat || "pdr", type: "image", url, featured: !!w.featured, opId: opIds[w.op] || "" });
    }
    if (pk.bases?.length) {
      const cref = fs.doc(db, "site", "config");
      const c = await fs.getDoc(cref).then(d => d.exists() ? d.data() : {});
      const cur = Array.isArray(c.bases) ? c.bases : (c.baseMaps ? [{ nombre: c.baseNombre, maps: c.baseMaps }] : (S.cfg.bases || []));
      const merged = cur.filter(x => !/lCsnMDGQqBL9QDPB0/.test(x.maps || "")); pk.bases.forEach(b => { if (!merged.some(x => x.maps === b.maps || x.nombre === b.nombre)) merged.push(b); });
      await fs.setDoc(cref, { bases: merged }, { merge: true });
    }
    await fs.setDoc(ref, { [pk.id]: true }, { merge: true });
    box.hidden = true; toast("Publicado ✓"); await refresh(); go(view);
  });
}
async function refresh() {
  const [works, ops, leads] = await Promise.all([list("works"), list("ops"), list("leads")].map(p => p.catch(() => [])));
  Object.assign(cache, { works, ops, leads });
  const n = leads.filter(l => !l.read).length, b = $("#unread");
  if (b) { b.hidden = !n; b.textContent = n; }
}
function go(v) {
  view = v;
  $$(".ad-nav[data-v]").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $("#vt").textContent = NAV.find(n => n[0] === v)[1];
  $("#va").innerHTML = innerWidth > 860 ? "" : `<button class="b sm ghost" id="ax2">Ver sitio</button>`;
  if ($("#ax2")) $("#ax2").onclick = close;
  $(".ad-main").scrollTop = 0;
  ({ home, works, ops, leads, clients, reviews, config })[v]();
}

/* ================= INICIO ================= */
function home() {
  const live = cache.ops.filter(o => o.live).length, unread = cache.leads.filter(l => !l.read).length;
  $("#vc").innerHTML = `
    <div class="kpis">
      <div class="kpi"><b>${cache.works.length}</b><span>Trabajos publicados</span></div>
      <div class="kpi"><b>${cache.ops.length}</b><span>Operativos en el mapa</span></div>
      <div class="kpi"><b>${live}</b><span>En curso ahora</span></div>
      <div class="kpi"><b>${unread}</b><span>Consultas sin leer</span></div>
    </div>
    <div class="quick">
      <button class="qa" data-go="works">${ico("up")}<b>Subir fotos</b><small>Fotos, videos o antes / después del trabajo.</small></button>
      <button class="qa" data-go="ops">${ico("pin")}<b>Nuevo operativo</b><small>Marcá la localidad en el mapa y subí las fotos.</small></button>
      <button class="qa" data-go="leads">${ico("inbox")}<b>Ver consultas</b><small>Lo que mandaron las compañías desde la web.</small></button>
    </div>
    <div class="ad-card"><h2>Últimas consultas</h2><p class="sub">Las 3 más recientes.</p><div class="rows" id="hl"></div></div>`;
  $$("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  $("#hl").innerHTML = cache.leads.slice(0, 3).map(leadRow).join("") || `<div class="empty-s">Todavía no llegaron consultas.</div>`;
  bindLeads($("#hl"));
}

/* ================= TRABAJOS ================= */
let mode = "files", queue = [], libFilter = "all";
function works() {
  $("#vc").innerHTML = `
    <div class="ad-card">
      <div class="bar" style="justify-content:space-between;margin-bottom:16px">
        <div><h2 style="font:700 19px var(--disp);text-transform:uppercase;letter-spacing:.06em">Subir trabajos</h2></div>
        <div class="seg"><button data-m="files">Fotos y videos</button><button data-m="ba">Antes / Después</button></div>
      </div>
      <div class="ad-fields" style="margin-bottom:16px">
        <label class="f"><span>Título</span><input id="dT" placeholder="Ej: Hilux – granizo Monte (opcional)"></label>
        <label class="f"><span>Categoría</span><select id="dC">${catOpts("granizo")}</select></label>
        <label class="f"><span>Operativo</span><select id="dO">${opOpts("")}</select></label>
      </div>
      <div id="up"></div>
    </div>
    <div class="ad-card">
      <div class="bar" style="justify-content:space-between;margin-bottom:16px">
        <h2 style="font:700 19px var(--disp);text-transform:uppercase;letter-spacing:.06em">Publicados <span style="color:var(--muted)">(${cache.works.length})</span></h2>
        <div class="chips" id="lf">${[["all", "Todos"], ...CATS, ["ba", "Antes/Después"]].map(([k, l]) => `<button data-f="${k}" class="${k === libFilter ? "on" : ""}">${l}</button>`).join("")}</div>
      </div>
      <div class="lib" id="lib"></div>
    </div>`;
  $$(".seg button").forEach(b => { b.classList.toggle("on", b.dataset.m === mode); b.onclick = () => { mode = b.dataset.m; $$(".seg button").forEach(x => x.classList.toggle("on", x === b)); upArea(); }; });
  $("#dC").onchange = () => queue.forEach(q => { if (!q.status) { q.cat = $("#dC").value; $(".qc", q.el).value = q.cat; } });
  $("#dO").onchange = () => queue.forEach(q => { if (!q.status) q.opId = $("#dO").value; });
  let lastT = "";
  $("#dT").oninput = () => { const v = $("#dT").value; queue.forEach(q => { if (!q.status && q.title === lastT) { q.title = v; $(".qt", q.el).value = v; } }); lastT = v; };
  $$("#lf button").forEach(b => b.onclick = () => { libFilter = b.dataset.f; $$("#lf button").forEach(x => x.classList.toggle("on", x === b)); renderLib(); });
  upArea(); renderLib();
}
function upArea() {
  const up = $("#up");
  if (mode === "ba") {
    let A1, B1;
    up.innerHTML = `<div class="ba-pair"><div id="pa"></div><div id="pb"></div></div>
      <div class="sticky-act"><span class="note">Subí la foto de ANTES y la de DESPUÉS del mismo vehículo.</span><button class="b red big" id="baGo">Publicar antes / después</button></div>`;
    imgPick($("#pa"), "Antes", f => A1 = f);
    imgPick($("#pb"), "Después", f => B1 = f);
    $("#baGo").onclick = ev => busy(ev.currentTarget, async () => {
      if (!A1 || !B1) throw new Error("Falta la foto de antes o la de después.");
      const [u1, u2] = await Promise.all([upload(A1), upload(B1)]);
      await add("works", { title: $("#dT").value.trim(), cat: $("#dC").value, opId: $("#dO").value, type: "ba", url: u1, url2: u2, featured: false });
      toast("Antes / después publicado ✓");
      await refresh(); upArea(); renderLib();
    });
    return;
  }
  up.innerHTML = `<div id="dz"></div><div class="queue" id="q"></div>
    <div class="sticky-act" id="qa" hidden><span class="note" id="qn"></span>
      <div class="bar"><button class="b ghost" id="qClear">Vaciar</button><button class="b red big" id="qGo">${ico("up")} Publicar</button></div></div>`;
  dropzone($("#dz"), { onFiles: addToQueue });
  $("#qClear").onclick = () => { queue = queue.filter(q => q.status === "up"); drawQueue(); };
  $("#qGo").onclick = ev => publishQueue(ev.currentTarget);
  drawQueue();
}
function addToQueue(files) {
  files.forEach(file => queue.push({ file, src: URL.createObjectURL(file), video: file.type.startsWith("video"),
    title: $("#dT").value.trim(), cat: $("#dC").value, opId: $("#dO").value, star: false, status: "" }));
  drawQueue();
}
function drawQueue() {
  const box = $("#q"); if (!box) return;
  box.innerHTML = "";
  queue.forEach((q, i) => {
    const el = document.createElement("div"); el.className = "q" + (q.status === "done" ? " done" : q.status === "err" ? " err" : "");
    el.innerHTML = `<div class="th">${q.video ? `<video src="${q.src}" muted playsinline></video>` : `<img src="${q.src}" alt="">`}
        <button class="star${q.star ? " on" : ""}" title="Destacar (se ve grande)">★</button><button class="x" title="Quitar">×</button></div>
      <div class="pg"><i></i></div>
      <div class="body"><input class="qt" placeholder="Título" value="${e(q.title)}"><select class="qc">${catOpts(q.cat)}</select></div>`;
    $(".x", el).onclick = () => { queue.splice(i, 1); drawQueue(); };
    $(".star", el).onclick = ev => { q.star = !q.star; ev.currentTarget.classList.toggle("on", q.star); };
    $(".qt", el).oninput = ev => q.title = ev.target.value;
    $(".qc", el).onchange = ev => q.cat = ev.target.value;
    q.el = el; box.append(el);
  });
  const pending = queue.filter(q => !q.status).length;
  $("#qa").hidden = !queue.length;
  $("#qn").textContent = pending ? `${pending} archivo${pending > 1 ? "s" : ""} listo${pending > 1 ? "s" : ""} para publicar` : "Listo";
  $("#qGo").disabled = !pending;
}
async function publishQueue(btn) {
  const todo = queue.filter(q => !q.status);
  if (!todo.length) return;
  btn.disabled = true; $("#qClear").disabled = true;
  let ok = 0;
  await pool(todo, 3, async q => {
    q.status = "up"; $(".x", q.el).hidden = true;
    const bar = $(".pg i", q.el);
    try {
      const url = await upload(q.file, p => bar.style.width = Math.round(p * 100) + "%");
      await add("works", { title: q.title.trim(), cat: q.cat, opId: q.opId || "", type: q.video ? "video" : "image", url, featured: q.star });
      q.status = "done"; q.el.classList.add("done"); ok++;
    } catch (er) { q.status = "err"; q.el.classList.add("err"); toast(`${q.file.name}: ${er.message}`, true); }
  });
  toast(`${ok} publicado${ok === 1 ? "" : "s"} ✓`);
  await refresh(); renderLib();
  setTimeout(() => { queue = queue.filter(q => q.status === "err").map(q => (q.status = "", q)); drawQueue(); }, 1300);
  btn.disabled = false; $("#qClear").disabled = false;
}
function renderLib() {
  const lib = $("#lib"); if (!lib) return;
  const items = cache.works.filter(w => libFilter === "all" || (libFilter === "ba" ? w.type === "ba" : w.cat === libFilter));
  if (!items.length) { lib.innerHTML = `<div class="empty-s" style="grid-column:1/-1">No hay trabajos acá todavía.</div>`; return; }
  lib.innerHTML = items.map(w => `<div class="it" data-id="${w.id}">
      <div class="th" style="background-image:url('${e(thumb(w.type === "ba" ? w.url2 : w.url))}')" data-open="${e(w.type === "ba" ? w.url2 : w.url)}">
        <button class="st${w.featured ? " on" : ""}" title="Destacar">★</button>
        <span class="tg">${w.type === "ba" ? "Antes/Después" : w.type === "video" ? "Video" : (CATS.find(c => c[0] === w.cat) || [, w.cat])[1]}</span></div>
      <div class="body">
        <input class="t" value="${e(w.title || "")}" placeholder="Sin título">
        <select class="c">${catOpts(w.cat)}</select>
        ${cache.ops.length ? `<select class="o">${opOpts(w.opId || "")}</select>` : ""}
        <div class="acts"><small>${fmtDate(w.createdAt)}</small><button class="b danger sm d">Borrar</button></div>
      </div></div>`).join("");
  $$(".it", lib).forEach(el => {
    const id = el.dataset.id, w = cache.works.find(x => x.id === id);
    const save = async (d, msg = "Guardado ✓") => { try { await upd("works", id, d); Object.assign(w, d); toast(msg); } catch (er) { toast(er.message, true); } };
    $(".t", el).onchange = ev => save({ title: ev.target.value.trim() });
    $(".c", el).onchange = ev => save({ cat: ev.target.value });
    if ($(".o", el)) $(".o", el).onchange = ev => save({ opId: ev.target.value });
    $(".st", el).onclick = ev => { ev.stopPropagation(); const v = !w.featured; save({ featured: v }, v ? "Destacado ★" : "Ya no está destacado"); ev.currentTarget.classList.toggle("on", v); };
    $(".th", el).onclick = () => window.open($(".th", el).dataset.open, "_blank");
    $(".d", el).onclick = async () => { if (!confirm("¿Borrar este trabajo de la web?")) return; await del("works", id); el.remove(); cache.works = cache.works.filter(x => x.id !== id); toast("Borrado"); };
  });
}

/* ================= OPERATIVOS ================= */
let edit = null, admMap, mk, newPhotos = [];
function ops() {
  $("#vc").innerHTML = `<div class="ad-cols">
    <div class="ad-card" id="of"></div>
    <div class="ad-card"><h2>Operativos (${cache.ops.length})</h2><p class="sub">Los "en curso" titilan en el mapa de la web.</p><div class="rows" id="ol"></div></div>
  </div>`;
  opForm(); opList();
}
function opForm() {
  const o = edit || {};
  newPhotos = [];
  $("#of").innerHTML = `<h2>${edit ? "Editar: " + e(o.name) : "Nuevo operativo"}</h2><p class="sub">Buscá la localidad o tocá el mapa.</p>
    <div class="geo"><input id="gq" placeholder="Buscar localidad… ej: Posadas" autocomplete="off"><div class="geo-res" id="gr" hidden></div></div>
    <div id="admMap"></div>
    <div class="ad-fields">
      <label class="f"><span>Localidad / nombre</span><input id="on" value="${e(o.name || "")}"></label>
      <label class="f"><span>Provincia / país</span><input id="op" value="${e(o.province || "")}"></label>
      <label class="f"><span>Año</span><input id="oy" inputmode="numeric" value="${e(o.year || new Date().getFullYear())}"></label>
      <label class="f"><span>Unidades reparadas</span><input id="ou" inputmode="numeric" value="${e(o.units || "")}"></label>
    </div>
    <label class="f" style="margin-top:14px"><span>Descripción breve</span><textarea id="od" rows="2">${e(o.desc || "")}</textarea></label>
    <div class="bar" style="margin:16px 0"><label class="switch"><input type="checkbox" id="ol2"${o.live ? " checked" : ""}><i></i>En curso ahora</label>
      <span class="note" style="color:var(--muted);font-size:13px" id="ll">${o.lat ? `📍 ${(+o.lat).toFixed(3)}, ${(+o.lng).toFixed(3)}` : "Sin ubicación marcada"}</span></div>
    <div id="opz" class="sm"></div>
    <div class="thumbs" id="ot"></div>
    <div class="sticky-act"><span class="note">${edit ? "Las fotos nuevas se suman a las que ya tiene." : "Podés agregar más fotos después."}</span>
      <div class="bar">${edit ? '<button class="b ghost" id="oc">Cancelar</button>' : ""}<button class="b red big" id="os">${edit ? "Guardar cambios" : "Crear operativo"}</button></div></div>`;
  let lat = o.lat ?? null, lng = o.lng ?? null;
  admMap = L.map("admMap").setView(lat != null ? [lat, lng] : [-36.5, -63.5], lat != null ? 10 : 4);
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/${document.documentElement.dataset.theme === "light" ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png`, { subdomains: "abcd", maxZoom: 18, attribution: "© OSM © CARTO" }).addTo(admMap);
  const icon = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  const setPt = (a, b, zoom) => {
    lat = +a; lng = +b; mk ? mk.setLatLng([lat, lng]) : (mk = L.marker([lat, lng], { icon }).addTo(admMap));
    if (zoom) admMap.setView([lat, lng], zoom);
    $("#ll").textContent = `📍 ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  };
  mk = null; if (lat != null) setPt(lat, lng);
  admMap.on("click", ev => setPt(ev.latlng.lat, ev.latlng.lng));
  setTimeout(() => admMap.invalidateSize(), 50);

  // búsqueda de localidades (OpenStreetMap)
  let tmr;
  $("#gq").oninput = ev => {
    clearTimeout(tmr); const q = ev.target.value.trim();
    if (q.length < 3) { $("#gr").hidden = true; return; }
    tmr = setTimeout(async () => {
      try {
        const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=es&q=${encodeURIComponent(q)}`)).json();
        $("#gr").innerHTML = r.map((x, i) => `<button data-i="${i}">${e(x.display_name)}</button>`).join("") || `<button disabled>Sin resultados</button>`;
        $("#gr").hidden = false;
        $$("#gr button[data-i]").forEach(b => b.onclick = () => {
          const x = r[+b.dataset.i], ad = x.address || {};
          setPt(x.lat, x.lon, 11);
          if (!$("#on").value) $("#on").value = ad.city || ad.town || ad.village || ad.municipality || x.name || "";
          if (!$("#op").value) $("#op").value = [ad.state, ad.country_code !== "ar" ? ad.country : ""].filter(Boolean).join(", ");
          $("#gr").hidden = true; $("#gq").value = "";
        });
      } catch { toast("No se pudo buscar. Marcá en el mapa.", true); }
    }, 450);
  };

  dropzone($("#opz"), { title: "Fotos del operativo", hint: "arrastrá o tocá — podés elegir varias", onFiles: f => { newPhotos.push(...f); drawThumbs(); } });
  const keep = [...(o.photos || [])];
  function drawThumbs() {
    $("#ot").innerHTML = keep.map((u, i) => `<div class="tm" style="background-image:url('${e(thumb(u, 200))}')"><button data-k="${i}" title="Quitar">×</button></div>`).join("")
      + newPhotos.map((f, i) => `<div class="tm" style="background-image:url('${f.type.startsWith("image") ? URL.createObjectURL(f) : ""}');outline:2px solid var(--red)"><button data-n="${i}" title="Quitar">×</button></div>`).join("");
    $$("#ot [data-k]").forEach(b => b.onclick = () => { keep.splice(+b.dataset.k, 1); drawThumbs(); });
    $$("#ot [data-n]").forEach(b => b.onclick = () => { newPhotos.splice(+b.dataset.n, 1); drawThumbs(); });
  }
  drawThumbs();

  if ($("#oc")) $("#oc").onclick = () => { edit = null; opForm(); };
  $("#os").onclick = ev => busy(ev.currentTarget, async () => {
    const name = $("#on").value.trim();
    if (!name) throw new Error("Poné el nombre de la localidad.");
    if (lat == null) throw new Error("Marcá la ubicación en el mapa.");
    const urls = []; await pool(newPhotos, 3, async f => urls.push(await upload(f)));
    const data = { name, province: $("#op").value.trim(), year: $("#oy").value.trim(), units: $("#ou").value.trim(),
      desc: $("#od").value.trim(), live: $("#ol2").checked, lat, lng, photos: [...keep, ...urls] };
    if (edit) await upd("ops", edit.id, data); else await add("ops", data);
    toast(edit ? "Operativo actualizado ✓" : "Operativo creado ✓");
    edit = null; await refresh(); ops();
  });
}
function opList() {
  $("#ol").innerHTML = cache.ops.map(o => {
    const n = (o.photos?.length || 0) + cache.works.filter(w => w.opId === o.id).length;
    return `<div class="rw" data-id="${o.id}">
      <div class="av" style="background-image:url('${o.photos?.[0] ? e(thumb(o.photos[0], 160)) : ""}')"></div>
      <div class="tx"><b>${o.live ? '<span class="live-dot"></span>' : ""}${e(o.name)}</b>
        <small>${e([o.province, o.year, o.units && o.units + " unidades"].filter(Boolean).join(" · "))} · ${n} fotos</small></div>
      <div class="bar"><label class="switch" title="En curso"><input type="checkbox" class="lv"${o.live ? " checked" : ""}><i></i></label>
        <button class="b sm ghost ed">Editar</button><button class="b sm danger dl">Borrar</button></div></div>`;
  }).join("") || `<div class="empty-s">Todavía no hay operativos.</div>`;
  $$("#ol .rw").forEach(el => {
    const o = cache.ops.find(x => x.id === el.dataset.id);
    $(".lv", el).onchange = async ev => { await upd("ops", o.id, { live: ev.target.checked }); o.live = ev.target.checked; toast(o.live ? "Marcado en curso" : "Finalizado"); opList(); };
    $(".ed", el).onclick = () => { edit = o; opForm(); $(".ad-main").scrollTo({ top: 0, behavior: "smooth" }); };
    $(".dl", el).onclick = async () => { if (!confirm(`¿Borrar el operativo ${o.name}?`)) return; await del("ops", o.id); await refresh(); ops(); toast("Borrado"); };
  });
}

/* ================= CONSULTAS ================= */
function leadRow(l) {
  const wa = l.phone ? `<a class="b sm ghost" target="_blank" rel="noopener" href="https://wa.me/${String(l.phone).replace(/\D/g, "")}">WhatsApp</a>` : "";
  return `<div class="rw${l.read ? "" : " unread"}" data-id="${l.id}" style="${l.read ? "opacity:.6" : ""}">
    <div class="tx"><b>${e(l.company)} <span style="color:var(--muted);font-weight:500">— ${e(l.name)}</span></b>
      <small>${e(l.type)}${l.units ? " · " + e(l.units) + " unidades" : ""} · ${e(l.country || "")} · ${fmtDate(l.createdAt)}</small>
      <small style="display:block">${e(l.email)} ${l.phone ? "· " + e(l.phone) : ""}</small>
      ${l.message ? `<p>${e(l.message)}</p>` : ""}</div>
    <div class="bar">${wa}<a class="b sm ghost" href="mailto:${e(l.email)}">Email</a>
      <button class="b sm ghost rd">${l.read ? "No leída" : "Marcar leída"}</button><button class="b sm danger dl">Borrar</button></div></div>`;
}
function bindLeads(box) {
  $$(".rw", box).forEach(el => {
    const l = cache.leads.find(x => x.id === el.dataset.id);
    $(".rd", el).onclick = async () => { await upd("leads", l.id, { read: !l.read }); await refresh(); go(view); };
    $(".dl", el).onclick = async () => { if (!confirm("¿Borrar consulta?")) return; await del("leads", l.id); await refresh(); go(view); };
  });
}
function leads() {
  $("#vc").innerHTML = `<div class="rows" id="ll">${cache.leads.map(leadRow).join("") || `<div class="empty-s">Todavía no llegaron consultas.</div>`}</div>`;
  bindLeads($("#ll"));
}

/* ================= COMPAÑÍAS ================= */
async function clients() {
  const items = await list("clients").catch(() => []);
  let logo = null;
  $("#vc").innerHTML = `<div class="ad-cols">
    <div class="ad-card"><h2>Agregar compañía</h2><p class="sub">Solo las que autorizaron mostrar su nombre o logo.</p>
      <label class="f" style="margin-bottom:14px"><span>Nombre</span><input id="cn"></label>
      <div id="cz" style="aspect-ratio:3/1"></div>
      <div class="bar end" style="margin-top:16px"><button class="b red big" id="cs">Agregar</button></div></div>
    <div class="ad-card"><h2>Compañías (${items.length})</h2><p class="sub">Se muestran en "Trabajamos con".</p><div class="rows" id="cl"></div></div></div>`;
  imgPick($("#cz"), "Logo (opcional)", f => logo = f);
  $("#cs").onclick = ev => busy(ev.currentTarget, async () => {
    const name = $("#cn").value.trim(); if (!name) throw new Error("Falta el nombre.");
    await add("clients", { name, logo: logo ? await upload(logo) : "" }); toast("Agregada ✓"); clients();
  });
  $("#cl").innerHTML = items.map(c => `<div class="rw"><div class="av" style="background-size:contain;background-repeat:no-repeat;background-color:#fff;background-image:url('${c.logo ? e(H.cld(c.logo, 200)) : ""}')"></div>
    <div class="tx"><b>${e(c.name)}</b></div><button class="b sm danger" data-d="${c.id}">Borrar</button></div>`).join("") || `<div class="empty-s">Sin compañías.</div>`;
  $$("#cl [data-d]").forEach(b => b.onclick = async () => { if (confirm("¿Borrar?")) { await del("clients", b.dataset.d); clients(); } });
}

/* ================= REFERENCIAS ================= */
async function reviews() {
  const items = await list("reviews").catch(() => []);
  $("#vc").innerHTML = `<div class="ad-cols">
    <div class="ad-card"><h2>Agregar referencia</h2><p class="sub">Comentario de un cliente o compañía.</p>
      <div class="ad-fields"><label class="f"><span>Nombre</span><input id="rn"></label><label class="f"><span>Cargo / empresa</span><input id="rr"></label></div>
      <label class="f" style="margin-top:14px"><span>Texto</span><textarea id="rt" rows="4"></textarea></label>
      <div class="bar end" style="margin-top:16px"><button class="b red big" id="rs">Agregar</button></div></div>
    <div class="ad-card"><h2>Referencias (${items.length})</h2><p class="sub">&nbsp;</p><div class="rows" id="rl"></div></div></div>`;
  $("#rs").onclick = ev => busy(ev.currentTarget, async () => {
    if (!$("#rn").value.trim() || !$("#rt").value.trim()) throw new Error("Completá nombre y texto.");
    await add("reviews", { name: $("#rn").value.trim(), role: $("#rr").value.trim(), text: $("#rt").value.trim() }); toast("Agregada ✓"); reviews();
  });
  $("#rl").innerHTML = items.map(r => `<div class="rw"><div class="tx"><b>${e(r.name)}</b><small>${e(r.role)}</small><p>${e(r.text)}</p></div><button class="b sm danger" data-d="${r.id}">Borrar</button></div>`).join("") || `<div class="empty-s">Sin referencias.</div>`;
  $$("#rl [data-d]").forEach(b => b.onclick = async () => { if (confirm("¿Borrar?")) { await del("reviews", b.dataset.d); reviews(); } });
}

/* ================= CONFIG ================= */
async function config() {
  const ref = fs.doc(db, "site", "config");
  const snap = await fs.getDoc(ref);
  const c = { ...S.cfg, ...(snap.exists() ? snap.data() : {}) }, st = c.stats || {};
  const bases = Array.isArray(c.bases) ? c.bases : (c.baseMaps ? [{ nombre: c.baseNombre, maps: c.baseMaps }] : []);
  let aboutFile = null;
  const f = (id, label, v, ph = "") => `<label class="f"><span>${label}</span><input id="${id}" value="${e(v ?? "")}" placeholder="${e(ph)}"></label>`;
  $("#vc").innerHTML = `
    <div class="ad-card"><h2>Operativos móviles en curso</h2><p class="sub">Uno por cada localidad donde estén trabajando ahora. Aparecen todos en "Dónde encontrarnos".</p>
      <div id="bases"></div><button type="button" class="b ghost" id="addBase">+ Agregar operativo móvil</button></div>
    <div class="ad-cols">
      <div>
        <div class="ad-card"><h2>Contacto y redes</h2><p class="sub">Botones de WhatsApp, email e Instagram.</p><div class="ad-fields">
          ${f("cw", "WhatsApp (con código país)", c.whatsapp, "5491100000000")}${f("ce", "Email", c.email)}
          ${f("ci", "Instagram (usuario)", c.instagram)}${f("ciu", "Instagram (link)", c.instagramUrl)}</div></div>
        <div class="ad-card"><h2>Taller principal</h2><p class="sub">&nbsp;</p><div class="ad-fields">
          ${f("tn", "Nombre", c.tallerNombre)}${f("tm", "Link Google Maps", c.tallerMaps)}</div></div>
        <div class="ad-card"><h2>Cifras del inicio</h2><p class="sub">Las vacías no se muestran.</p><div class="ad-fields">
          ${f("s1", "Años de oficio", st.years, "Ej: 25+")}${f("s2", "Vehículos reparados", st.vehicles, "Ej: 8.000+")}
          ${f("s3", "Provincias / países", st.provinces, "Ej: 10")}${f("s4", "Operativos realizados", st.ops, "Ej: 30+")}</div></div>
      </div>
      <div class="ad-card"><h2>Foto de "La empresa"</h2><p class="sub">Se ve al lado del texto de la empresa.</p>
        <div id="az" style="aspect-ratio:4/3"></div></div>
    </div>
    <div class="ad-card" style="position:sticky;bottom:12px;margin:0;display:flex;justify-content:space-between;align-items:center;gap:12px">
      <span style="color:var(--muted);font-size:14px">Los cambios se ven en la web al recargar.</span><button class="b red big" id="cs">Guardar cambios</button></div>`;
  const baseRow = (b = {}) => `<div class="ad-fields base-row" style="margin-bottom:12px;align-items:end;grid-template-columns:1fr 1.2fr 1fr auto">
      <label class="f"><span>Localidad / nombre</span><input class="b-n" value="${e(b.nombre || "")}" placeholder="Ej: Posadas, Misiones"></label>
      <label class="f"><span>Link Google Maps</span><input class="b-m" value="${e(b.maps || "")}"></label>
      <label class="f"><span>Detalle (opcional)</span><input class="b-d" value="${e(b.detalle || "")}" placeholder="Ej: Nave Ruta 12 km 5"></label>
      <button type="button" class="b danger b-x">Quitar</button></div>`;
  $("#bases").innerHTML = (bases.length ? bases : [{}]).map(baseRow).join("");
  $("#bases").onclick = ev => { if (ev.target.classList.contains("b-x")) ev.target.closest(".base-row").remove(); };
  $("#addBase").onclick = () => $("#bases").insertAdjacentHTML("beforeend", baseRow());
  imgPick($("#az"), "Foto de la empresa", fl => aboutFile = fl, c.aboutImg ? H.cld(c.aboutImg, 800) : null);

  $("#cs").onclick = ev => busy(ev.currentTarget, async () => {
    const v = id => $("#" + id).value.trim();
    const aboutImg = aboutFile ? await upload(aboutFile) : (c.aboutImg || "");
    await fs.setDoc(ref, {
      whatsapp: v("cw").replace(/\D/g, ""), email: v("ce"), instagram: v("ci").replace("@", ""), instagramUrl: v("ciu"),
      tallerNombre: v("tn"), tallerMaps: v("tm"),
      bases: $$(".base-row").map(r => ({ nombre: $(".b-n", r).value.trim(), maps: $(".b-m", r).value.trim(), detalle: $(".b-d", r).value.trim() })).filter(b => b.nombre || b.maps),
      baseNombre: fs.deleteField(), baseMaps: fs.deleteField(),
      stats: { years: v("s1"), vehicles: v("s2"), provinces: v("s3"), ops: v("s4") }, aboutImg
    }, { merge: true });
    toast("Configuración guardada ✓");
  });
}
