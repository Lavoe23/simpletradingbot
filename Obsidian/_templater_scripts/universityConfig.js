const universityConfig = {
  fs: {
    universityRoot: "Universidad",
    parcialContainer: "Parciales",
    temaContainer: "Temas",
  },
  labels: {
    subject: "Asignatura", // Puedes cambiarlo a español si prefieres
    year: "Año",
    parcial: "Parcial",
    final: "Final",
    tema: "Tema",
    general: "General",
  },
  years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
  parciales: ["General", "Parcial 1", "Parcial 2", "Parcial 3", "Final"],
  codeLanguage: "cpp", // Ya que programas en C++, déjalo por defecto
  features: {
    parcial: false,
  },
  schema: {
    types: {
      lecture: "lecture",
      concept: "concept",
      "subject-hub": "subject-hub",
      "parcial-prep": "parcial-prep",
      general: "general",
    },
    statuses: ["draft", "reviewed", "complete"],
  },
};

function universityConfigScript() {
  return universityConfig;
}

module.exports = universityConfigScript;
