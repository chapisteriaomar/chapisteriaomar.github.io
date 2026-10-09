// ============================================================
//  CONFIGURACIÓN — completar con los datos de las cuentas nuevas
// ============================================================

// Firebase (Consola Firebase → Configuración del proyecto → Tus apps → Web)
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPU0F7_gu8yh2AG7KT2WBII369hrwj7LA",
  authDomain: "chapisteriaomarwebpage.firebaseapp.com",
  projectId: "chapisteriaomarwebpage",
  storageBucket: "chapisteriaomarwebpage.firebasestorage.app",
  messagingSenderId: "598908982360",
  appId: "1:598908982360:web:6f330806d0497c63ba262d"
};

// Cloudinary (cuenta nueva) — preset "unsigned" creado en Settings → Upload
export const CLOUDINARY = {
  cloudName: "uxarw5gf",
  uploadPreset: "chapisteriaomar",
  folder: "chapisteriaomar"
};

// Valores por defecto (se pueden cambiar luego desde el panel admin → Config)
export const DEFAULTS = {
  whatsapp: "5491130526505",                 // ej: 5491100000000 (sin + ni espacios)
  email: "chapisteriaomar@gmail.com",
  instagram: "chapisteriaomarsrl",
  instagramUrl: "https://www.instagram.com/chapisteriaomarsrl/",
  tallerNombre: "Chapistería Omar",
  tallerMaps: "https://share.google/7TK7TCiUOezFoH4EV",
  baseNombre: "Base operativa actual",
  baseMaps: "https://share.google/lCsnMDGQqBL9QDPB0",
  // Cifras del hero: se completan en admin → Config (las vacías no se muestran)
  stats: { years: "", vehicles: "", provinces: "", ops: "" },
  companias: []                 // nombres de compañías (se cargan en admin)
};
