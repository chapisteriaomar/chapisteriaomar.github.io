// ============================================================
//  CONFIGURACIÓN — completar con los datos de las cuentas nuevas
// ============================================================

// Firebase (Consola Firebase → Configuración del proyecto → Tus apps → Web)
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Cloudinary (cuenta nueva) — preset "unsigned" creado en Settings → Upload
export const CLOUDINARY = {
  cloudName: "",
  uploadPreset: "",
  folder: "chapisteriaomar"
};

// Valores por defecto (se pueden cambiar luego desde el panel admin → Config)
export const DEFAULTS = {
  whatsapp: "",                 // ej: 5491100000000 (sin + ni espacios)
  email: "",
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
