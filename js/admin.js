import { CLOUDINARY } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.4/";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let S, H, fs, db, auth, A, tab = "works", admMap, pick;

export async function openAdmin(state, helpers) {
  S = state; H = helpers; fs = state.fb.fs; db = state.db;
  A = await import(FB + "firebase-auth.js");
  auth = A.getAuth(state.fb.app);
  const el = $("#adm"); el.hidden = false; document.body.style.overflow = "hidden";
  A.onAuthStateChanged(auth, u => u ? shell() : login());
}
function close() {
  $("#adm").hidden = true; $("#adm").innerHTML = ""; document.body.style.overflow = "";
  history.replaceState(null, "", location.pathname); admMap = null; H.reload();
}

/* ---------- login ---------- */
function login() {
  $("#adm").innerHTML = `<div class="adm-login">
    <img src="assets/logo-chico.svg" alt="">
    <form class="adm-card" id="lf">
      <h3>Acceso admin</h3>
      <label><span>Email</span><input name="e" type="email" required autocomplete="username"></label>
      <label><span>Contraseña</span><input name="p" type="password" required autocomplete="current-password"></label>
      <p class="note" id="le"></p>
      <div class="row" style="margin:0"><button class="sbtn">Ingresar</button><button type="button" class="sbtn ghost" id="lc">Volver al sitio</button></div>
    </form></div>`;
  $("#lc").onclick = close;
  $("#lf").onsubmit = async e => {
    e.preventDefault();
    try { await A.signInWithEmailAndPassword(auth, e.target.e.value, e.target.p.value); }
    catch { $("#le").textContent = "Credenciales incorrectas."; }
  };
}

/* ---------- shell ---------- */
const TABS = [["works", "Trabajos"], ["ops", "Operativos"], ["clients", "Compañías"], ["reviews", "Reseñas"], ["leads", "Consultas"], ["config", "Config"]];
function shell() {
  $("#adm").innerHTML = `<div class="adm-top"><b>Panel</b><div class="row" style="margin:0">
      <button class="sbtn ghost" id="ax">Ver sitio</button><button class="sbtn ghost" id="ao">Salir</button></div></div>
    <div class="adm-tabs">${TABS.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="adm-body" id="ab"></div>`;
  $("#ax").onclick = close;
  $("#ao").onclick = () => A.signOut(auth);
  $$(".adm-tabs button").forEach(b => b.onclick = () => { tab = b.dataset.t; $$(".adm-tabs button").forEach(x => x.classList.toggle("on", x === b)); render(); });
  render();
}
function render() { admMap = null; ({ works, ops, clients, reviews, leads, config })[tab](); }

/* ---------- helpers ---------- */
const col = n => fs.collection(db, n);
const list = async (n, ord = "createdAt") => (await fs.getDocs(fs.query(col(n), fs.orderBy(ord, "desc")))).docs.map(d => ({ id: d.id, ...d.data() }));
const add = (n, d) => fs.addDoc(col(n), { ...d, createdAt: fs.serverTimestamp() });
const del = (n, id) => fs.deleteDoc(fs.doc(db, n, id));
const upd = (n, id, d) => fs.updateDoc(fs.doc(db, n, id), d);
const e = s => H.esc(s);

function upload(file, onProg) {
  return new Promise((res, rej) => {
    if (!CLOUDINARY.cloudName || !CLOUDINARY.uploadPreset) return rej(new Error("Falta configurar CLOUDINARY en js/config.js"));
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", CLOUDINARY.uploadPreset);
    if (CLOUDINARY.folder) fd.append("folder", CLOUDINARY.folder);
    const x = new XMLHttpRequest();
    x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
    x.upload.onprogress = ev => ev.lengthComputable && onProg?.(ev.loaded / ev.total);
    x.onload = () => { try { const r = JSON.parse(x.responseText); r.secure_url ? res(r.secure_url) : rej(new Error(r.error?.message || "Error de subida")); } catch (er) { rej(er); } };
    x.onerror = () => rej(new Error("Error de red"));
    x.send(fd);
  });
}
async function uploadMany(files, progEl) {
  const out = []; const n = files.length; progEl?.classList.add("on");
  for (let i = 0; i < n; i++) {
    out.push(await upload(files[i], p => progEl && (progEl.firstElementChild.style.width = ((i + p) / n * 100) + "%")));
  }
  progEl?.classList.remove("on"); return out;
}
const prog = () => `<div class="prog"><i></i></div>`;
const busy = async (btn, fn) => { const t = btn.textContent; btn.disabled = true; btn.textContent = "Guardando…"; try { await fn(); } catch (er) { alert(er.message || er); } btn.disabled = false; btn.textContent = t; };
const isVideo = f => f.type?.startsWith("video");

