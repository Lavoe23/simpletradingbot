<%*
// 1. Carga de Utils con Try/Catch
let utils;
try {
    utils = tp.user.universityNoteUtils();
} catch (e) {
    new Notice("❌ Error cargando scripts. Revisa la carpeta de Templater.");
    return;
}

// 2. Resolvemos datos (esto disparará los prompts)
const placement = await utils.resolveSubjectParcialTema(tp);
const { targetFolder, subject, tema } = placement;

// 3. Crear carpeta
await utils.ensureFolderPath(targetFolder);

// 4. Nombre de la nota
const topic = await tp.system.prompt("Título de la clase", "Nueva Clase");
const fileName = utils.ensureUniqueFileName(targetFolder, topic);

// 5. Contenido
const content = `---
course: ${subject}
tema: ${tema}
created: ${tp.date.now()}
---
# ${topic}

## 📝 Notas
- <% tp.file.cursor() %>

\`\`\`cpp
// Bloque para algoritmos
\`\`\`
`;

// 6. CREACIÓN FINAL (Aquí evitamos el ENOENT)
// En lugar de mover un archivo que no existe, creamos uno nuevo con el contenido
await tp.file.create_new(content, fileName, false, targetFolder);

new Notice("✅ Nota creada en " + targetFolder);
%>