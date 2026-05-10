/*
  getUniversityContext.js - Versión Refactorizada para Mac e iOS (Ceteri Edition)
  Eliminamos 'path' y 'requireScript' para usar la carga nativa de Templater.
*/

let _initialized = false;
let _GENERAL_LABEL;
let _UNIVERSITY_ROOT;
let _IS_PARCIAL_ENABLED;
let _normalizeParcial;
let _normalizeYear;

// Recibe 'tp' como argumento para acceder a otros scripts de usuario
function init(tp) {
  if (_initialized) return;

  // IMPORTANTE: Cargamos los scripts usando la API de Templater
  // Esto asume que universityConfig.js y universityNoteUtils.js están en la misma carpeta
  const universityConfig = tp.user.universityConfig();
  const configLabels = universityConfig?.labels ?? {};
  const configFs = universityConfig?.fs ?? {};

  _GENERAL_LABEL =
    configLabels.general ??
    (Array.isArray(universityConfig?.parciales)
      ? universityConfig.parciales.find((value) => /general/i.test(value))
      : undefined);

  if (!_GENERAL_LABEL) {
    throw new Error("University config must define a general label.");
  }

  _UNIVERSITY_ROOT = configFs.universityRoot;

  if (!_UNIVERSITY_ROOT) {
    throw new Error("University config must define fs.universityRoot.");
  }

  _IS_PARCIAL_ENABLED = universityConfig?.features?.parcial === true;

  // Cargamos utils desde Templater
  const utils = tp.user.universityNoteUtils();
  _normalizeParcial = utils.normalizeParcial;
  _normalizeYear = utils.normalizeYear;

  _initialized = true;
}

/**
 * Función principal.
 * @param {object} tp - El objeto Templater (pásalo desde la nota)
 * @param {TFile} targetFile - El archivo actual (app.workspace.getActiveFile())
 */
function getUniversityContext(tp, targetFile) {
  // Inicializamos pasando el objeto tp
  init(tp);

  const GENERAL_LABEL = _GENERAL_LABEL;
  const UNIVERSITY_ROOT = _UNIVERSITY_ROOT;
  const IS_PARCIAL_ENABLED = _IS_PARCIAL_ENABLED;
  const normalizeParcial = _normalizeParcial;
  const normalizeYear = _normalizeYear;

  if (!targetFile) {
    return { subject: GENERAL_LABEL, year: null, parcial: GENERAL_LABEL };
  }

  const parentPath = targetFile.parent?.path ?? "";
  if (!parentPath) {
    return { subject: GENERAL_LABEL, year: null, parcial: GENERAL_LABEL };
  }

  const pathParts = parentPath.split("/").filter(Boolean);
  const universityRootLower = UNIVERSITY_ROOT.toLowerCase();
  const uniIndex = pathParts.findIndex((part = "") => part.toLowerCase() === universityRootLower);

  const relativeParts = uniIndex === -1 ? pathParts : pathParts.slice(uniIndex + 1);
  
  // Usamos la API global de Obsidian 'app' que sí funciona en Mac/iOS
  const frontmatterYear = app.metadataCache.getFileCache(targetFile)?.frontmatter?.year;
  const pathYearCandidate = relativeParts.find((part = "") => normalizeYear(part, { allowLiteral: false }));
  const year = normalizeYear(frontmatterYear) ?? normalizeYear(pathYearCandidate, { allowLiteral: false });

  const firstSegment = relativeParts[0] ?? "";
  const firstSegmentIsYear = !!normalizeYear(firstSegment, { allowLiteral: false });

  const subjectCandidate = firstSegmentIsYear ? relativeParts[1] : relativeParts[0];
  const subject = subjectCandidate || GENERAL_LABEL;

  const searchParts = firstSegmentIsYear ? relativeParts.slice(1) : relativeParts;
  const parcialCandidate = IS_PARCIAL_ENABLED
    ? searchParts.find((part = "") => normalizeParcial(part) !== GENERAL_LABEL)
    : undefined;
  const parcial = normalizeParcial(parcialCandidate);

  return { subject, year, parcial };
}

module.exports = getUniversityContext;