/* ---------- TRABAJOS ---------- */
async function works() {
  const b = $("#ab");
  b.innerHTML = `<div class="adm-card"><h3>Subir trabajo</h3>
    <div class="adm-grid">
      <label><span>Título</span><input id="wt" placeholder="Ej: Toyota Hilux – granizo Monte"></label>
      <label><span>Categoría</span><select id="wc"><option value="granizo">Granizo</option><option value="pdr">PDR</option><option value="taller">Taller</option></select></label>
      <label><span>Formato</span><select id="wy"><option value="image">Fotos / videos sueltos</option><option value="ba">Antes / Después (2 fotos)</option></select></label>
      <label><span>Destacado (grande)</span><select id="wf"><option value="">No</option><option value="1">Sí</option></select></label>
    </div>
    <div class="adm-grid" style="margin-top:14px" id="wfiles">
      <label><span>Archivos (podés elegir varios)</span><input type="file" id="wa" accept="image/*,video/*" multiple></label>
    </div>
    ${prog()}
    <div class="row"><button class="sbtn" id="ws">Subir</button><span class="note">Cada archivo se publica como un trabajo.</span></div></div>
    <div class="adm-card"><h3>Publicados</h3><div class="adm-list" id="wl">Cargando…</div></div>`;
  const setFiles = () => {
    $("#wfiles").innerHTML = $("#wy").value === "ba"
      ? `<label><span>Foto ANTES</span><input type="file" id="w1" accept="image/*"></label><label><span>Foto DESPUÉS</span><input type="file" id="w2" accept="image/*"></label>`
      : `<label><span>Archivos (podés elegir varios)</span><input type="file" id="wa" accept="image/*,video/*" multiple></label>`;
  };
  $("#wy").onchange = setFiles;
  $("#ws").onclick = ev => busy(ev.target, async () => {
    const base = { title: $("#wt").value.trim(), cat: $("#wc").value, featured: !!$("#wf").value };
    const pg = $(".prog", b);
    if ($("#wy").value === "ba") {
      const a = $("#w1").files[0], d = $("#w2").files[0];
      if (!a || !d) throw new Error("Elegí la foto de antes y la de después.");
      const [u1, u2] = await uploadMany([a, d], pg);
      await add("works", { ...base, type: "ba", url: u1, url2: u2 });
    } else {
      const files = [...$("#wa").files]; if (!files.length) throw new Error("Elegí al menos un archivo.");
      const urls = await uploadMany(files, pg);
      for (let i = 0; i < urls.length; i++) await add("works", { ...base, type: isVideo(files[i]) ? "video" : "image", url: urls[i] });
    }
    $("#wt").value = ""; setFiles(); loadW();
  });
  async function loadW() {
    const items = await list("works");
    $("#wl").innerHTML = items.length ? items.map(w => `<div class="adm-item"><div class="th" style="background-image:url('${e(H.cld(w.type === "ba" ? w.url2 : w.url, 400))}')"></div>
      <div class="meta"><b>${e(w.title || "(sin título)")}</b>${e(w.cat)} · ${w.type === "ba" ? "antes/después" : w.type}${w.featured ? " · ★" : ""}
      <div><button class="sbtn del" data-f="${w.id}" data-v="${w.featured ? "" : 1}">${w.featured ? "Quitar ★" : "Destacar"}</button><button class="sbtn del" data-d="${w.id}">Borrar</button></div></div></div>`).join("") : `<p class="note">Todavía no hay trabajos.</p>`;
    $$("[data-d]", $("#wl")).forEach(x => x.onclick = async () => { if (confirm("¿Borrar este trabajo?")) { await del("works", x.dataset.d); loadW(); } });
    $$("[data-f]", $("#wl")).forEach(x => x.onclick = async () => { await upd("works", x.dataset.f, { featured: !!x.dataset.v }); loadW(); });
  }
  loadW();
}

