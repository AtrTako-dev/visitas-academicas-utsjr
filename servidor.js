const path = require("node:path");
const express = require("express");
const conexion = require("./conexion");

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const estados = new Set(["Propuesta", "Programada", "Realizada", "Cancelada"]);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/estilos.css", (req, res) => res.sendFile(path.join(__dirname, "estilos.css")));
app.get("/script.js", (req, res) => res.sendFile(path.join(__dirname, "script.js")));

app.get("/api/health", async (req, res) => {
  try {
    const [[database]] = await conexion.query(
      "SELECT DATABASE() AS base, VERSION() AS version"
    );
    res.json({ estado: "conectado", base: database.base, version: database.version });
  } catch (error) {
    console.error("No se pudo comprobar la conexión a MySQL:", error.code || error.message);
    res.status(503).json({ estado: "sin_conexion", mensaje: "No se pudo conectar con la base de datos." });
  }
});

app.get("/api/grupos", async (req, res) => {
  try {
    const [rows] = await conexion.query(
      `SELECT g.id_grupo, g.nombre, p.nombre AS programa, t.nombre AS tutor,
              a.id_alumno, a.matricula, a.nombre AS alumno
       FROM grupos g
       JOIN programas p ON p.id_programa = g.id_programa
       JOIN tutores t ON t.id_tutor = g.id_tutor
       LEFT JOIN alumnos a ON a.id_grupo = g.id_grupo
       ORDER BY g.id_grupo, a.id_alumno`
    );

    const grupos = new Map();
    for (const row of rows) {
      if (!grupos.has(row.id_grupo)) {
        grupos.set(row.id_grupo, {
          id: row.id_grupo,
          nombre: row.nombre,
          programa: row.programa,
          tutor: row.tutor,
          alumnos: [],
        });
      }
      if (row.id_alumno !== null) {
        grupos.get(row.id_grupo).alumnos.push({
          id_alumno: row.id_alumno,
          matricula: row.matricula,
          nombre: row.alumno,
        });
      }
    }

    res.json([...grupos.values()]);
  } catch (error) {
    console.error("No se pudieron consultar los grupos:", error.code || error.message);
    res.status(500).json({ mensaje: "No se pudieron cargar los grupos desde MySQL." });
  }
});

