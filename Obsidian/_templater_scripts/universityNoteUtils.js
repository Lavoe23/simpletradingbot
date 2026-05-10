function universityNoteUtils() {
  // CONFIGURACIÓN INTEGRADA (Para evitar el error de undefined)
  const config = {
    fs: { universityRoot: "Universidad", parcialContainer: "Parciales", temaContainer: "Temas" },
    labels: { subject: "Asignatura", year: "Año", parcial: "Parcial", tema: "Tema", general: "General" },
    years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
    parciales: ["General", "Parcial 1", "Parcial 2", "Parcial 3", "Final"],
    features: { parcial: false },
    schema: { types: { lecture: "lecture", concept: "concept", general: "general" } }
  };

  return {
    toSlug: (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").trim() : "",
    sanitizeFileName: (name) => name ? name.toString().replace(/[\\/:*?"<>|]/g, "-").trim() : "",
    ensureFolderPath: async (path) => {
        const segments = path.split("/").filter(Boolean);
        let current = "";
        for (const s of segments) {
            current = current ? `${current}/${s}` : s;
            if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
        }
    },
    ensureUniqueFileName: (path, name) => {
        let finalName = name || "Sin título";
        let count = 1;
        while (app.vault.getAbstractFileByPath(`${path}/${finalName}.md`)) {
            finalName = `${name} (${count++})`;
        }
        return finalName;
    },
    // Mock simplificado de la resolución para que no falle
    resolveSubjectParcialTema: async (tp) => {
        const subject = await tp.system.prompt("Asignatura", "General");
        const tema = await tp.system.prompt("Tema", "General");
        const folder = `Universidad/${subject}/${tema}`;
        return { targetFolder: folder, subject, tema, year: "2026" };
    }
  };
}
module.exports = universityNoteUtils;