/* ---------- OPERATIVOS ---------- */
async function ops() {
  const b = $("#ab");
  b.innerHTML = `<div class="adm-card"><h3>Nuevo operativo</h3>
    <p class="note" style="margin-bottom:10px">Tocá el mapa para marcar la localidad.</p>
    <div id="admMap"></div>
    <div class="adm-grid">
      <label><span>Localidad / nombre</span><input id="on" placeholder="Ej: Monte"></label>
      <label><span>Provincia / país</span><input id="op" placeholder="Buenos Aires"></label>
      <label><span>Año</span><input id="oy" inputmode="numeric" value="${new Date().getFullYear()}"></label>
      <label><span>Unidades reparadas</span><input id="ou" placeholder="Ej: 350"></label>
      <label><span>Latitud</span><input id="olat"></label>
      <label><span>Longitud</span><input id="olng"></label>
      <label><span>En curso ahora</span><select id="ol"><option value="">No</option><option value="1">Sí</option></select></label>
      <label><span>Fotos / videos</span><input type="file" id="of" accept="image/*,video/*" multiple></label>
    </div>
    <label style="margin-top:14px"><span>Descripción breve</span><textarea id="od" rows="2"></textarea></label>
    ${prog()}
    <div class="row"><button class="sbtn" id="os">Guardar operativo</button></div></div>
    <div class="adm-card"><h3>Operativos</h3><div class="adm-rows" id="olist">Cargando…</div></div>`;
  admMap = L.map("admMap").setView([-36.5, -63.5], 4);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 18 }).addTo(admMap);
  admMap.on("click", ev => {
    $("#olat").value = ev.latlng.lat.toFixed(5); $("#olng").value = ev.latlng.lng.toFixed(5);
    pick ? pick.setLatLng(ev.latlng) : (pick = L.marker(ev.latlng).addTo(admMap));
  });
  pick = null;
  $("#os").onclick = ev => busy(ev.target, async () => {
    const lat = parseFloat($("#olat").value), lng = parseFloat($("#olng").value);
    if (!$("#on").value.trim() || isNaN(lat) || isNaN(lng)) throw new Error("Completá el nombre y marcá la ubicación.");
    const photos = await uploadMany([...$("#of").files], $(".prog", b));
    await add("ops", { name: $("#on").value.trim(), province: $("#op").value.trim(), year: $("#oy").value.trim(), units: $("#ou").value.trim(),
      lat, lng, live: !!$("#ol").value, desc: $("#od").value.trim(), photos });
    ops();
  });
  const items = await list("ops");
  $("#olist").innerHTML = items.length ? items.map(o => `<div class="r"><div><b>${e(o.name)}</b> ${o.live ? '<span style="color:#3ddc84">● en curso</span>' : ""}<br>
      <small>${e([o.province, o.year, o.units && o.units + " unidades"].filter(Boolean).join(" · "))} · ${o.photos?.length || 0} fotos</small></div>
      <div class="row" style="margin:0"><label class="sbtn ghost" style="cursor:pointer">+ Fotos<input type="file" hidden multiple accept="image/*,video/*" data-p="${o.id}"></label>
      <button class="sbtn ghost" data-l="${o.id}" data-v="${o.live ? "" : 1}">${o.live ? "Finalizar" : "Marcar en curso"}</button>
      <button class="sbtn del" data-d="${o.id}">Borrar</button></div></div>`).join("") : `<p class="note">Sin operativos.</p>`;
  $$("[data-d]", $("#olist")).forEach(x => x.onclick = async () => { if (confirm("¿Borrar operativo?")) { await del("ops", x.dataset.d); ops(); } });
  $$("[data-l]", $("#olist")).forEach(x => x.onclick = async () => { await upd("ops", x.dataset.l, { live: !!x.dataset.v }); ops(); });
  $$("[data-p]", $("#olist")).forEach(x => x.onchange = async () => {
    try { const urls = await uploadMany([...x.files], $(".prog", b)); await upd("ops", x.dataset.p, { photos: fs.arrayUnion(...urls) }); ops(); }
    catch (er) { alert(er.message); }
  });
}