app.post("/api/visitas", async (req, res) => {
  const body = req.body || {};
  const tipo = body.tipo;
  const estado = body.estado;
  const gruposEntrada = Array.isArray(body.grupos) ? body.grupos : [];

  if (!["Presencial", "Virtual"].includes(tipo)) {
    return res.status(400).json({ mensaje: "Selecciona una modalidad válida." });
  }
  if (!estados.has(estado)) {
    return res.status(400).json({ mensaje: "Selecciona un estado válido." });
  }
  if (gruposEntrada.length === 0) {
    return res.status(400).json({ mensaje: "Agrega al menos un grupo." });
  }

  const groupIds = gruposEntrada.map((group) => Number(group.id_grupo));
  if (groupIds.some((id) => !Number.isInteger(id) || id < 1) || new Set(groupIds).size !== groupIds.length) {
    return res.status(400).json({ mensaje: "La lista de grupos no es válida." });
  }

  const fecha = body.fecha;
  const hora = body.hora;
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ mensaje: "La fecha no tiene un formato válido." });
  }
  if (hora && !/^\d{2}:\d{2}(?::\d{2})?$/.test(hora)) {
    return res.status(400).json({ mensaje: "La hora no tiene un formato válido." });
  }

  const link = String(body.link_recorrido || "").trim();
  if (tipo === "Virtual" && link) {
    try {
      const url = new URL(link);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
    } catch {
      return res.status(400).json({ mensaje: "El enlace del recorrido debe ser una URL válida." });
    }
  }

  const buses = tipo === "Presencial" && Array.isArray(body.unidades_transporte)
    ? body.unidades_transporte
    : [];
  const unidades = [];
  for (const bus of buses) {
    const nombre = String(bus.nombre || "").trim();
    const asientos = Number(bus.asientos_disponibles);
    if (!nombre || nombre.length > 150 || !Number.isInteger(asientos) || asientos < 0) {
      return res.status(400).json({ mensaje: "Revisa el nombre y la cantidad de asientos de cada unidad." });
    }
    unidades.push({
      nombre,
      direccion: String(bus.direccion || "").trim() || null,
      telefono: String(bus.telefono || "").trim() || null,
      correo: String(bus.correo || "").trim() || null,
      asientos,
    });
  }

  let db;
  try {
    const [existingGroups] = await conexion.query(
      "SELECT id_grupo FROM grupos WHERE id_grupo IN (?)",
      [groupIds]
    );
    if (existingGroups.length !== groupIds.length) {
      return res.status(400).json({ mensaje: "Uno o más grupos ya no están disponibles." });
    }

    const [roster] = await conexion.query(
      "SELECT id_alumno, id_grupo FROM alumnos WHERE id_grupo IN (?) ORDER BY id_alumno",
      [groupIds]
    );
    const attendance = gruposEntrada.flatMap((group) =>
      (Array.isArray(group.alumnos) ? group.alumnos : []).map((student) => ({
        id_grupo: Number(group.id_grupo),
        id_alumno: Number(student.id_alumno),
        asiste: student.asiste === true,
      }))
    );
    const expected = new Map(roster.map((student) => [student.id_alumno, student.id_grupo]));
    const seen = new Set();
    const validAttendance = attendance.every((student) => {
      if (!Number.isInteger(student.id_alumno) || typeof student.asiste !== "boolean" || seen.has(student.id_alumno)) return false;
      seen.add(student.id_alumno);
      return expected.get(student.id_alumno) === student.id_grupo;
    });
    if (!validAttendance || seen.size !== expected.size) {
      return res.status(400).json({ mensaje: "La asistencia no coincide con los alumnos de los grupos seleccionados." });
    }

    const present = attendance.filter((student) => student.asiste).length;
    const capacity = unidades.reduce((total, bus) => total + bus.asientos, 0);
    if (tipo === "Presencial" && present > capacity) {
      return res.status(400).json({ mensaje: `Faltan ${present - capacity} asientos para los alumnos seleccionados.` });
    }

    db = await conexion.getConnection();
    await db.beginTransaction();

    const [visitResult] = await db.execute(
      "INSERT INTO visitas (tipo, objetivo, estado) VALUES (?, ?, ?)",
      [tipo, String(body.objetivo || "").trim() || null, estado]
    );
    const idVisita = visitResult.insertId;

    await db.query(
      "INSERT INTO visitas_grupos (id_visita, id_grupo) VALUES ?",
      [groupIds.map((idGrupo) => [idVisita, idGrupo])]
    );

    if (attendance.length) {
      await db.query(
        "INSERT INTO visitas_asistencias (id_visita, id_alumno, asiste) VALUES ?",
        [attendance.map((student) => [idVisita, student.id_alumno, student.asiste])]
      );
    }

    if (tipo === "Presencial") {
      await db.execute(
        "INSERT INTO visitas_presenciales (id_visita, fecha, hora, temas) VALUES (?, ?, ?, ?)",
        [idVisita, fecha || null, hora || null, String(body.temas || "").trim() || null]
      );

      for (const bus of unidades) {
        const [unitResult] = await db.execute(
          `INSERT INTO unidades_transporte
             (nombre, direccion, telefono, correo, asientos_disponibles)
           VALUES (?, ?, ?, ?, ?)`,
          [bus.nombre, bus.direccion, bus.telefono, bus.correo, bus.asientos]
        );
        await db.execute(
          "INSERT INTO visitas_transportes (id_visita, id_unidad) VALUES (?, ?)",
          [idVisita, unitResult.insertId]
        );
      }
    } else {
      await db.execute(
        `INSERT INTO visitas_virtuales
           (id_visita, fecha_propuesta, horario, link_recorrido)
         VALUES (?, ?, ?, ?)`,
        [idVisita, fecha || null, hora || null, link || null]
      );
    }

    await db.commit();
    res.status(201).json({ id_visita: idVisita, mensaje: "La visita se guardó en MySQL." });
  } catch (error) {
    if (db) await db.rollback();
    console.error("No se pudo guardar la visita:", error.code || error.message);
    res.status(500).json({ mensaje: "No se pudo guardar la visita en MySQL." });
  } finally {
    if (db) db.release();
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ mensaje: "El contenido enviado no es JSON válido." });
  }
  console.error("Error inesperado:", error.code || error.message);
  res.status(500).json({ mensaje: "Ocurrió un error inesperado." });
});

if (require.main === module) {
  app.listen(port, host, () => {
    console.log(`Visitas Académicas disponible en http://${host}:${port}`);
  });
}

module.exports = app;
