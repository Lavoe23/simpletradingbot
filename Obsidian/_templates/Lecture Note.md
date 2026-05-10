<%*
// Forzamos a que no importe cómo se llame el archivo inicial
const currentFile = tp.config.target_file || app.workspace.getActiveFile();
if (!currentFile) {
    new Notice("⛔️ Error: No se detectó archivo activo.", 5_000);
    return;
}
// Eliminamos el chequeo de "Untitled" o "Sin título". 
// Ya no nos importa cómo se llame al principio.
%>

const isCreatingNewFile = tp.config.run_mode === 0;
if (!isCreatingNewFile) {
  const basename = currentFile.basename.toLowerCase();
  // Agregamos el chequeo para "sin título" y eliminamos el aborto estricto para evitar ENOENT
  if (!basename.startsWith("untitled") && !basename.startsWith("sin título") && !basename.startsWith("nota nueva")) {
    new Notice("⚠️ Warning: Running on a named file.", 5_000);
  }
}

// --- 1. LOAD UTILITIES (Refactorizado para Camilo/Ceteri) ---
// Ahora pasamos 'tp' a los scripts como acordamos para evitar el error de undefined
const config = tp.user.universityConfig();
const configLabels = config?.labels ?? {};

// Pasamos tp y el archivo actual al contexto
const context = await tp.user.getUniversityContext(tp, currentFile);

const noteUtils = tp.user.universityNoteUtils();
if (!noteUtils) {
  new Notice("⛔️ Abort: University note utilities are unavailable.", 10_000);
  return;
}

const {
  ensureFolderPath,
  ensureUniqueFileName,
  sanitizeFileName,
  toSlug,
  resolveSubjectParcialTema,
  constants = {},
  schema = {},
} = noteUtils;

const generalLabel = constants?.general ?? configLabels.general;
const noteTypes = schema?.types ?? {};
const lectureType = noteTypes.lecture ?? "lecture";
const conceptType = noteTypes.concept ?? "concept";
const codeLanguage = constants?.codeLanguage ?? "cpp"; // Forzamos C++ para tus ramos

const contextSubject = context?.subject ?? generalLabel;
const contextYear = context?.year ?? tp.frontmatter?.year ?? null;

// --- 2. RESOLVE PLACEMENT ---
const placement = await resolveSubjectParcialTema(tp, {
  currentFile,
  contextSubject,
  contextYear,
  includeParcial: false,
  promptYearWhen: "always",
  contextTema: generalLabel,
});

const {
  targetFolder,
  subject: resolvedSubject = generalLabel,
  year: resolvedYear = null,
  tema: resolvedTema = generalLabel,
} = placement ?? {};

const subject = resolvedSubject || generalLabel;
const year = resolvedYear?.toString().trim() || null;
const tema = resolvedTema?.toString().trim() || generalLabel;

if (!targetFolder) {
  new Notice("⛔️ Abort: Could not determine destination folder.", 10_000);
  return;
}

await ensureFolderPath(targetFolder);

// --- 3. PROMPT FOR TOPIC ---
const selectionDefault = tp.file.selection?.() ?? "";
const topicInput = await tp.system.prompt(
  "Tema de la Clase (opcional)",
  selectionDefault || null
);
const rawTopic = topicInput?.trim();
const safeTopic = sanitizeFileName(rawTopic) || "Clase Nueva";

const today = tp.date.now("YYYY-MM-DD");
const baseTitle = `Lecture ${today}`;
const noteTitle = rawTopic ? `${baseTitle} - ${safeTopic}` : baseTitle;
const headingTitle = rawTopic ? safeTopic : noteTitle;

const finalFileName = ensureUniqueFileName(targetFolder, noteTitle, "md");
const destinationMovePath = `${targetFolder}/${finalFileName}`;

// --- 4. MULTI-SELECT CONCEPTS ---
let conceptLinks = [];
if (typeof tp.system.multi_suggester === "function") {
  const allFiles = app.vault.getMarkdownFiles();
  const conceptFiles = allFiles
    .filter((f) => {
      const cache = app.metadataCache.getFileCache(f);
      return (
        cache?.frontmatter?.type === conceptType &&
        cache?.frontmatter?.course === subject
      );
    })
    .sort((a, b) => a.basename.localeCompare(b.basename));

  if (conceptFiles.length > 0) {
    const picked = await tp.system.multi_suggester(
      conceptFiles.map((f) => f.basename),
      conceptFiles,
      false,
      "Conceptos cubiertos (opcional)"
    );
    if (Array.isArray(picked) && picked.length > 0) {
      conceptLinks = picked.map((f) => `"[[${f.basename}]]"`);
    }
  }
}

// --- 5. BUILD CONTENT ---
const subjectSlug = toSlug(subject);
const temaSlug = toSlug(tema);
const lectureTags = `#${subjectSlug} #lecture`;
const alias = JSON.stringify(headingTitle);
const conceptsLine = conceptLinks.length > 0 ? `concepts: [${conceptLinks.join(", ")}]` : "concepts: []";

let content = `---
type: ${lectureType}
course: ${JSON.stringify(subject)}
year: ${JSON.stringify(year)}
tema: ${JSON.stringify(tema)}
created: ${today}
status: draft
aliases: [${alias}]
${conceptsLine}
---

${lectureTags}

# 🧠 ${headingTitle}

## 📜 Resumen
- [ ] ${tp.file.cursor(1)}

## 💻 Código (${codeLanguage})
\`\`\`${codeLanguage}
// ${safeTopic}
\`\`\`

## 🧠 Preguntas / Dudas
- [ ] ${tp.file.cursor(2)}
`;

tR = content;

// --- 6. PLACE FILE ---
<%*
// Usamos un pequeño delay de 100ms para que el sistema de archivos de Mac 
// se estabilice antes de mover la nota.
setTimeout(async () => {
    try {
        await tp.file.move(destinationMovePath);
        new Notice(`📘 Clase guardada en ${targetFolder}`, 5_000);
    } catch (e) {
        console.log("Error en el move, reintentando...", e);
        // Fallback: si falla el move, al menos renombramos
        await tp.file.rename(finalFileName);
    }
}, 100);
%>