/* ---------- COMPAÑÍAS ---------- */
async function clients() {
  const b = $("#ab");
  b.innerHTML = `<div class="adm-card"><h3>Agregar compañía</h3><div class="adm-grid">
      <label><span>Nombre</span><input id="cn"></label>
      <label><span>Logo (opcional, PNG/SVG)</span><input type="file" id="cl" accept="image/*"></label></div>${prog()}
    <div class="row"><button class="sbtn" id="cs">Agregar</button><span class="note">Mostrá solo compañías con las que tengan autorización para usar su nombre/logo.</span></div></div>
    <div class="adm-card"><h3>Compañías</h3><div class="adm-rows" id="clist"></div></div>`;
  $("#cs").onclick = ev => busy(ev.target, async () => {
    const name = $("#cn").value.trim(); if (!name) throw new Error("Falta el nombre.");
    const f = $("#cl").files[0]; const logo = f ? (await uploadMany([f], $(".prog", b)))[0] : "";
    await add("clients", { name, logo }); clients();
  });
  const items = await list("clients");
  $("#clist").innerHTML = items.map(c => `<div class="r"><b>${e(c.name)}</b><button class="sbtn del" data-d="${c.id}">Borrar</button></div>`).join("") || `<p class="note">Sin compañías.</p>`;
  $$("[data-d]", $("#clist")).forEach(x => x.onclick = async () => { await del("clients", x.dataset.d); clients(); });
}

/* ---------- RESEÑAS ---------- */
async function reviews() {
  const b = $("#ab");
  b.innerHTML = `<div class="adm-card"><h3>Agregar referencia</h3><div class="adm-grid">
      <label><span>Nombre</span><input id="rn"></label><label><span>Cargo / empresa</span><input id="rr"></label></div>
    <label style="margin-top:14px"><span>Texto</span><textarea id="rt" rows="3"></textarea></label>
    <div class="row"><button class="sbtn" id="rs">Agregar</button></div></div>
    <div class="adm-card"><h3>Referencias</h3><div class="adm-rows" id="rlist"></div></div>`;
  $("#rs").onclick = ev => busy(ev.target, async () => {
    if (!$("#rn").value.trim() || !$("#rt").value.trim()) throw new Error("Completá nombre y texto.");
    await add("reviews", { name: $("#rn").value.trim(), role: $("#rr").value.trim(), text: $("#rt").value.trim() }); reviews();
  });
  const items = await list("reviews");
  $("#rlist").innerHTML = items.map(r => `<div class="r"><div><b>${e(r.name)}</b> <small>${e(r.role)}</small><br><small>${e(r.text)}</small></div><button class="sbtn del" data-d="${r.id}">Borrar</button></div>`).join("") || `<p class="note">Sin referencias.</p>`;
  $$("[data-d]", $("#rlist")).forEach(x => x.onclick = async () => { await del("reviews", x.dataset.d); reviews(); });
}

