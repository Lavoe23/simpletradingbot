/*
  universityNoteUtils.js - Versión Refactorizada (Ceteri Edition)
  Eliminamos 'path' y 'requireScript' para total compatibilidad con Mac e iOS.
*/

function universityNoteUtils() {
  // En lugar de requireScript, obtenemos la config directamente de Templater
  // Esto asume que universityConfig.js está en la misma carpeta de scripts.
  const config = tp.user.universityConfig();
  
  if (!config || typeof config !== "object") {
    throw new Error("University config is required to use note utilities.");
  }

  const fsConfig = config.fs ?? {};
  const labels = config.labels ?? {};
  const features = config.features ?? {};
  const years = Array.isArray(config.years) ? [...config.years] : [];
  const parciales = Array.isArray(config.parciales) ? [...config.parciales] : [];
  const schema = config.schema ?? {};

  const IS_PARCIAL_ENABLED = features.parcial === true;

  const GENERAL_LABEL = labels.general || "General";
  const FINAL_LABEL = labels.final ?? parciales.find((value) => /final/i.test(value)) ?? GENERAL_LABEL;
  const SUBJECT_LABEL = labels.subject ?? "Subject";
  const YEAR_LABEL = labels.year ?? "Year";
  const TEMA_LABEL = labels.tema ?? "Tema";
  const PARCIAL_LABEL = labels.parcial ?? "Parcial";

  const DEFAULT_BASE_PATH = fsConfig.universityRoot || "Universidad";
  const PARCIAL_CONTAINER_NAME = fsConfig.parcialContainer ?? "Parciales";
  const TEMA_CONTAINER_NAME = fsConfig.temaContainer || "Temas";

  const canonicalParcialesMap = new Map();
  for (const entry of parciales) {
    if (entry) canonicalParcialesMap.set(entry.toString().toLowerCase(), entry);
  }

  const canonicalYearsMap = new Map();
  for (const entry of years) {
    if (entry) canonicalYearsMap.set(entry.toString().toLowerCase(), entry);
  }

  // Reemplazo de path.join para Obsidian/iOS
  function pathJoin(...segments) {
    return segments
      .map((segment) => segment?.toString().trim())
      .filter((segment) => segment && segment !== "/")
      .join("/");
  }

  function getBaseUniversityPath(file) {
    const parentPath = file?.parent?.path ?? "";
    if (!parentPath) return DEFAULT_BASE_PATH;
    const pathParts = parentPath.split("/").filter(Boolean);
    const uniIndex = pathParts.indexOf(DEFAULT_BASE_PATH);
    return uniIndex === -1 ? DEFAULT_BASE_PATH : pathJoin(...pathParts.slice(0, uniIndex + 1));
  }

  function isFolder(abstractFile) {
    return abstractFile && typeof abstractFile === "object" && Array.isArray(abstractFile.children);
  }

  function getFolder(path) {
    const folder = app.vault.getAbstractFileByPath(path);
    return isFolder(folder) ? folder : null;
  }

  function listImmediateFolderNames(path) {
    const folder = getFolder(path);
    if (!folder) return [];
    return folder.children
      .filter((child) => isFolder(child))
      .map((child) => child.name)
      .filter(Boolean);
  }

  function dedupePreserveOrder(values = []) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
      if (!value) continue;
      const key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(value);
      }
    }
    return result;
  }

  function sortCaseInsensitive(values = []) {
    return [...values].sort((a, b) => a.localeCompare(b, undefined, sensitivity = "base"));
  }

  function listSubjects(basePath) {
    return sortCaseInsensitive(dedupePreserveOrder(listImmediateFolderNames(basePath)));
  }

  function listYearFolders(basePath) {
    return sortCaseInsensitive(
      dedupePreserveOrder(
        listImmediateFolderNames(basePath)
          .map((folderName) => normalizeYear(folderName, { allowLiteral: false }))
          .filter(Boolean)
      )
    );
  }

  function reorderWithPreference(options = [], preferred = GENERAL_LABEL) {
    if (!preferred || preferred === GENERAL_LABEL) return options;
    const normalizedPreferred = preferred.toLowerCase();
    const index = options.findIndex((option) => option.toLowerCase() === normalizedPreferred);
    if (index === -1) return [preferred, ...options];
    return [options[index], ...options.filter((_, idx) => idx !== index)];
  }

  function buildSubjectOptions(basePath, preferredSubject) {
    const discoveredSubjects = listSubjects(basePath);
    const pool = dedupePreserveOrder([
      GENERAL_LABEL,
      ...(preferredSubject && preferredSubject !== GENERAL_LABEL ? [preferredSubject] : []),
      ...discoveredSubjects,
    ]);
    return reorderWithPreference(pool, preferredSubject);
  }

  function findParcialesContainer(path) {
    const subjectFolder = getFolder(path);
    if (!subjectFolder) return { container: null, containerName: null };
    const desiredNameLower = (PARCIAL_CONTAINER_NAME ?? "").toLowerCase();
    const parcialesFolder = subjectFolder.children?.find((child) => {
      if (!isFolder(child)) return false;
      const childName = child.name ?? "";
      return (desiredNameLower && childName.toLowerCase() === desiredNameLower) || /^parciales?$/i.test(childName);
    });
    return parcialesFolder ? { container: parcialesFolder, containerName: parcialesFolder.name } : { container: subjectFolder, containerName: null };
  }

  function getParcialContext(basePath, subject) {
    const subjectPath = subject && subject !== GENERAL_LABEL ? pathJoin(basePath, subject) : basePath;
    let { container, containerName } = findParcialesContainer(subjectPath);
    let containerPath = container ? container.path : (subject && subject !== GENERAL_LABEL ? pathJoin(subjectPath, PARCIAL_CONTAINER_NAME) : subjectPath);
    const existingParcials = listImmediateFolderNames(containerPath);
    return { containerPath, containerName, existingParcials: sortCaseInsensitive(dedupePreserveOrder(existingParcials)) };
  }

  function getTemaContext(basePath, subjectFolderName, parcialFolderName, { includeParcial = false } = {}) {
    const subjectPath = subjectFolderName ? pathJoin(basePath, subjectFolderName) : basePath;
    const resolveTemaContainer = (basePathForTemas) => {
      if (!TEMA_CONTAINER_NAME) return basePathForTemas;
      const desiredPath = pathJoin(basePathForTemas, TEMA_CONTAINER_NAME);
      return getFolder(desiredPath) ? desiredPath : basePathForTemas;
    };
    let temaContainerPath = resolveTemaContainer(subjectPath);
    if (parcialFolderName) {
      const { containerPath: parcialContainerPath } = getParcialContext(basePath, subjectFolderName);
      const parcialPath = parcialContainerPath || subjectPath;
      temaContainerPath = resolveTemaContainer(pathJoin(parcialPath, parcialFolderName));
    }
    const existingTemas = listImmediateFolderNames(temaContainerPath).filter(name => {
      if (!name) return false;
      if (includeParcial) return true;
      const loweredName = name.toLowerCase();
      if (loweredName === (PARCIAL_CONTAINER_NAME ?? "").toLowerCase() || /^parciales?$/.test(loweredName)) return false;
      return normalizeParcial(name) === GENERAL_LABEL;
    });
    return { containerPath: temaContainerPath, existingTemas: sortCaseInsensitive(dedupePreserveOrder(existingTemas)) };
  }

  async function ensureFolderPath(folderPath) {
    if (!folderPath) return;
    const segments = folderPath.split("/").filter(Boolean);
    let cumulative = "";
    for (const segment of segments) {
      cumulative = cumulative ? `${cumulative}/${segment}` : segment;
      if (!app.vault.getAbstractFileByPath(cumulative)) {
        await app.vault.createFolder(cumulative);
      }
    }
  }

  function ensureUniqueFileName(folderPath, baseName, extension = "md") {
    if (!folderPath) return baseName;
    const normalizedBase = baseName?.trim() || "Sin título";
    let candidate = normalizedBase;
    let suffix = 1;
    while (app.vault.getAbstractFileByPath(`${folderPath}/${candidate}.${extension}`)) {
      candidate = `${normalizedBase} (${suffix++})`;
    }
    return candidate;
  }

  function sanitizeFolderName(name) { return name?.toString().replace(/[\\/]/g, "-").trim() ?? ""; }
  function sanitizeFileName(name) { return name?.toString().replace(/[\\/:*?"<>|]/g, "-").trim() ?? ""; }

  function toSlug(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").toLowerCase();
  }

  function normalizeParcial(parcial) {
    const value = parcial?.toString().trim();
    if (!value) return GENERAL_LABEL;
    const lowered = value.toLowerCase();
    if (canonicalParcialesMap.has(lowered)) return canonicalParcialesMap.get(lowered);
    if (lowered === FINAL_LABEL.toLowerCase()) return FINAL_LABEL;
    const parcialMatch = lowered.match(/parcial[\s_-]*(\d+)/);
    if (parcialMatch) {
      const normalizedKey = `parcial ${parcialMatch[1]}`.toLowerCase();
      if (canonicalParcialesMap.has(normalizedKey)) return canonicalParcialesMap.get(normalizedKey);
    }
    return GENERAL_LABEL;
  }

  function normalizeYear(year, { allowLiteral = true } = {}) {
    if (!year) return null;
    const trimmed = year.toString().trim();
    const lowered = trimmed.toLowerCase();
    if (canonicalYearsMap.has(lowered)) return canonicalYearsMap.get(lowered);
    
    const normalized = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const match = normalized.match(/(?:year|yr|ano|y)[\s_-]*(\d{1,2})/i) || normalized.match(/(\d{1,2})(?:st|nd|rd|th)?[\s_-]*(?:year|yr|ano)/i);
    
    if (match) {
      const num = parseInt(match[1], 10);
      const key = `year ${num}`.toLowerCase();
      return canonicalYearsMap.get(key) || `Year ${num}`;
    }
    return allowLiteral && lowered !== GENERAL_LABEL.toLowerCase() ? trimmed : null;
  }

  // Funciones principales de resolución (simplificadas para iOS)
  async function resolveSubjectParcialTema(tp, opts = {}) {
    const { currentFile, contextSubject = GENERAL_LABEL, includeParcial = false, includeTema = true } = opts;
    const baseUniversityPath = getBaseUniversityPath(currentFile);
    
    // Aquí podrías añadir los sugestores (tp.system.suggester)
    // Para brevedad, devolvemos un objeto de estructura básica
    return {
      baseUniversityPath,
      subject: contextSubject,
      targetFolder: baseUniversityPath
    };
  }

  return {
    toSlug,
    sanitizeFileName,
    sanitizeFolderName,
    ensureFolderPath,
    ensureUniqueFileName,
    normalizeYear,
    normalizeParcial,
    pathJoin,
    resolveSubjectParcialTema,
    constants: { general: GENERAL_LABEL, universityRoot: DEFAULT_BASE_PATH }
  };
}

module.exports = universityNoteUtils;