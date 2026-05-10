<%*
// Función para crear carpetas sin usar librerías externas
const crearCarpetas = async (ruta) => {
    const carpetas = ruta.split("/").filter(f => f);
    let acumulado = "";
    for (const c of carpetas) {
        acumulado = acumulado ? acumulado + "/" + c : c;
        if (!app.vault.getAbstractFileByPath(acumulado)) {
            await app.vault.createFolder(acumulado);
        }
    }
};

// Pedir datos al usuario
const ramo = await tp.system.prompt("Asignatura", "General");
const tema = await tp.system.prompt("Tema / Unidad", "General");
const titulo = await tp.system.prompt("Título de la clase", "Nueva Clase");

// Definir rutas
const pathFinal = "Universidad/" + ramo + "/" + tema;
const fecha = tp.date.now("YYYY-MM-DD");
const nombreNota = fecha + " - " + titulo;

// Crear carpeta
await crearCarpetas(pathFinal);

// Contenido de la nota
const body = "---" + "\n" +
"ramo: " + ramo + "\n" +
"tema: " + tema + "\n" +
"fecha: " + fecha + "\n" +
"---" + "\n\n" +
"# " + titulo + "\n\n" +
"## 📝 Notas" + "\n" +
"- " + "<% tp.file.cursor() %>" + "\n\n" +
"## 💻 Código (C++)" + "\n" +
"```cpp" + "\n" +
"// " + titulo + "\n" +
"int main() { return 0; }" + "\n" +
"
```";

// Ejecutar creación
try {
    await tp.file.create_new(body, nombreNota, false, pathFinal);
    new Notice("✅ Nota creada con éxito");
} catch (e) {
    new Notice("⚠️ Error: El archivo ya existe o hubo un problema.");
}
%>