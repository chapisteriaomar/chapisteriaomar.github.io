// Modo edición visual: se carga solo dentro del panel admin (index.html?edit=1 en un iframe).
// Cada texto muestra un lápiz; al guardar, el panel (logueado) escribe en Firestore.
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function initEditor(ctx) {
  const { state, t, I18N, BASE, applyLang } = ctx;
  document.documentElement.classList.add("cms");
  document.head.insertAdjacentHTML("beforeend", `<style>
    .cms .nav{position:absolute}
    .cms .ticker-track{animation:none}
    .cms .reveal{opacity:1;transform:none}
    .cms [data-i18n]{outline:1px dashed rgba(221,60,51,.45);outline-offset:3px;cursor:text}
    .cms [data-i18n]:hover{outline:2px solid var(--red);background:rgba(221,60,51,.08)}
    #cmsLayer{position:absolute;top:0;left:0;width:100%;height:0;z-index:60;pointer-events:none}
    .cms-pen{position:absolute;width:26px;height:26px;border-radius:50%;background:var(--red);color:#fff;border:2px solid #fff;
      display:grid;place-items:center;pointer-events:auto;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .15s}
    .cms-pen:hover{transform:scale(1.15)}
    .cms-pen svg{width:12px;height:12px;fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
    .cms-ed{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:400;width:min(620px,calc(100% - 24px));background:var(--card);
      color:var(--text);border:1px solid var(--line2);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:16px;font:15px/1.5 var(--body)}
    .cms-ed small{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .cms-ed textarea{width:100%;min-height:90px;background:var(--bg);color:var(--text);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;font:15px/1.5 var(--body);resize:vertical;outline:none}
    .cms-ed textarea:focus{border-color:var(--red)}
    .cms-ed .row{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap}
    .cms-ed button{padding:10px 16px;border-radius:7px;font:700 14px var(--body);background:var(--line);color:var(--text)}
    .cms-ed button.ok{background:var(--red);color:#fff}
    .cms-ed button.lnk{background:none;color:var(--muted);padding:10px 4px;text-decoration:underline}
    .cms-ed .orig{margin-top:8px;font-size:13px;color:var(--dim)}
    .cms-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:401;background:var(--text);color:var(--bg);padding:10px 16px;border-radius:8px;font:600 14px var(--body)}
  </style>`);
  $$(".reveal").forEach(el => el.classList.add("in"));

  const layer = document.createElement("div"); layer.id = "cmsLayer"; document.body.append(layer);
  const pen = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>';

  function place() {
    layer.innerHTML = "";
    $$("[data-i18n]").forEach(el => {
      if (el.tagName === "OPTION" || el.closest(".lb,.adm,.cms-ed")) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.left > innerWidth || r.right < 0) return;
      const b = document.createElement("button");
      b.className = "cms-pen"; b.innerHTML = pen; b.title = "Editar texto";
      b.style.top = (r.top + scrollY - 12) + "px";
      b.style.left = Math.max(4, Math.min(r.right + scrollX - 6, document.documentElement.clientWidth - 30)) + "px";
      b.onclick = ev => { ev.preventDefault(); open(el.dataset.i18n); };
      layer.append(b);
    });
  }
  let tm; const later = () => { clearTimeout(tm); tm = setTimeout(place, 150); };
  addEventListener("resize", later);
  document.fonts?.ready.then(later);
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true });
  setTimeout(place, 400);

  // un clic en cualquier texto editable abre el editor (y no navega)
  document.addEventListener("click", ev => {
    if (ev.target.closest(".cms-ed,.cms-pen")) return;
    const el = ev.target.closest("[data-i18n]");
    if (!el || el.tagName === "OPTION") return;
    ev.preventDefault(); ev.stopPropagation(); open(el.dataset.i18n);
  }, true);

  let box;
  function open(key) {
    box?.remove();
    const lang = state.lang;
    box = document.createElement("div"); box.className = "cms-ed";
    const orig = BASE[lang]?.[key] ?? "";
    box.innerHTML = `<small>Texto (${lang.toUpperCase()}) · ${key}</small><textarea></textarea>
      ${t(key) !== orig ? `<div class="orig">Original: ${orig.replace(/</g, "&lt;")}</div>` : ""}
      <div class="row"><button class="lnk" data-a="reset">Volver al original</button>
      <div style="display:flex;gap:8px"><button data-a="x">Cancelar</button><button class="ok" data-a="ok">Guardar</button></div></div>`;
    document.body.append(box);
    const ta = box.querySelector("textarea"); ta.value = t(key); ta.focus(); ta.select();
    ta.onkeydown = ev => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) save(ta.value); if (ev.key === "Escape") box.remove(); };
    box.querySelector('[data-a="x"]').onclick = () => box.remove();
    box.querySelector('[data-a="ok"]').onclick = () => save(ta.value);
    box.querySelector('[data-a="reset"]').onclick = () => save(null);
    function save(value) {
      const v = value == null ? null : value.trim();
      if (v === "") return toast("El texto no puede quedar vacío");
      box.querySelectorAll("button").forEach(b => b.disabled = true);
      pending = { lang, key, value: v };
      parent.postMessage({ type: "cms-save", lang, key, value: v }, location.origin);
    }
  }
  let pending = null;
  addEventListener("message", ev => {
    if (ev.origin !== location.origin || ev.source !== parent || ev.data?.type !== "cms-saved" || !pending) return;
    if (ev.data.ok) {
      const { lang, key, value } = pending;
      I18N[lang][key] = value == null ? BASE[lang][key] : value;
      applyLang(state.lang);
      box?.remove(); toast(value == null ? "Restaurado" : "Guardado ✓"); later();
    } else {
      toast("No se pudo guardar: " + (ev.data.error || ""));
      box?.querySelectorAll("button").forEach(b => b.disabled = false);
    }
    pending = null;
  });
  function toast(m) { const d = document.createElement("div"); d.className = "cms-toast"; d.textContent = m; document.body.append(d); setTimeout(() => d.remove(), 2200); }
}