/* ---------- CONSULTAS ---------- */
async function leads() {
  const b = $("#ab");
  b.innerHTML = `<div class="adm-card"><h3>Consultas recibidas</h3><div class="adm-rows" id="llist">Cargando…</div></div>`;
  const items = await list("leads");
  $("#llist").innerHTML = items.map(l => {
    const when = l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString("es-AR") : "";
    const wa = l.phone ? `<a class="sbtn ghost" target="_blank" href="https://wa.me/${String(l.phone).replace(/\D/g, "")}">WhatsApp</a>` : "";
    return `<div class="r" style="${l.read ? "opacity:.55" : ""}"><div><b>${e(l.company)}</b> — ${e(l.name)} <small>(${e(l.type)}${l.units ? " · " + e(l.units) + " u." : ""})</small><br>
      <small>${e(l.email)} ${e(l.phone)} · ${e(l.country)} · ${when}</small><p style="margin-top:6px">${e(l.message)}</p></div>
      <div class="row" style="margin:0">${wa}<a class="sbtn ghost" href="mailto:${e(l.email)}">Email</a>
      <button class="sbtn ghost" data-r="${l.id}" data-v="${l.read ? "" : 1}">${l.read ? "No leída" : "Leída"}</button><button class="sbtn del" data-d="${l.id}">Borrar</button></div></div>`;
  }).join("") || `<p class="note">Sin consultas todavía.</p>`;
  $$("[data-d]", $("#llist")).forEach(x => x.onclick = async () => { if (confirm("¿Borrar consulta?")) { await del("leads", x.dataset.d); leads(); } });
  $$("[data-r]", $("#llist")).forEach(x => x.onclick = async () => { await upd("leads", x.dataset.r, { read: !!x.dataset.v }); leads(); });
}

/* ---------- CONFIG ---------- */
async function config() {
  const ref = fs.doc(db, "site", "config");
  const snap = await fs.getDoc(ref); const c = { ...S.cfg, ...(snap.exists() ? snap.data() : {}) }; const st = c.stats || {};
  const f = (id, label, v, ph = "") => `<label><span>${label}</span><input id="${id}" value="${e(v ?? "")}" placeholder="${e(ph)}"></label>`;
  $("#ab").innerHTML = `<div class="adm-card"><h3>Contacto y redes</h3><div class="adm-grid">
      ${f("cw", "WhatsApp (con código país)", c.whatsapp, "5491100000000")}${f("ce", "Email", c.email)}
      ${f("ci", "Instagram (usuario)", c.instagram)}${f("ciu", "Instagram (link)", c.instagramUrl)}</div></div>
    <div class="adm-card"><h3>Ubicaciones</h3><div class="adm-grid">
      ${f("tn", "Taller principal – nombre", c.tallerNombre)}${f("tm", "Taller principal – link Maps", c.tallerMaps)}
      ${f("bn", "Base operativa – nombre / ciudad", c.baseNombre)}${f("bm", "Base operativa – link Maps", c.baseMaps)}</div>
      <p class="note" style="margin-top:10px">Cuando cambien de operativo, actualizá la base acá.</p></div>
    <div class="adm-card"><h3>Cifras del inicio (vacías = ocultas)</h3><div class="adm-grid">
      ${f("s1", "Años de oficio", st.years, "Ej: 25+")}${f("s2", "Vehículos reparados", st.vehicles, "Ej: 8.000+")}
      ${f("s3", "Provincias / países", st.provinces, "Ej: 10")}${f("s4", "Operativos realizados", st.ops, "Ej: 30+")}</div></div>
    <div class="adm-card"><h3>Foto de la sección Empresa</h3>
      ${c.aboutImg ? `<img src="${e(H.cld(c.aboutImg, 500))}" style="max-width:260px;margin-bottom:12px">` : ""}
      <input type="file" id="ai" accept="image/*">${prog()}</div>
    <div class="row"><button class="sbtn" id="cs">Guardar cambios</button></div>`;
  $("#cs").onclick = ev => busy(ev.target, async () => {
    let aboutImg = c.aboutImg || "";
    const fi = $("#ai").files[0]; if (fi) aboutImg = (await uploadMany([fi], $(".prog", $("#ab"))))[0];
    const v = id => $("#" + id).value.trim();
    await fs.setDoc(ref, { whatsapp: v("cw").replace(/\D/g, ""), email: v("ce"), instagram: v("ci").replace("@", ""), instagramUrl: v("ciu"),
      tallerNombre: v("tn"), tallerMaps: v("tm"), baseNombre: v("bn"), baseMaps: v("bm"),
      stats: { years: v("s1"), vehicles: v("s2"), provinces: v("s3"), ops: v("s4") }, aboutImg }, { merge: true });
    alert("Guardado."); config();
  });
}
